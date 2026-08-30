// Validates Twilio traffic, resolves callers, and persists short-lived phone sessions.
import twilio from 'twilio'

import { createAgentSession, deleteAgentSession, readAgentSession } from './session-store'

type ResolvedCaller = {
  ownerEmail: string
  recipientId: string
  recipientName: string
}

export type TwilioCallSession = ResolvedCaller & {
  callSid: string
  expiresAt: number
  sessionId: string
}

const PHONE_SESSION_MS = 12 * 60 * 1000

function configuredPublicUrl(requestUrl: string) {
  const request = new URL(requestUrl)
  const configured = process.env.CARELY_API_PUBLIC_URL
  if (!configured) return request

  const publicOrigin = new URL(configured)
  request.protocol = publicOrigin.protocol
  request.hostname = publicOrigin.hostname
  request.port = publicOrigin.port
  return request
}

export function twilioWebhookUrl(requestUrl: string) {
  return configuredPublicUrl(requestUrl).toString()
}

export function twilioMediaUrl(requestUrl: string) {
  const url = configuredPublicUrl(requestUrl)
  if (url.protocol !== 'https:') throw new Error('Carely telephony requires a public HTTPS API URL')
  url.protocol = 'wss:'
  url.pathname = '/telephony/twilio/media/'
  url.search = ''
  return url.toString()
}

export function validateTwilioWebhook(signature: string | undefined, requestUrl: string, form: FormData) {
  const authToken = process.env.TWILIO_AUTH_TOKEN
  if (!authToken || !signature) return false
  const params: Record<string, string> = {}
  for (const [key, value] of form.entries()) {
    if (typeof value === 'string') params[key] = value
  }
  return twilio.validateRequest(authToken, signature, twilioWebhookUrl(requestUrl), params)
}

export function validateTwilioWebSocket(signature: string | undefined, requestUrl: string) {
  const authToken = process.env.TWILIO_AUTH_TOKEN
  if (!authToken || !signature) return false
  const request = configuredPublicUrl(requestUrl)
  request.protocol = 'wss:'
  const candidates = new Set([request.toString()])
  const alternate = new URL(request)
  alternate.protocol = 'https:'
  candidates.add(alternate.toString())
  for (const url of [...candidates]) {
    candidates.add(url.endsWith('/') ? url : `${url}/`)
  }
  return [...candidates].some((url) => twilio.validateRequest(authToken, signature, url, {}))
}

export function buildConnectedCallTwiML(streamUrl: string, sessionId: string) {
  const response = new twilio.twiml.VoiceResponse()
  const stream = response.connect().stream({ url: streamUrl })
  stream.parameter({ name: 'sessionId', value: sessionId })
  return response.toString()
}

export function buildRejectedCallTwiML() {
  const response = new twilio.twiml.VoiceResponse()
  response.say('This phone number is not linked to a Carely family profile. Please ask your family to add it in Carely contacts.')
  response.hangup()
  return response.toString()
}

export function buildUnavailableCallTwiML() {
  const response = new twilio.twiml.VoiceResponse()
  response.say('Carely cannot answer right now. Please try again in a few minutes.')
  response.hangup()
  return response.toString()
}

export async function resolveTwilioCaller(phone: string, callSid: string): Promise<ResolvedCaller | null> {
  const secret = process.env.CARELY_AGENT_SECRET
  if (!secret) throw new Error('CARELY_AGENT_SECRET is required for telephone calls')
  const webOrigin = (process.env.CARELY_WEB_ORIGIN ?? 'http://localhost:3004').replace(/\/$/, '')
  const response = await fetch(`${webOrigin}/api/telephony/calls`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${secret}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ phone, callSid }),
  })
  if (response.status === 404) return null

  const body = await response.json().catch(() => null) as (ResolvedCaller & { error?: unknown }) | null
  if (!response.ok) {
    throw new Error(typeof body?.error === 'string' ? body.error : `Caller lookup returned ${response.status}`)
  }
  if (!body?.ownerEmail || !body.recipientId || !body.recipientName) {
    throw new Error('Caller lookup returned an invalid care profile')
  }
  return body
}

export function createTwilioCallSession(callSid: string, caller: ResolvedCaller) {
  const session = createAgentSession({
    kind: 'twilio',
    ownerEmail: caller.ownerEmail,
    expiresAt: Date.now() + PHONE_SESSION_MS,
    callSid,
    recipientId: caller.recipientId,
    recipientName: caller.recipientName,
  })
  return { ...caller, callSid, expiresAt: session.expiresAt, sessionId: session.id }
}

export function readTwilioCallSession(sessionId: string, callSid: string) {
  const session = readAgentSession(sessionId)
  if (
    !session ||
    session.kind !== 'twilio' ||
    session.callSid !== callSid ||
    !session.recipientId ||
    !session.recipientName
  ) return null
  return {
    ownerEmail: session.ownerEmail,
    recipientId: session.recipientId,
    recipientName: session.recipientName,
    callSid,
    expiresAt: session.expiresAt,
    sessionId,
  }
}

export function deleteTwilioCallSession(sessionId: string) {
  deleteAgentSession(sessionId)
}

export async function finishTwilioCall(ownerEmail: string, callSid: string) {
  const secret = process.env.CARELY_AGENT_SECRET
  if (!secret) throw new Error('CARELY_AGENT_SECRET is required for telephone calls')
  const webOrigin = (process.env.CARELY_WEB_ORIGIN ?? 'http://localhost:3004').replace(/\/$/, '')
  const response = await fetch(`${webOrigin}/api/telephony/calls`, {
    method: 'PATCH',
    headers: { authorization: `Bearer ${secret}`, 'content-type': 'application/json' },
    body: JSON.stringify({ ownerEmail, callSid }),
  })
  if (!response.ok) throw new Error(`Telephone call finalization returned ${response.status}`)
}
