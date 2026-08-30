// Verifies that the agent endpoint rejects malformed requests before calling Gemini.
import { createHmac } from 'node:crypto'

import { expect, test } from 'bun:test'

process.env.GEMINI_API_KEY ??= 'test-key'
process.env.CARELY_AGENT_SECRET ??= 'test-agent-secret'
process.env.CARELY_API_DATABASE_PATH ??= ':memory:'
process.env.TWILIO_AUTH_TOKEN ??= 'test-twilio-token'

const { app, isGeminiAccessDeniedError, isGeminiQuotaError, normalizeContextMimeType } = await import('./index')
const { collectConversationEvidence, sanitizeCallerFacingText, selectRelevantGuides, shouldSearchFamilyContext } = await import('./agent')
const { familyStoreDisplayName } = await import('./context-store')
const { resolveRecipientLocation, saveRecipientLocation, searchNearbyPlaces } = await import('./nearby-places')
const { readAgentSession } = await import('./session-store')
const { parseConversationReview } = await import('./conversation-review')
const { mergeTranscription } = await import('./voice')
const { CARELY_TEXT_INSTRUCTION, CARELY_VOICE_INSTRUCTION, createFamilyContextSearchPrompt, createGuideVideoContextPrompt, createImageContextPrompt } = await import('./prompts/carely')
const { buildConnectedCallTwiML, twilioMediaUrl, validateTwilioWebhook } = await import('./twilio')

const contextHeaders = { authorization: 'Bearer test-agent-secret' }

function familyContextForm() {
  const form = new FormData()
  form.set('ownerEmail', 'family@example.com')
  return form
}

test('keeps elder-friendly behavior in both agent prompts', () => {
  for (const prompt of [CARELY_TEXT_INSTRUCTION, CARELY_VOICE_INSTRUCTION]) {
    expect(prompt).toContain('Never sound annoyed')
    expect(prompt).toContain('Ask only one question at a time')
    expect(prompt).toContain('Never call family memory for greetings')
    expect(prompt).toContain('Do this in every language')
    expect(prompt).toContain('<saved_family_guides>')
    expect(prompt).toContain('trust the newest observation')
    expect(prompt).toContain('last confirmed state')
    expect(prompt).toContain('Treat a brief "yes" or "no" only')
    expect(prompt).toContain('only the facts it explicitly states')
    expect(prompt).toContain('do not guess which direction')
    expect(prompt).toContain('Do not introduce another remote')
    expect(prompt).toContain('"No signal" message alone does not prove')
    expect(prompt).toContain('Never say that an answer came from a guide')
    expect(prompt).toContain('Never output Markdown')
    expect(prompt).toContain('Do not fill missing details from common layouts')
    expect(prompt).toContain('verify that exact detail in the available evidence')
    expect(prompt).toContain('Never turn uncertainty into a guess')
    expect(prompt).toContain('screen did not change')
    expect(prompt).toContain('do not tell the caller to press it again')
    expect(prompt).toContain('not by itself a safety confirmation')
    expect(prompt).toContain('placing it inside and closing the door must happen in separate replies')
    expect(prompt).toContain('only one next physical action')
    expect(prompt).toContain('loading clothes, closing a door')
    expect(prompt).toContain('each repeated press as a separate action')
    expect(prompt).toContain('displayed program number or name is still unknown')
    expect(prompt).toContain('never invent an OK, Enter')
    expect(prompt).toContain('stove-knob-to-burner mapping is unknown')
    expect(prompt).toContain('are not stove-knob mapping confirmation')
    expect(prompt).toContain('previous direction is unknown')
    expect(prompt).toContain('the door is closed')
    expect(prompt).toContain('Preserve every digit and order')
    expect(prompt).toContain('Use Google Search only when')
    expect(prompt).toContain('search_nearby_places only when')
    expect(prompt).toContain('Default to simple Hindi')
    expect(prompt).toContain('Carely is feminine')
    expect(prompt).toContain('मैं मदद करूँगी')
    expect(prompt).toContain("use the caller's landmark")
    expect(prompt).toContain('video walkthrough')
  }
})

test('removes speech-hostile formatting from caller-facing transcripts', () => {
  expect(sanitizeCallerFacingText('**लाल बटन**\n- उसे एक बार दबाइए।')).toBe('लाल बटन\nउसे एक बार दबाइए।')
})

test('routes Hindi appliance questions to the matching labeled guide', () => {
  const guides = [
    { title: 'Living-room TV remote', record: 'Input and volume controls.' },
    { title: 'Front-loading washing machine', record: 'Quick 30 and Cotton.' },
    { title: 'Kitchen microwave', record: 'Stop and Start controls.' },
  ]
  expect(selectRelevantGuides('वॉशिंग मशीन कैसे चालू करूँ?', guides)).toEqual([guides[1]])
  expect(selectRelevantGuides('माइक्रोवेव पर 20:00 लिखा है', guides)).toEqual([guides[2]])
  expect(selectRelevantGuides('मुझे मदद चाहिए', guides)).toEqual(guides)
})

test('requires explicit confirmation before the voice agent saves a reminder', () => {
  expect(CARELY_VOICE_INSTRUCTION).toContain('verified telephone caller metadata')
  expect(CARELY_VOICE_INSTRUCTION).toContain('only after the caller clearly says yes')
  expect(CARELY_VOICE_INSTRUCTION).toContain('create_personal_reminder')
  expect(CARELY_VOICE_INSTRUCTION).toContain('reminder repeats daily')
})

test('derives a valid family brief score instead of trusting a model total', () => {
  const review = parseConversationReview({
    summary: 'Grandfather asked how to return to the TV channel.',
    struggle: 'He could not identify the Input button.',
    contextSuggestion: 'Add a labeled photo of the remote.',
    metrics: Object.fromEntries(
      ['resolution', 'accuracy', 'clarity', 'tone', 'safety'].map((key) => [key, { score: 16, reason: 'Clear and safe.' }]),
    ),
  })
  expect(review.score.total).toBe(80)
  expect(review.score.qualification).toBe('qualified')
})

test('collects family grounding and confirmed reminder actions from ADK events', () => {
  const sources = new Set<string>()
  const actions: Array<{ type: 'reminder'; summary: string; status: 'completed' }> = []
  collectConversationEvidence({
    content: {
      parts: [
        { functionResponse: { name: 'search_family_context', response: { sources: ['TV guide'] } } },
        { functionResponse: { name: 'create_personal_reminder', response: { saved: true, title: 'Medicine', time: '9:00 AM' } } },
      ],
    },
  } as never, sources, actions)
  expect([...sources]).toEqual(['TV guide'])
  expect(actions[0]?.summary).toBe('Saved Medicine for 9:00 AM')
})

test('merges cumulative and incremental live transcription updates', () => {
  expect(mergeTranscription('Please press', 'Please press the red button')).toBe('Please press the red button')
  expect(mergeTranscription('Please press ', 'the red button')).toBe('Please press the red button')
})

test('protects voice-session registration with the shared agent secret', async () => {
  const unauthorized = await app.request('/agent/session', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ownerEmail: 'family@example.com' }),
  })
  expect(unauthorized.status).toBe(401)

  const authorized = await app.request('/agent/session', {
    method: 'POST',
    headers: {
      authorization: 'Bearer test-agent-secret',
      'content-type': 'application/json',
    },
    body: JSON.stringify({ ownerEmail: 'family@example.com' }),
  })
  expect(authorized.status).toBe(201)
  const sessionId = (await authorized.json() as { sessionId?: unknown }).sessionId
  expect(typeof sessionId).toBe('string')
  expect(readAgentSession(String(sessionId))).toMatchObject({
    kind: 'browser_voice',
    ownerEmail: 'family@example.com',
  })
})

test('validates Twilio webhooks and creates a bidirectional stream response', () => {
  const url = 'https://carely.example/telephony/twilio/incoming'
  const form = new FormData()
  form.set('CallSid', `CA${'1'.repeat(32)}`)
  form.set('From', '+919876543210')
  const signed = `${url}CallSidCA${'1'.repeat(32)}From+919876543210`
  const signature = createHmac('sha1', 'test-twilio-token').update(signed).digest('base64')

  expect(validateTwilioWebhook(signature, url, form)).toBe(true)
  expect(validateTwilioWebhook('invalid', url, form)).toBe(false)
  const twiml = buildConnectedCallTwiML('wss://carely.example/telephony/twilio/media/', 'session-1')
  expect(twiml).toContain('<Connect><Stream url="wss://carely.example/telephony/twilio/media/">')
  expect(twiml).toContain('<Parameter name="sessionId" value="session-1"/>')
})

test('uses the configured public origin without leaking a local port', () => {
  const previous = process.env.CARELY_API_PUBLIC_URL
  process.env.CARELY_API_PUBLIC_URL = 'https://carely.example'
  expect(twilioMediaUrl('http://localhost:3191/telephony/twilio/incoming')).toBe(
    'wss://carely.example/telephony/twilio/media/',
  )
  if (previous === undefined) delete process.env.CARELY_API_PUBLIC_URL
  else process.env.CARELY_API_PUBLIC_URL = previous
})

test('rejects unsigned inbound phone calls before caller lookup', async () => {
  const form = new FormData()
  form.set('CallSid', `CA${'1'.repeat(32)}`)
  form.set('From', '+919876543210')
  const response = await app.request('/telephony/twilio/incoming', { method: 'POST', body: form })
  expect(response.status).toBe(403)
})

test('keeps retrieved family context concise', () => {
  const prompt = createFamilyContextSearchPrompt('I can see a red button on the remote.')
  expect(prompt).toContain('no more than 140 words')
  expect(prompt).toContain("caller's exact visible words")
})

test('routes only family-specific questions to memory', () => {
  for (const question of [
    'What time is it?',
    'What is photosynthesis?',
    '2 + 2',
    'How is the weather today?',
    'Hello',
    'I can see the garden.',
  ]) {
    expect(shouldSearchFamilyContext(question)).toBe(false)
  }

  for (const question of [
    'What time do I take my medicine?',
    'How do I use the TV remote?',
    'What did my daughter save in the family guide?',
    'Which button should I press?',
    'I can see a red button. What should I do next?',
    'There is a green light above the knob.',
    'Does Dadaji dislike spicy food?',
    'टीवी के रिमोट पर नीला बटन कौन सा है?',
    'माइक्रोवेव में दाल कैसे गरम करूँ?',
    'पीला ताला दिख रहा है, दरवाज़ा खोलूँ?',
  ]) {
    expect(shouldSearchFamilyContext(question)).toBe(true)
  }
})

test('isolates Gemini File Search stores without exposing owner emails', () => {
  const first = familyStoreDisplayName('Family@Example.com')
  expect(first).toBe(familyStoreDisplayName(' family@example.com '))
  expect(first).not.toBe(familyStoreDisplayName('other@example.com'))
  expect(first).not.toContain('family@example.com')
})

test('keeps saved home locations family-scoped and resolves the named recipient', () => {
  saveRecipientLocation('maps-family@example.com', {
    recipientId: 'dadaji',
    recipientName: 'Dadaji',
    address: 'Rohtak, Haryana',
    latitude: 28.8955,
    longitude: 76.6066,
  })
  saveRecipientLocation('maps-family@example.com', {
    recipientId: 'dadiji',
    recipientName: 'Dadiji',
    address: 'Hisar, Haryana',
    latitude: 29.1492,
    longitude: 75.7217,
  })

  expect(resolveRecipientLocation('other-family@example.com').location).toBeNull()
  expect(resolveRecipientLocation('maps-family@example.com').reason).toContain('More than one')
  expect(resolveRecipientLocation('maps-family@example.com', 'dadaji').location).toMatchObject({
    recipientId: 'dadaji',
    address: 'Rohtak, Haryana',
  })
})

test('limits nearby Google Places searches to three results around the saved home', async () => {
  const originalKey = process.env.GOOGLE_MAPS_API_KEY
  let requestBody: Record<string, unknown> | null = null
  let fieldMask = ''
  process.env.GOOGLE_MAPS_API_KEY = 'test-maps-key'
  const fetchPlaces = (async (_input, init) => {
    requestBody = JSON.parse(String(init?.body))
    fieldMask = new Headers(init?.headers).get('X-Goog-FieldMask') ?? ''
    return Response.json({
      places: [{
        displayName: { text: 'Nearby Pharmacy' },
        formattedAddress: 'Main Road, Rohtak',
        googleMapsUri: 'https://maps.google.com/example',
        location: { latitude: 28.9, longitude: 76.61 },
      }],
    })
  }) as typeof fetch

  try {
    const result = await searchNearbyPlaces('maps-family@example.com', 'pharmacy', 'Dadaji', fetchPlaces)
    expect(requestBody).toMatchObject({
      textQuery: 'pharmacy',
      pageSize: 3,
      locationBias: { circle: { center: { latitude: 28.8955, longitude: 76.6066 }, radius: 5000 } },
    })
    expect(fieldMask).toContain('places.displayName')
    expect(result.places[0]?.name).toBe('Nearby Pharmacy')
  } finally {
    if (originalKey === undefined) delete process.env.GOOGLE_MAPS_API_KEY
    else process.env.GOOGLE_MAPS_API_KEY = originalKey
  }
})

test('rejects partial care-recipient locations before calling Gemini', async () => {
  const response = await app.request('/context/recipient', {
    method: 'POST',
    headers: { ...contextHeaders, 'content-type': 'application/json' },
    body: JSON.stringify({
      ownerEmail: 'family@example.com',
      recipientId: 'dadaji',
      name: 'Dadaji',
      relationship: 'Grandfather',
      address: 'Rohtak, Haryana',
      latitude: 28.8955,
    }),
  })
  expect(response.status).toBe(400)
  expect(await response.json()).toEqual({ error: 'care recipient home location is invalid' })
})

test('turns a recorded demonstration into ordered tool steps', () => {
  const prompt = createGuideVideoContextPrompt('Press power, then press mode.')
  expect(prompt).toContain('ordered list of actions')
  expect(prompt).toContain('useful timestamps')
  expect(prompt).toContain('connect the spoken instruction to the visible control')
  expect(prompt).toContain('Press power, then press mode.')
})

test('coordinates image controls with the family-written guide', () => {
  const prompt = createImageContextPrompt('Press the mode button below the red power button.')
  expect(prompt).toContain('label, color, shape, and position')
  expect(prompt).toContain('relative to nearby landmarks')
  expect(prompt).toContain('Press the mode button below the red power button.')
})

test('rejects an empty agent message', async () => {
  const response = await app.request('/agent/message', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{}',
  })

  expect(response.status).toBe(400)
  expect(await response.json()).toEqual({
    error: 'message must be a non-empty string of at most 4000 characters',
  })
})

test('rejects caller-supplied guides without a family account', async () => {
  const response = await app.request('/agent/message', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      message: 'Help with my TV',
      guides: [{ title: 'TV', record: 'Press Input.' }],
    }),
  })
  expect(response.status).toBe(400)
  expect(await response.json()).toEqual({ error: 'saved guides require an authenticated family account' })
})

test('recognizes Gemini quota errors without exposing other provider failures', () => {
  expect(isGeminiQuotaError(new Error('429 You exceeded your current quota'))).toBe(true)
  expect(isGeminiQuotaError(new Error('Upstream connection failed'))).toBe(false)
})

test('recognizes a Gemini project access denial', () => {
  expect(isGeminiAccessDeniedError(new Error('403 Your project has been denied access'))).toBe(true)
  expect(isGeminiAccessDeniedError(new Error('Upstream connection failed'))).toBe(false)
})

test('requires one context source', async () => {
  const form = familyContextForm()
  form.set('title', 'TV instructions')

  const response = await app.request('/context', { method: 'POST', headers: contextHeaders, body: form })

  expect(response.status).toBe(400)
  expect(await response.json()).toEqual({ error: 'provide either text or one file' })
})

test('rejects unsupported context files before calling Gemini', async () => {
  const form = familyContextForm()
  form.set('title', 'Unsafe file')
  form.set('file', new File(['<script>'], 'unsafe.html', { type: 'text/html' }))

  const response = await app.request('/context', { method: 'POST', headers: contextHeaders, body: form })

  expect(response.status).toBe(400)
  expect(await response.json()).toEqual({
    error: 'file must be a supported document, image, audio file, or video file',
  })
})

test('rejects malformed multimodal guide keys before calling Gemini', async () => {
  const form = familyContextForm()
  form.set('contextKey', '../guide')
  form.set('title', 'TV remote')

  const response = await app.request('/context/guide', { method: 'POST', headers: contextHeaders, body: form })

  expect(response.status).toBe(400)
  expect(await response.json()).toEqual({
    error: 'contextKey must contain only letters, numbers, underscores, or hyphens',
  })
})

test('rejects more than one guide video before inspecting media', async () => {
  const form = familyContextForm()
  form.set('contextKey', 'guide-1')
  form.set('title', 'Oven controls')
  form.append('videos', new File(['video'], 'first.mp4', { type: 'video/mp4' }))
  form.append('videos', new File(['video'], 'second.mp4', { type: 'video/mp4' }))

  const response = await app.request('/context/guide', { method: 'POST', headers: contextHeaders, body: form })

  expect(response.status).toBe(400)
  expect(await response.json()).toEqual({ error: 'add only one guide video' })
})

test('rejects GIF guide images before calling Gemini', async () => {
  const form = familyContextForm()
  form.set('contextKey', 'guide-1')
  form.set('title', 'Oven controls')
  form.append('images', new File(['gif'], 'controls.gif', { type: 'image/gif' }))

  const response = await app.request('/context/guide', { method: 'POST', headers: contextHeaders, body: form })

  expect(response.status).toBe(400)
  expect(await response.json()).toEqual({ error: 'guide images must be JPEG, PNG, or WebP files' })
})

test('rejects more than five guide images before calling Gemini', async () => {
  const form = familyContextForm()
  form.set('contextKey', 'guide-1')
  form.set('title', 'Remote controls')
  for (let index = 0; index < 6; index += 1) {
    form.append('images', new File(['image'], `${index}.png`, { type: 'image/png' }))
  }

  const response = await app.request('/context/guide', { method: 'POST', headers: contextHeaders, body: form })

  expect(response.status).toBe(400)
  expect(await response.json()).toEqual({ error: 'add no more than five guide images' })
})

test('protects care-recipient memory and validates it before calling Gemini', async () => {
  const unauthorized = await app.request('/context/recipient', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ownerEmail: 'family@example.com' }),
  })
  expect(unauthorized.status).toBe(401)

  const invalid = await app.request('/context/recipient', {
    method: 'POST',
    headers: { ...contextHeaders, 'content-type': 'application/json' },
    body: JSON.stringify({ ownerEmail: 'family@example.com', recipientId: '../grandpa', name: 'Grandpa' }),
  })
  expect(invalid.status).toBe(400)
  expect(await invalid.json()).toEqual({
    error: 'recipientId must contain only letters, numbers, underscores, or hyphens',
  })
})

test('normalizes common media MIME aliases', async () => {
  expect(normalizeContextMimeType('audio/x-aiff')).toBe('audio/aiff')
  expect(normalizeContextMimeType('video/mp4')).toBe('video/mp4')
})

test('rejects malformed conversation session IDs', async () => {
  const response = await app.request('/agent/message', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ message: 'Hello', sessionId: '../shared' }),
  })

  expect(response.status).toBe(400)
  expect(await response.json()).toEqual({
    error: 'sessionId must contain only letters, numbers, underscores, or hyphens',
  })
})
