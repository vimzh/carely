import { timingSafeEqual } from 'node:crypto'

import { Hono } from 'hono'
import { upgradeWebSocket, websocket } from 'hono/bun'

import { askCarely } from './agent'
import { normalizeConversationReviewInput, reviewConversation } from './conversation-review'
import { deleteFamilyContext, ingestCareRecipientContext, ingestFamilyContext, ingestGuideContext, listFamilyContext } from './context-store'
import { saveRecipientLocation } from './nearby-places'
import { createVoiceSocketEvents } from './voice'
import { createAgentSession, deleteAgentSession, readAgentSession } from './session-store'
import { probeGuideVideoDuration } from './video-duration'
import { createTwilioVoiceSocketEvents } from './twilio-voice'
import {
  buildConnectedCallTwiML,
  buildRejectedCallTwiML,
  buildUnavailableCallTwiML,
  createTwilioCallSession,
  resolveTwilioCaller,
  twilioMediaUrl,
  validateTwilioWebhook,
  validateTwilioWebSocket,
} from './twilio'

const MAX_CONTEXT_BYTES = 10 * 1024 * 1024
const MAX_GUIDE_ATTACHMENTS_BYTES = 40 * 1024 * 1024
const MAX_GUIDE_ATTACHMENT_BYTES = 25 * 1024 * 1024
const MAX_GUIDE_IMAGES_BYTES = 20 * 1024 * 1024
const MAX_GUIDE_VIDEO_BYTES = 20 * 1024 * 1024
const MAX_GUIDE_IMAGES = 5
const GUIDE_IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const GUIDE_VIDEO_MIME_TYPES = new Set(['video/mp4', 'video/quicktime', 'video/webm'])
const GUIDE_AUDIO_MIME_TYPES = new Set([
  'audio/aac',
  'audio/aiff',
  'audio/flac',
  'audio/mp3',
  'audio/mp4',
  'audio/mpeg',
  'audio/ogg',
  'audio/wav',
  'audio/webm',
])
const GUIDE_DOCUMENT_MIME_TYPES = new Set([
  'application/msword',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/markdown',
  'text/plain',
])
const CONTEXT_MIME_TYPES = new Set([
  ...GUIDE_DOCUMENT_MIME_TYPES,
  ...GUIDE_AUDIO_MIME_TYPES,
  ...GUIDE_IMAGE_MIME_TYPES,
  'video/3gpp',
  'video/avi',
  'video/mp4',
  'video/mpeg',
  'video/quicktime',
  'video/webm',
])
const CONTEXT_MIME_ALIASES = new Map([
  ['audio/x-aiff', 'audio/aiff'],
  ['audio/x-wav', 'audio/wav'],
  ['video/x-msvideo', 'video/avi'],
])

export function normalizeContextMimeType(mimeType: string) {
  const normalized = mimeType.split(';', 1)[0]!.trim().toLowerCase()
  return CONTEXT_MIME_ALIASES.get(normalized) ?? normalized
}

function logRequestError(message: string, error: unknown) {
  console.error(message, error instanceof Error ? error.message : String(error))
}

export function isGeminiQuotaError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  return /\b429\b|quota/i.test(message)
}

export function isGeminiAccessDeniedError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  return /\b403\b.*denied access|denied access.*\b403\b/i.test(message)
}

function isValidSessionId(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{1,80}$/.test(value)
}

function isInternalRequest(authorization: string | undefined) {
  const secret = process.env.CARELY_AGENT_SECRET
  if (!secret) return false
  const expected = Buffer.from(`Bearer ${secret}`)
  const received = Buffer.from(authorization ?? '')
  return expected.length === received.length && timingSafeEqual(expected, received)
}

function normalizeOwnerEmail(value: unknown) {
  return typeof value === 'string' && value.trim() && value.length <= 320
    ? value.trim().toLowerCase()
    : null
}

export const app = new Hono()

app.get('/', (c) => c.json({ name: 'carely-api' }))
app.get('/health', (c) => c.json({ status: 'ok' }))
app.post('/telephony/twilio/incoming', async (c) => {
  if (!process.env.TWILIO_AUTH_TOKEN) {
    return c.json({ error: 'Twilio calling is not configured' }, 503)
  }

  const form = await c.req.formData().catch(() => null)
  if (!form) return c.json({ error: 'Twilio sent an invalid request' }, 400)
  if (!validateTwilioWebhook(c.req.header('x-twilio-signature'), c.req.url, form)) {
    return c.json({ error: 'Invalid Twilio signature' }, 403)
  }

  const callerPhone = form.get('From')
  const callSid = form.get('CallSid')
  if (
    typeof callerPhone !== 'string' ||
    !/^\+[1-9]\d{6,14}$/.test(callerPhone) ||
    typeof callSid !== 'string' ||
    !/^CA[A-Za-z0-9]{32}$/.test(callSid)
  ) {
    return c.body(buildRejectedCallTwiML(), 200, { 'content-type': 'text/xml; charset=utf-8' })
  }

  try {
    const caller = await resolveTwilioCaller(callerPhone, callSid)
    if (!caller) {
      return c.body(buildRejectedCallTwiML(), 200, { 'content-type': 'text/xml; charset=utf-8' })
    }
    const session = createTwilioCallSession(callSid, caller)
    return c.body(
      buildConnectedCallTwiML(twilioMediaUrl(c.req.url), session.sessionId),
      200,
      { 'content-type': 'text/xml; charset=utf-8' },
    )
  } catch (error) {
    logRequestError('Could not start Carely telephone call', error)
    return c.body(buildUnavailableCallTwiML(), 200, { 'content-type': 'text/xml; charset=utf-8' })
  }
})
app.get('/telephony/twilio/media/', (c) => {
  if (!process.env.TWILIO_AUTH_TOKEN) {
    return c.json({ error: 'Twilio calling is not configured' }, 503)
  }
  if (!validateTwilioWebSocket(c.req.header('x-twilio-signature'), c.req.url)) {
    return c.json({ error: 'Invalid Twilio signature' }, 403)
  }
  return upgradeWebSocket(c, createTwilioVoiceSocketEvents())
})
app.post('/agent/session', async (c) => {
  if (!process.env.CARELY_AGENT_SECRET) {
    return c.json({ error: 'Agent actions are not configured' }, 503)
  }
  if (!isInternalRequest(c.req.header('authorization'))) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const body = await c.req.json().catch(() => null)
  const ownerEmail = body && typeof body === 'object' && 'ownerEmail' in body ? body.ownerEmail : null
  if (typeof ownerEmail !== 'string' || !ownerEmail.trim() || ownerEmail.length > 320) {
    return c.json({ error: 'ownerEmail must identify the signed-in family account' }, 400)
  }

  const session = createAgentSession({
    kind: 'browser_voice',
    ownerEmail: ownerEmail.trim().toLowerCase(),
    expiresAt: Date.now() + 10 * 60 * 1000,
    callSid: null,
    recipientId: null,
    recipientName: null,
  })
  return c.json({ sessionId: session.id }, 201)
})
app.get('/context', async (c) => {
  if (!process.env.CARELY_AGENT_SECRET) return c.json({ error: 'Agent actions are not configured' }, 503)
  if (!isInternalRequest(c.req.header('authorization'))) return c.json({ error: 'Unauthorized' }, 401)
  const ownerEmail = normalizeOwnerEmail(c.req.query('ownerEmail'))
  if (!ownerEmail) return c.json({ error: 'ownerEmail must identify the signed-in family account' }, 400)

  try {
    return c.json({ documents: await listFamilyContext(ownerEmail) })
  } catch (error) {
    logRequestError('Could not list family context', error)
    return c.json({ error: 'Could not list family context' }, 502)
  }
})
app.post('/context', async (c) => {
  if (!process.env.CARELY_AGENT_SECRET) return c.json({ error: 'Agent actions are not configured' }, 503)
  if (!isInternalRequest(c.req.header('authorization'))) return c.json({ error: 'Unauthorized' }, 401)
  const form = await c.req.formData().catch(() => null)
  const ownerEmail = normalizeOwnerEmail(form?.get('ownerEmail'))
  const title = form?.get('title')
  const text = form?.get('text')
  const file = form?.get('file')
  const cleanTitle = typeof title === 'string' ? title.trim() : ''
  const cleanText = typeof text === 'string' ? text.trim() : ''
  const uploadedFile = file instanceof File && file.size > 0 ? file : null
  const uploadedMimeType = uploadedFile ? normalizeContextMimeType(uploadedFile.type) : null

  if (!ownerEmail) {
    return c.json({ error: 'ownerEmail must identify the signed-in family account' }, 400)
  }
  if (!cleanTitle || cleanTitle.length > 120) {
    return c.json({ error: 'title must be between 1 and 120 characters' }, 400)
  }
  if ((!cleanText && !uploadedFile) || (cleanText && uploadedFile)) {
    return c.json({ error: 'provide either text or one file' }, 400)
  }
  if (uploadedFile && uploadedFile.size > MAX_CONTEXT_BYTES) {
    return c.json({ error: 'file must be 10 MB or smaller' }, 400)
  }
  if (uploadedMimeType && !CONTEXT_MIME_TYPES.has(uploadedMimeType)) {
    return c.json({ error: 'file must be a supported document, image, audio file, or video file' }, 400)
  }
  if (uploadedFile && uploadedMimeType?.startsWith('video/')) {
    try {
      await probeGuideVideoDuration(uploadedFile)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not read the video duration'
      const status = message === 'ffprobe is required to validate guide videos' ? 502 : 400
      return c.json({ error: message }, status)
    }
  }

  try {
    const sourceType = uploadedMimeType?.startsWith('audio/')
      ? 'audio'
      : uploadedMimeType?.startsWith('video/')
        ? 'video'
        : uploadedMimeType?.startsWith('image/')
          ? 'image'
        : uploadedFile
          ? 'file'
          : 'text'
    const document = await ingestFamilyContext(ownerEmail, {
      content: uploadedFile ?? new Blob([cleanText], { type: 'text/plain' }),
      displayName: cleanTitle,
      mimeType: uploadedMimeType || 'text/plain',
      sourceType,
    })
    return c.json({ document }, 201)
  } catch (error) {
    logRequestError('Could not save family context', error)
    return c.json({ error: 'Could not save family context' }, 502)
  }
})
app.post('/context/guide', async (c) => {
  if (!process.env.CARELY_AGENT_SECRET) return c.json({ error: 'Agent actions are not configured' }, 503)
  if (!isInternalRequest(c.req.header('authorization'))) return c.json({ error: 'Unauthorized' }, 401)
  const form = await c.req.formData().catch(() => null)
  const ownerEmail = normalizeOwnerEmail(form?.get('ownerEmail'))
  const contextKey = form?.get('contextKey')
  const title = form?.get('title')
  const note = form?.get('note')
  const text = form?.get('text')
  const cleanContextKey = typeof contextKey === 'string' ? contextKey.trim() : ''
  const cleanTitle = typeof title === 'string' ? title.trim() : ''
  const cleanNote = typeof note === 'string' ? note.trim() : ''
  const cleanText = typeof text === 'string' ? text.trim() : ''
  const images = (form?.getAll('images') ?? []).filter(
    (value): value is File => value instanceof File && value.size > 0,
  )
  const videos = (form?.getAll('videos') ?? []).filter(
    (value): value is File => value instanceof File && value.size > 0,
  )
  const audio = (form?.getAll('audio') ?? []).filter(
    (value): value is File => value instanceof File && value.size > 0,
  )
  const documents = (form?.getAll('documents') ?? []).filter(
    (value): value is File => value instanceof File && value.size > 0,
  )
  const attachments = [...images, ...videos, ...audio, ...documents]

  if (!ownerEmail) {
    return c.json({ error: 'ownerEmail must identify the signed-in family account' }, 400)
  }
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(cleanContextKey)) {
    return c.json({ error: 'contextKey must contain only letters, numbers, underscores, or hyphens' }, 400)
  }
  if (!cleanTitle || cleanTitle.length > 160 || cleanNote.length > 500 || cleanText.length > 20_000) {
    return c.json({ error: 'guide text is invalid or too long' }, 400)
  }
  if (attachments.some((attachment) => attachment.size > MAX_GUIDE_ATTACHMENT_BYTES)) {
    return c.json({ error: 'guide files must be 25 MB each or smaller' }, 400)
  }
  if (attachments.reduce((sum, attachment) => sum + attachment.size, 0) > MAX_GUIDE_ATTACHMENTS_BYTES) {
    return c.json({ error: 'guide files must total 40 MB or less' }, 400)
  }
  if (images.some((image) => image.size > MAX_CONTEXT_BYTES) || images.reduce((sum, image) => sum + image.size, 0) > MAX_GUIDE_IMAGES_BYTES) {
    return c.json({ error: 'guide images must be 10 MB each and 20 MB total or smaller' }, 400)
  }
  if (images.length > MAX_GUIDE_IMAGES) {
    return c.json({ error: 'add no more than five guide images' }, 400)
  }
  if (images.some((image) => !GUIDE_IMAGE_MIME_TYPES.has(image.type))) {
    return c.json({ error: 'guide images must be JPEG, PNG, or WebP files' }, 400)
  }
  if (videos.length > 1) {
    return c.json({ error: 'add only one guide video' }, 400)
  }
  if (videos.some((video) => video.size > MAX_GUIDE_VIDEO_BYTES)) {
    return c.json({ error: 'guide video must be 20 MB or smaller' }, 400)
  }
  if (videos.some((video) => !GUIDE_VIDEO_MIME_TYPES.has(video.type))) {
    return c.json({ error: 'guide video must be an MP4, MOV, or WebM file' }, 400)
  }
  if (audio.some((item) => !GUIDE_AUDIO_MIME_TYPES.has(normalizeContextMimeType(item.type)))) {
    return c.json({ error: 'guide audio must be a supported audio file' }, 400)
  }
  if (documents.some((document) => !GUIDE_DOCUMENT_MIME_TYPES.has(normalizeContextMimeType(document.type)))) {
    return c.json({ error: 'guide documents must be PDF, DOC, DOCX, TXT, or Markdown files' }, 400)
  }

  try {
    await Promise.all(videos.map(probeGuideVideoDuration))
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not read the guide video duration'
    const status = message.includes('is required') ? 502 : 400
    return c.json({ error: message }, status)
  }

  try {
    const document = await ingestGuideContext(ownerEmail, {
      contextKey: cleanContextKey,
      title: cleanTitle,
      note: cleanNote,
      instructions: cleanText,
      audio: audio.map((item) => ({
        content: item,
        mimeType: normalizeContextMimeType(item.type),
        name: item.name,
      })),
      documents: documents.map((document) => ({
        content: document,
        mimeType: normalizeContextMimeType(document.type),
        name: document.name,
      })),
      images: images.map((image) => ({ content: image, mimeType: image.type, name: image.name })),
      videos: videos.map((video) => ({ content: video, mimeType: video.type, name: video.name })),
    })
    return c.json({ document }, 201)
  } catch (error) {
    logRequestError('Could not save multimodal guide context', error)
    return c.json({ error: 'Could not save multimodal guide context' }, 502)
  }
})
app.delete('/context/guide/:contextKey', async (c) => {
  if (!process.env.CARELY_AGENT_SECRET) return c.json({ error: 'Agent actions are not configured' }, 503)
  if (!isInternalRequest(c.req.header('authorization'))) return c.json({ error: 'Unauthorized' }, 401)
  const contextKey = c.req.param('contextKey')
  const ownerEmail = normalizeOwnerEmail(c.req.query('ownerEmail'))
  if (!ownerEmail) return c.json({ error: 'ownerEmail must identify the signed-in family account' }, 400)
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(contextKey)) {
    return c.json({ error: 'contextKey must contain only letters, numbers, underscores, or hyphens' }, 400)
  }

  try {
    await deleteFamilyContext(ownerEmail, contextKey)
    return c.body(null, 204)
  } catch (error) {
    logRequestError('Could not delete guide context', error)
    return c.json({ error: 'Could not delete guide context' }, 502)
  }
})
app.post('/context/recipient', async (c) => {
  if (!process.env.CARELY_AGENT_SECRET) return c.json({ error: 'Agent actions are not configured' }, 503)
  if (!isInternalRequest(c.req.header('authorization'))) return c.json({ error: 'Unauthorized' }, 401)

  const body = await c.req.json().catch(() => null)
  const values = body && typeof body === 'object' ? body as Record<string, unknown> : {}
  const ownerEmail = normalizeOwnerEmail(values.ownerEmail)
  const recipientId = typeof values.recipientId === 'string' ? values.recipientId.trim() : ''
  const name = typeof values.name === 'string' ? values.name.trim() : ''
  const relationship = typeof values.relationship === 'string' ? values.relationship.trim() : ''
  const address = typeof values.address === 'string' ? values.address.trim() : ''
  const latitude = typeof values.latitude === 'number' ? values.latitude : null
  const longitude = typeof values.longitude === 'number' ? values.longitude : null
  const likes = typeof values.likes === 'string' ? values.likes.trim() : ''
  const dislikes = typeof values.dislikes === 'string' ? values.dislikes.trim() : ''
  const instructions = typeof values.instructions === 'string' ? values.instructions.trim() : ''

  if (!ownerEmail) return c.json({ error: 'ownerEmail must identify the signed-in family account' }, 400)
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(recipientId)) {
    return c.json({ error: 'recipientId must contain only letters, numbers, underscores, or hyphens' }, 400)
  }
  if (!name || name.length > 80 || relationship.length > 80) {
    return c.json({ error: 'care recipient name or relationship is invalid' }, 400)
  }
  const hasLocation = Boolean(address) || latitude !== null || longitude !== null
  if (address.length > 300 || (hasLocation && (
    !address || latitude === null || longitude === null ||
    !Number.isFinite(latitude) || !Number.isFinite(longitude) ||
    latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180
  ))) {
    return c.json({ error: 'care recipient home location is invalid' }, 400)
  }
  if ([likes, dislikes, instructions].some((value) => value.length > 4000)) {
    return c.json({ error: 'care recipient notes must be 4,000 characters or fewer' }, 400)
  }

  try {
    const document = await ingestCareRecipientContext(ownerEmail, {
      recipientId,
      name,
      relationship,
      address,
      latitude,
      longitude,
      likes,
      dislikes,
      instructions,
    })
    saveRecipientLocation(ownerEmail, {
      recipientId,
      recipientName: name,
      address,
      latitude,
      longitude,
    })
    return c.json({ document }, 201)
  } catch (error) {
    logRequestError('Could not save care recipient context', error)
    return c.json({ error: 'Could not save care recipient context' }, 502)
  }
})
app.post('/agent/message', async (c) => {
  if (!process.env.CARELY_AGENT_SECRET) return c.json({ error: 'Agent actions are not configured' }, 503)
  if (!isInternalRequest(c.req.header('authorization'))) return c.json({ error: 'Unauthorized' }, 401)

  const body = await c.req.json().catch(() => null)
  const message = body && typeof body === 'object' && 'message' in body ? body.message : null
  const sessionId = body && typeof body === 'object' && 'sessionId' in body ? body.sessionId : null
  const ownerEmail = body && typeof body === 'object' && 'ownerEmail' in body ? body.ownerEmail : null
  const transcript = body && typeof body === 'object' && 'transcript' in body ? body.transcript : null
  const guides = body && typeof body === 'object' && 'guides' in body ? body.guides : null

  if (typeof message !== 'string' || !message.trim() || message.length > 4000) {
    return c.json({ error: 'message must be a non-empty string of at most 4000 characters' }, 400)
  }
  if (sessionId !== null && !isValidSessionId(sessionId)) {
    return c.json({ error: 'sessionId must contain only letters, numbers, underscores, or hyphens' }, 400)
  }
  if (ownerEmail !== null && (typeof ownerEmail !== 'string' || !ownerEmail.trim() || ownerEmail.length > 320)) {
    return c.json({ error: 'ownerEmail must identify the signed-in family account' }, 400)
  }
  if (ownerEmail === null) return c.json({ error: 'ownerEmail must identify the signed-in family account' }, 400)
  if (guides !== null && ownerEmail === null) {
    return c.json({ error: 'saved guides require an authenticated family account' }, 400)
  }
  const providedGuides = guides === null ? [] : Array.isArray(guides) && guides.length <= 8
    ? guides.flatMap((guide) => {
        if (!guide || typeof guide !== 'object') return []
        const { title, record } = guide as Record<string, unknown>
        return typeof title === 'string' && title.trim() && title.length <= 160
          && typeof record === 'string' && record.trim() && record.length <= 4_000
          ? [{ title: title.trim(), record: record.trim() }]
          : []
      })
    : []
  if (guides !== null && (
    providedGuides.length !== (Array.isArray(guides) ? guides.length : -1)
    || providedGuides.reduce((total, guide) => total + guide.record.length, 0) > 16_000
  )) {
    return c.json({ error: 'guides must contain at most eight bounded saved guide records' }, 400)
  }
  const normalizedTranscript = transcript === null
    ? null
    : normalizeConversationReviewInput({ transcript, sources: [], actions: [] })
  if (transcript !== null && (
    !normalizedTranscript
    || normalizedTranscript.transcript.length >= 100
    || normalizedTranscript.transcript.at(-1)?.role !== 'user'
    || normalizedTranscript.transcript.at(-1)?.text !== message.trim()
  )) {
    return c.json({ error: 'transcript must end with the current user message and contain fewer than 100 entries' }, 400)
  }

  try {
    const result = await askCarely(
      message.trim(),
      sessionId ?? undefined,
      ownerEmail?.trim().toLowerCase(),
      providedGuides,
      normalizedTranscript?.transcript.slice(0, -1) ?? [],
    )
    try {
      const review = await reviewConversation({
        transcript: [
          ...(normalizedTranscript?.transcript ?? [{ role: 'user' as const, text: message.trim() }]),
          { role: 'assistant', text: result.response },
        ],
        sources: result.sources,
        actions: result.actions,
      })
      return c.json({ ...result, review, reviewStatus: 'complete' as const })
    } catch (error) {
      logRequestError('Could not review Carely conversation', error)
      return c.json({ ...result, review: null, reviewStatus: 'failed' as const })
    }
  } catch (error) {
    logRequestError('Carely agent request failed', error)
    if (isGeminiQuotaError(error)) {
      return c.json({ error: 'Gemini quota is exhausted. Add billing or use an API key with available quota.' }, 429)
    }
    if (isGeminiAccessDeniedError(error)) {
      return c.json({ error: 'Google denied this API key\'s project access to Gemini. Use a key from an enabled project.' }, 403)
    }
    return c.json({ error: 'Carely agent request failed' }, 502)
  }
})
app.post('/agent/review', async (c) => {
  if (!process.env.CARELY_AGENT_SECRET) return c.json({ error: 'Agent actions are not configured' }, 503)
  if (!isInternalRequest(c.req.header('authorization'))) return c.json({ error: 'Unauthorized' }, 401)
  const input = normalizeConversationReviewInput(await c.req.json().catch(() => null))
  if (!input) return c.json({ error: 'conversation transcript is invalid' }, 400)

  try {
    return c.json({ review: await reviewConversation(input), reviewStatus: 'complete' as const })
  } catch (error) {
    logRequestError('Could not review Carely conversation', error)
    return c.json({ review: null, reviewStatus: 'failed' as const })
  }
})
app.get('/agent/voice', async (c) => {
  const sessionId = c.req.query('sessionId')
  const origin = c.req.header('origin')
  const allowedOrigin = process.env.CARELY_WEB_ORIGIN ?? 'http://localhost:3004'

  if (!isValidSessionId(sessionId)) {
    return c.json({ error: 'sessionId must contain only letters, numbers, underscores, or hyphens' }, 400)
  }
  const session = readAgentSession(sessionId)
  if (!session || session.kind !== 'browser_voice') {
    return c.json({ error: 'voice session is invalid or expired' }, 401)
  }
  if (origin && origin !== allowedOrigin) {
    return c.json({ error: 'origin is not allowed' }, 403)
  }

  return upgradeWebSocket(c, createVoiceSocketEvents(
    sessionId,
    session.ownerEmail,
    () => deleteAgentSession(sessionId),
  ))
})

export default {
  port: Number(process.env.PORT ?? 3001),
  idleTimeout: 120,
  fetch: app.fetch,
  websocket,
}
