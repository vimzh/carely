// Bridges browser PCM audio to the Google ADK live agent and streams audio back.
import { LiveRequestQueue } from '@google/adk'
import type { WSEvents, WSContext, WSMessageReceive } from 'hono/ws'

import { collectConversationEvidence, sanitizeCallerFacingText, streamCarelyVoice } from './agent'
import type { ConversationAction, TranscriptEntry } from './conversation-review'

type VoiceEvent =
  | { type: 'error'; message: string }
  | { type: 'interrupted' }
  | { type: 'ready' }
  | { type: 'sources'; sources: string[] }
  | { type: 'action'; action: ConversationAction }
  | { type: 'transcript'; entry: TranscriptEntry }
  | { type: 'turn_complete' }

type VoiceStreamHandlers = {
  onAudio: (audio: Uint8Array, mimeType: string) => void
  onAction: (action: ConversationAction) => void
  onInterrupted: () => void
  onSources: (sources: string[]) => void
  onTranscript: (entry: TranscriptEntry) => void
  onTurnComplete: () => void
}

const MAX_VOICE_TEST_MS = 5 * 60 * 1000

function sendEvent(ws: WSContext, event: VoiceEvent) {
  if (ws.readyState === 1) ws.send(JSON.stringify(event))
}

async function readAudio(data: WSMessageReceive) {
  if (data instanceof Blob) return new Uint8Array(await data.arrayBuffer())
  if (typeof data === 'string') return null
  return new Uint8Array(data)
}

export function mergeTranscription(current: string, next: string) {
  if (!current || next.startsWith(current)) return next
  if (!next || current.startsWith(next) || current.endsWith(next)) return current
  const separator = /[\p{L}\p{N}]$/u.test(current) && /^[\p{L}\p{N}]/u.test(next) ? ' ' : ''
  return `${current}${separator}${next}`
}

export async function pumpCarelyVoice(
  sessionId: string,
  ownerEmail: string,
  queue: LiveRequestQueue,
  signal: AbortSignal,
  handlers: VoiceStreamHandlers,
) {
  const sources = new Set<string>()
  const actions: ConversationAction[] = []
  let inputTranscript = ''
  let outputTranscript = ''
  for await (const event of streamCarelyVoice(sessionId, ownerEmail, queue, signal)) {
    if (event.errorCode) throw new Error(event.errorMessage || event.errorCode)
    if (event.interrupted) handlers.onInterrupted()
    const previousSourceCount = sources.size
    const previousActionCount = actions.length
    collectConversationEvidence(event, sources, actions)
    if (sources.size > previousSourceCount) handlers.onSources([...sources])
    for (const action of actions.slice(previousActionCount)) handlers.onAction(action)
    const inputText = event.inputTranscription?.text ?? ''
    const outputText = event.outputTranscription?.text ?? ''
    inputTranscript = mergeTranscription(inputTranscript, inputText)
    outputTranscript = mergeTranscription(outputTranscript, outputText)
    if (event.inputTranscription?.finished && inputTranscript.trim()) {
      handlers.onTranscript({ role: 'user', text: inputTranscript.trim() })
      inputTranscript = ''
    }
    if (event.outputTranscription?.finished && outputTranscript.trim()) {
      handlers.onTranscript({ role: 'assistant', text: sanitizeCallerFacingText(outputTranscript) })
      outputTranscript = ''
    }

    for (const part of event.content?.parts ?? []) {
      const audio = part.inlineData
      if (!audio?.data || !audio.mimeType?.startsWith('audio/')) continue
      const bytes = typeof audio.data === 'string'
        ? Uint8Array.from(Buffer.from(audio.data, 'base64'))
        : audio.data
      handlers.onAudio(bytes, audio.mimeType)
    }

    if (event.turnComplete) {
      if (inputTranscript.trim()) handlers.onTranscript({ role: 'user', text: inputTranscript.trim() })
      if (outputTranscript.trim()) handlers.onTranscript({ role: 'assistant', text: sanitizeCallerFacingText(outputTranscript) })
      inputTranscript = ''
      outputTranscript = ''
      handlers.onTurnComplete()
    }
  }
}

export function createVoiceSocketEvents(sessionId: string, ownerEmail: string, onDone: () => void): WSEvents {
  const queue = new LiveRequestQueue()
  const controller = new AbortController()
  let timeout: ReturnType<typeof setTimeout> | undefined

  return {
    onOpen(_event, ws) {
      sendEvent(ws, { type: 'ready' })
      timeout = setTimeout(() => {
        sendEvent(ws, { type: 'error', message: 'Voice tests stop after five minutes to control usage.' })
        controller.abort()
        queue.close()
        ws.close(1000, 'Voice test limit reached')
      }, MAX_VOICE_TEST_MS)

      void (async () => {
        try {
          await pumpCarelyVoice(sessionId, ownerEmail, queue, controller.signal, {
            onAudio: (audio) => ws.send(new Uint8Array(audio)),
            onAction: (action) => sendEvent(ws, { type: 'action', action }),
            onInterrupted: () => sendEvent(ws, { type: 'interrupted' }),
            onSources: (sources) => sendEvent(ws, { type: 'sources', sources }),
            onTranscript: (entry) => sendEvent(ws, { type: 'transcript', entry }),
            onTurnComplete: () => sendEvent(ws, { type: 'turn_complete' }),
          })
        } catch (error) {
          console.error('Carely voice session failed', error instanceof Error ? error.message : String(error))
          sendEvent(ws, { type: 'error', message: 'The voice call stopped. Please try again.' })
          ws.close(1011, 'Voice session failed')
        }
      })()
    },
    async onMessage(event) {
      const audio = await readAudio(event.data)
      if (!audio?.byteLength || controller.signal.aborted) return
      queue.sendRealtime({
        data: Buffer.from(audio).toString('base64'),
        mimeType: 'audio/pcm;rate=16000',
      })
    },
    onClose() {
      if (timeout) clearTimeout(timeout)
      controller.abort()
      queue.close()
      onDone()
    },
    onError() {
      if (timeout) clearTimeout(timeout)
      controller.abort()
      queue.close()
      onDone()
    },
  }
}
