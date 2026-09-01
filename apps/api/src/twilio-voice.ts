// Bridges Twilio bidirectional Media Streams to the existing Google ADK voice agent.
import { LiveRequestQueue } from '@google/adk'
import type { WSEvents, WSContext, WSMessageReceive } from 'hono/ws'

import { reviewConversation, type ConversationAction, type TranscriptEntry } from './conversation-review'
import { pcmSampleRate, pcmToTwilioMuLaw8k, twilioMuLawToPcm16k } from './telephony-audio'
import { deleteTwilioCallSession, finishTwilioCall, readTwilioCallSession } from './twilio'
import { pumpCarelyVoice } from './voice'

type TwilioMessage = {
  event?: unknown
  media?: { payload?: unknown }
  start?: {
    callSid?: unknown
    customParameters?: { sessionId?: unknown }
    mediaFormat?: { channels?: unknown; encoding?: unknown; sampleRate?: unknown }
    streamSid?: unknown
  }
}

const MAX_PHONE_CALL_MS = 10 * 60 * 1000

async function savePhoneConversation(
  ownerEmail: string,
  callSid: string,
  transcript: TranscriptEntry[],
  sources: string[],
  actions: ConversationAction[],
) {
  const secret = process.env.CARELY_AGENT_SECRET
  if (!secret) throw new Error('CARELY_AGENT_SECRET is required to save telephone transcripts')
  let review = null
  let reviewStatus: 'complete' | 'failed' = 'failed'
  try {
    review = await reviewConversation({ transcript, sources, actions })
    reviewStatus = 'complete'
  } catch (error) {
    console.error('Could not review Carely telephone transcript', error instanceof Error ? error.message : String(error))
  }

  const webOrigin = (process.env.CARELY_WEB_ORIGIN ?? 'http://localhost:3004').replace(/\/$/, '')
  const response = await fetch(`${webOrigin}/api/conversations/agent`, {
    method: 'POST',
    headers: { authorization: `Bearer ${secret}`, 'content-type': 'application/json' },
    body: JSON.stringify({ ownerEmail, callId: callSid, channel: 'phone', transcript, sources, actions, review, reviewStatus }),
  })
  if (!response.ok) throw new Error(`Telephone transcript save returned ${response.status}`)
}

function sendJson(ws: WSContext, payload: unknown) {
  if (ws.readyState === 1) ws.send(JSON.stringify(payload))
}

function parseMessage(data: WSMessageReceive): TwilioMessage | null {
  if (typeof data !== 'string') return null
  try {
    const value = JSON.parse(data)
    return value && typeof value === 'object' ? value as TwilioMessage : null
  } catch {
    return null
  }
}

export function createTwilioVoiceSocketEvents(): WSEvents {
  const queue = new LiveRequestQueue()
  const controller = new AbortController()
  let activeSessionId = ''
  let activeCallSid = ''
  let streamSid = ''
  let timeout: ReturnType<typeof setTimeout> | undefined
  let started = false
  let markNumber = 0
  let ownerEmail = ''
  let finalized = false
  const transcript: TranscriptEntry[] = []
  let sources: string[] = []
  const actions: ConversationAction[] = []

  async function cleanup() {
    if (finalized) return
    finalized = true
    if (timeout) clearTimeout(timeout)
    controller.abort()
    queue.close()
    if (activeSessionId) deleteTwilioCallSession(activeSessionId)
    const tasks: Promise<unknown>[] = []
    if (ownerEmail && activeCallSid) tasks.push(finishTwilioCall(ownerEmail, activeCallSid))
    if (ownerEmail && activeCallSid && transcript.length) {
      tasks.push(savePhoneConversation(ownerEmail, activeCallSid, transcript, sources, actions))
    }
    const results = await Promise.allSettled(tasks)
    for (const result of results) {
      if (result.status === 'rejected') {
        console.error('Could not finalize Carely telephone call', result.reason instanceof Error ? result.reason.message : String(result.reason))
      }
    }
  }

  return {
    onOpen(_event, ws) {
      timeout = setTimeout(() => ws.close(1000, 'Carely call limit reached'), MAX_PHONE_CALL_MS)
    },
    async onMessage(event, ws) {
      const message = parseMessage(event.data)
      if (!message || typeof message.event !== 'string') return

      if (message.event === 'start') {
        if (started) return
        const start = message.start
        const sessionId = start?.customParameters?.sessionId
        const callSid = start?.callSid
        const candidateStreamSid = start?.streamSid
        const format = start?.mediaFormat
        if (
          typeof sessionId !== 'string' ||
          typeof callSid !== 'string' ||
          typeof candidateStreamSid !== 'string' ||
          format?.encoding !== 'audio/x-mulaw' ||
          Number(format.sampleRate) !== 8_000 ||
          Number(format.channels) !== 1
        ) {
          ws.close(1008, 'Invalid Twilio media session')
          return
        }

        const session = readTwilioCallSession(sessionId, callSid)
        if (!session) {
          ws.close(1008, 'Unknown Carely call session')
          return
        }

        started = true
        activeSessionId = sessionId
        activeCallSid = callSid
        ownerEmail = session.ownerEmail
        streamSid = candidateStreamSid
        queue.sendContent({
          role: 'user',
          parts: [{
            text: `Verified telephone caller metadata: ${JSON.stringify({ recipientName: session.recipientName })}. This is the opening turn only. Greet once in very short Hindi, say you are Carely using feminine Hindi grammar, then ask how you can help. Do not repeat this greeting on later turns.`,
          }],
        })

        void pumpCarelyVoice(sessionId, session.ownerEmail, queue, controller.signal, {
          onAudio: (audio, mimeType) => sendJson(ws, {
            event: 'media',
            streamSid,
            media: { payload: pcmToTwilioMuLaw8k(audio, pcmSampleRate(mimeType)) },
          }),
          onAction: (action) => actions.push(action),
          onInterrupted: () => sendJson(ws, { event: 'clear', streamSid }),
          onSources: (nextSources) => { sources = nextSources },
          onTranscript: (entry) => transcript.push(entry),
          onTurnComplete: () => {
            markNumber += 1
            sendJson(ws, { event: 'mark', streamSid, mark: { name: `turn-${markNumber}` } })
          },
        }).catch((error) => {
          if (controller.signal.aborted) return
          console.error('Carely telephone session failed', error instanceof Error ? error.message : String(error))
          ws.close(1011, 'Carely voice agent failed')
        })
        return
      }

      if (message.event === 'media' && started && typeof message.media?.payload === 'string') {
        const pcm = twilioMuLawToPcm16k(message.media.payload)
        if (pcm.byteLength) queue.sendRealtime({ data: pcm.toString('base64'), mimeType: 'audio/pcm;rate=16000' })
        return
      }

      if (message.event === 'stop') ws.close(1000, 'Call ended')
    },
    async onClose() {
      await cleanup()
    },
    async onError() {
      await cleanup()
    },
  }
}
