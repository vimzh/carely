// Defines the Carely ADK agent and gives it access to the family's indexed context.
import { FunctionTool, Gemini, getFunctionResponses, GOOGLE_SEARCH, InMemoryRunner, isFinalResponse, LiveRequestQueue, LlmAgent, stringifyContent, TruncatingContextCompactor } from '@google/adk'
import { Modality, ThinkingLevel, Type } from '@google/genai'

import { listGuideContextRecords, searchFamilyContext } from './context-store'
import type { ConversationAction } from './conversation-review'
import { searchNearbyPlaces } from './nearby-places'
import { CARELY_TEXT_INSTRUCTION, CARELY_VOICE_INSTRUCTION } from './prompts/carely'
import { createPersonalReminder } from './reminders'
import { OpenRouterLlm } from './openrouter-llm'

if (!process.env.GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY is required to run the Carely agent')
}

const BASIC_QUESTION_PATTERNS = [
  /^(?:hello|hi|hey|good (?:morning|afternoon|evening))\b/,
  /^(?:thanks|thank you)\b/,
  /^(?:what(?:'s| is) (?:the )?(?:current )?time|tell me the time|current time)\b/,
  /^(?:what(?:'s| is) (?:the )?(?:current )?date|what day is it|today(?:'s)? date)\b/,
  /^(?:what(?:'s| is) the weather|how(?:'s| is) the weather|weather (?:today|tomorrow))\b/,
  /^(?:calculate\s+)?\d+(?:\.\d+)?\s*[-+*/]\s*\d/,
  /^(?:what (?:does|is) .+ mean|define .+|.+ ka matlab kya hai|.+ क्या होता है|.+ का मतलब क्या है)$/,
  /^(?:india mein|भारत में).*(?:family|परिवार)\b/,
]

const FAMILY_MEMORY_PATTERNS = [
  /\b(?:family|parent|mother|father|mom|dad|grandparent|grandmother|grandfather|grandma|grandpa|son|daughter)\b/,
  /\b(?:saved|uploaded|family note|guide|reminder|routine|schedule|instructions?|context)\b/,
  /\b(?:my|our)\s+(?:medicine|medication|pill|dose|remote|oven|tv|television|ac|air conditioner|appliance)\b/,
  /\b(?:take|took|missed)\s+(?:my\s+)?(?:medicine|medication|pill|dose)\b/,
  /\b(?:likes?|dislikes?|preferences?|favourites?|favorites?|personalized|personally|avoid)\b/,
  /\b(?:how to|how (?:do|can|should) i|help me)\s+(?:use|set|turn|configure)\b.*\b(?:remote|oven|tv|television|ac|air conditioner|microwave|washing machine|appliance)\b/,
  /\b(?:which|what) button\b/,
  /\b(?:i (?:can )?see|there(?:'s| is)|it (?:shows|says))\b.*\b(?:button|screen|light|symbol|label|knob|switch|remote|display|message|option)\b/,
  /\b(?:red|green|blue|yellow|round|square|top|bottom|above|below|next to|beside|left|right)\b.*\b(?:button|light|key|knob|switch|icon|symbol)\b/,
  /(?:टीवी|टेलीविजन|रिमोट|माइक्रोवेव|ओवन|वॉशिंग मशीन|कपड़े धोने की मशीन|एसी|एयर कंडीशनर|उपकरण)/,
  /(?:बटन|घुंडी|नॉब|स्क्रीन|डिस्प्ले|लाइट|निशान|चिह्न|ताला)/,
  /(?:मेरी|मेरा|मेरे|हमारी|हमारा|मुझे)\s*(?:दवाई?|गोली|खुराक|डोज|दिनचर्या|रूटीन|रिमाइंडर|याद दिलाना)/,
  /(?:मेरी|मेरा|मुझे).{0,12}(?:पसंद|नापसंद)|(?:मेरे|हमारे|हमारी)\s+(?:परिवार|घर)/,
  /(?:दवाई?|गोली|खुराक|डोज).{0,24}(?:कब|कितनी|कैसे|समय|लेनी|खानी|ली थी|भूल)/,
  /(?:मम्मी|माँ|पापा|पिता|दादा|दादी|नाना|नानी|बेटा|बेटी|परिवार).{0,32}(?:पसंद|नापसंद|दवा|दिनचर्या|रूटीन|रिमाइंडर|याद)/,
  /\b(?:meri|mera|mere|hamari|hamara|mujhe)\s+(?:dawai|dava|medicine|goli|dose|khurak|routine|schedule|reminder)\b/,
  /\b(?:meri|mera|mujhe)\b.{0,16}\b(?:pasand|napasand)\b|\b(?:mere|hamare|hamari)\s+(?:family|parivar|ghar)\b/,
  /\b(?:dawai|dava|medicine|goli|dose|khurak)\b.{0,32}\b(?:kab|kitni|kaise|samay|time|leni|khani|li thi|bhool)\b/,
  /\b(?:mummy|maa|papa|dada|dadi|nana|nani|beta|beti|family)\b.{0,40}\b(?:pasand|napasand|likes?|dislikes?|medicine|dawai|routine|reminder|yaad)\b/,
  /(?:याद दिलाओ|याद दिलाना|रिमाइंडर).{0,24}(?:मेरी|मुझे|मम्मी|पापा|दादा|दादी|दवा|गोली)/,
  /\b(?:yaad dila(?:o|na)|reminder)\b.{0,32}\b(?:meri|mujhe|mummy|papa|dada|dadi|medicine|dawai|goli)\b/,
]

const APPLIANCE_QUERY_PATTERN = /(?:remote|oven|stove|cooktop|hob|tv|television|ac|air conditioner|microwave|washing machine|appliance|टीवी|टेलीविजन|रिमोट|माइक्रोवेव|ओवन|चूल्हा|वॉशिंग मशीन|कपड़े धोने की मशीन|एसी|एयर कंडीशनर|उपकरण)/i

const GUIDE_LABEL_PATTERNS = [
  ['washing_machine', /(?:washing machine|washer|वॉशिंग मशीन|कपड़े धोने की मशीन)/i],
  ['microwave', /(?:microwave|माइक्रोवेव)/i],
  ['air_conditioner', /(?:air conditioner|\bac\b|एयर कंडीशनर|एसी)/i],
  ['oven', /(?:oven|stove|cooktop|hob|ओवन|चूल्हा)/i],
  ['television', /(?:\btv\b|television|remote|टीवी|टेलीविजन|रिमोट)/i],
] as const

function guideLabel(value: string) {
  return GUIDE_LABEL_PATTERNS.find(([, pattern]) => pattern.test(value))?.[0] ?? null
}

export function selectRelevantGuides<T extends { title: string; record: string }>(query: string, guides: T[]) {
  const queryLabel = guideLabel(query)
  if (!queryLabel) return guides
  const matches = guides.filter(({ title, record }) => (guideLabel(title) ?? guideLabel(record)) === queryLabel)
  return matches.length ? matches : guides
}

function boundGuideRecords<T extends { title: string; record: string }>(guides: T[]) {
  let remaining = 16_000
  return guides.slice(0, 8).flatMap(({ title, record }) => {
    if (remaining <= 0) return []
    const boundedRecord = record.slice(0, Math.min(remaining, 4_000))
    remaining -= boundedRecord.length
    return [{ title, record: boundedRecord }]
  })
}

export function shouldSearchFamilyContext(query: string) {
  const normalized = query.trim().toLowerCase().replace(/[?!.,]+$/g, '')
  if (!normalized || BASIC_QUESTION_PATTERNS.some((pattern) => pattern.test(normalized))) return false
  return FAMILY_MEMORY_PATTERNS.some((pattern) => pattern.test(normalized))
}

const HYPOTHETICAL_OR_PAST_EMERGENCY = /\b(?:what if|if (?:i|he|she|they|someone)|in case|yesterday|last night|last week|used to|can breathe now|is fine now)\b|(?:अगर|यदि|क्या हो अगर|कल|पहले|अब ठीक)/i
const CURRENT_EMERGENCY_PATTERNS = [
  /\b(?:i|he|she|they|my (?:mother|father|mom|dad|grandmother|grandfather|grandma|grandpa))\b.{0,40}\b(?:can't|cannot|unable to|not able to) breathe\b/i,
  /\b(?:i am|i'm|he is|she is|they are|my (?:mother|father|mom|dad|grandmother|grandfather|grandma|grandpa) is) choking\b/i,
  /\b(?:i (?:have|am having)|he|she|they (?:has|have|is having|are having)|my (?:mother|father|mom|dad|grandmother|grandfather|grandma|grandpa) (?:has|is having))\b.{0,24}\b(?:severe chest pain|heavy bleeding)\b/i,
  /\b(?:i|he|she|they)\b.{0,24}\b(?:fell|have fallen|has fallen)\b.{0,32}\b(?:can't|cannot|unable to) (?:get|stand) up\b/i,
  /\b(?:there is|there's|we have|my .{0,20} is)\b.{0,24}\b(?:a fire|on fire|gas leak)\b/i,
  /\b(?:i|he|she|they)\b.{0,24}\b(?:took|swallowed|have taken|has taken)\b.{0,24}\b(?:too many (?:pills?|tablets?)|extra (?:dose|pills?|medicine|medication)|double dose|two doses|wrong dose)\b/i,
  /(?:मुझे|उसे|मम्मी|पापा|दादा|दादी).{0,32}(?:साँस|सांस) नहीं (?:आ|ले) (?:रही|रहा)|\b(?:mujhe|use|mummy|papa|dada|dadi)\b.{0,32}\bsaans nahi (?:aa|le) (?:rahi|raha)/i,
  /(?:सीने में तेज दर्द|बहुत खून बह रहा|आग लगी है|गैस लीक)|\b(?:tez chest pain|bahut khoon|aag lagi|gas leak (?:hai|ho rahi))\b/i,
  /(?:मैं|वह|मम्मी|पापा|दादा|दादी).{0,24}(?:गिर गया|गिर गई).{0,32}(?:उठ नहीं|खड़ा नहीं|खड़ी नहीं)|\b(?:main|woh|mummy|papa|dada|dadi)\b.{0,24}\bgir (?:gaya|gayi)\b.{0,32}\buth nahi/i,
  /(?:मैंने|उसने|मम्मी ने|पापा ने|दादा ने|दादी ने).{0,24}(?:दो खुराक|दो बार दवा|ज्यादा गोलियाँ|गलत खुराक)|\b(?:maine|usne|mummy ne|papa ne|dada ne|dadi ne)\b.{0,24}\b(?:double dose|extra dose|zyada goli|do baar dawai)/i,
]

export function urgentSafetyResponse(message: string) {
  const normalized = message.trim()
  if (!normalized || HYPOTHETICAL_OR_PAST_EMERGENCY.test(normalized)) return null
  if (!CURRENT_EMERGENCY_PATTERNS.some((pattern) => pattern.test(normalized))) return null
  if (/[\u0900-\u097f]|\b(?:saans|dawai|goli|mujhe|mummy|papa|dada|dadi|aag)\b/i.test(normalized)) {
    return 'अभी स्थानीय आपातकालीन सेवा को फ़ोन कीजिए। अगर आप खुद फ़ोन नहीं कर सकते, पास के किसी भरोसेमंद व्यक्ति को तुरंत बुलाइए। मैं आपकी ओर से कॉल नहीं कर सकती।'
  }
  return 'Call local emergency services now. If you cannot make the call, alert a trusted person nearby immediately. I cannot place the call for you.'
}

type PriorTranscriptEntry = { role: 'assistant' | 'user'; text: string }

export function buildAgentMessageParts(
  message: string,
  savedGuides: Array<{ title: string; record: string }>,
  priorTranscript: PriorTranscriptEntry[] = [],
) {
  let remaining = 20_000
  const boundedHistory = priorTranscript.slice(-40).reverse().flatMap((entry) => {
    if ((entry.role !== 'user' && entry.role !== 'assistant') || !entry.text.trim() || remaining <= 0) return []
    const text = entry.text.trim().slice(0, Math.min(remaining, 4_000))
    remaining -= text.length
    return [{ role: entry.role, text }]
  }).reverse()
  const parts = [{ text: message }]
  if (boundedHistory.length) {
    parts.push({ text: `<untrusted_prior_conversation>\n${JSON.stringify(boundedHistory)}\n</untrusted_prior_conversation>` })
  }
  if (savedGuides.length) {
    parts.push({
      text: `<saved_family_guides>\n${savedGuides.map(({ title, record }) => `Guide: ${title}\n${record}`).join('\n\n')}\n</saved_family_guides>`,
    })
  }
  return parts
}

const searchFamilyContextTool = new FunctionTool({
  name: 'search_family_context',
  description: 'Search the family\'s saved context before answering about routines, medicines, preferences, home, devices, relationships, or vague descriptions of visible controls. Search again when a later clue identifies the device or conflicts with an earlier result.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: {
        type: Type.STRING,
        description: 'A concise query combining the known device or task with the caller\'s exact visible words, colors, labels, and positions.',
      },
    },
    required: ['query'],
  },
  execute: async (input, toolContext) => {
    const query = (input as { query?: unknown }).query
    if (typeof query !== 'string' || !query.trim() || query.length > 500) {
      throw new Error('A concise context search query is required')
    }
    const cleanQuery = query.trim()
    if (!shouldSearchFamilyContext(cleanQuery)) {
      return {
        found: false,
        skipped: true,
        context: 'Family memory is not needed for this question.',
        sources: [],
      }
    }
    const ownerEmail = toolContext?.userId ?? ''
    if (!ownerEmail || ownerEmail === 'prototype-user') {
      return {
        found: false,
        skipped: true,
        context: 'This conversation is not linked to a family account.',
        sources: [],
      }
    }
    const savedGuides = APPLIANCE_QUERY_PATTERN.test(cleanQuery)
      ? boundGuideRecords(selectRelevantGuides(cleanQuery, listGuideContextRecords(ownerEmail)))
      : []
    if (savedGuides.length) {
      return {
        found: true,
        context: savedGuides.map(({ title, record }) => `Guide: ${title}\n${record}`).join('\n\n'),
        sources: savedGuides.map(({ title }) => title),
      }
    }
    return searchFamilyContext(ownerEmail, cleanQuery)
  },
})

const createPersonalReminderTool = new FunctionTool({
  name: 'create_personal_reminder',
  description: 'Create a daily reminder for a saved care recipient, but only after the caller explicitly confirms the person, time, and message.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      recipientName: {
        type: Type.STRING,
        description: 'The exact name of the parent or grandparent in the Care is for list.',
      },
      title: {
        type: Type.STRING,
        description: 'A short reminder name, such as Evening medicine.',
      },
      time: {
        type: Type.STRING,
        description: 'The daily call time in h:mm AM or h:mm PM format.',
      },
      context: {
        type: Type.STRING,
        description: 'The exact gentle message Carely should say during the reminder call.',
      },
    },
    required: ['recipientName', 'title', 'time', 'context'],
  },
  execute: async (input, toolContext) => {
    const values = input as Record<string, unknown>
    const recipientName = typeof values.recipientName === 'string' ? values.recipientName.trim() : ''
    const title = typeof values.title === 'string' ? values.title.trim() : ''
    const time = typeof values.time === 'string' ? values.time.trim().toUpperCase() : ''
    const context = typeof values.context === 'string' ? values.context.trim() : ''
    const ownerEmail = toolContext?.userId ?? ''
    if (!ownerEmail || ownerEmail === 'prototype-user') throw new Error('This call is not linked to a family account')
    if (!recipientName || recipientName.length > 80) throw new Error('A saved care recipient name is required')
    if (!title || title.length > 160) throw new Error('A short reminder name is required')
    if (!/^(?:[1-9]|1[0-2]):[0-5]\d (?:AM|PM)$/.test(time)) throw new Error('Use a time such as 9:15 AM')
    if (!context || context.length > 2000) throw new Error('A reminder message is required')

    await createPersonalReminder({ ownerEmail, recipientName, title, time, context })
    return { saved: true, recipientName, title, time, repeats: 'daily' }
  },
})

const searchNearbyPlacesTool = new FunctionTool({
  name: 'search_nearby_places',
  description: 'Find current nearby places or services using Google Maps and a saved care recipient home location. Invoke only for geographical requests such as a nearby pharmacy, hospital, shop, bank, or repair service. Do not invoke for general facts or family instructions.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: {
        type: Type.STRING,
        description: 'The simple place or service to find, such as pharmacy, hospital, or television repair.',
      },
      recipientName: {
        type: Type.STRING,
        description: 'The exact saved care recipient name when it is known. Omit only when the family has one saved home location.',
      },
    },
    required: ['query'],
  },
  execute: async (input, toolContext) => {
    const values = input as Record<string, unknown>
    const query = typeof values.query === 'string' ? values.query.trim() : ''
    const recipientName = typeof values.recipientName === 'string' ? values.recipientName.trim() : ''
    const ownerEmail = toolContext?.userId ?? ''
    if (!ownerEmail || ownerEmail === 'prototype-user') throw new Error('This conversation is not linked to a family account')
    if (!query || query.length > 120) throw new Error('A short nearby place or service is required')
    if (recipientName.length > 80) throw new Error('The care recipient name is too long')
    return searchNearbyPlaces(ownerEmail, query, recipientName)
  },
})

const placesEnabled = process.env.CARELY_PLACES_ENABLED === 'true'
const openRouterApiKey = process.env.OPENROUTER_API_KEY
const carelyTools = [
  searchFamilyContextTool,
  ...(placesEnabled ? [searchNearbyPlacesTool] : []),
  createPersonalReminderTool,
  ...(openRouterApiKey ? [] : [GOOGLE_SEARCH]),
]

const carelyTextModel = openRouterApiKey
  ? new OpenRouterLlm(openRouterApiKey)
  : new Gemini({ model: 'gemini-3.5-flash-lite', useInteractionsApi: true })

const carelyAgent = new LlmAgent({
  name: 'carely',
  model: carelyTextModel,
  description: 'A patient voice companion for elderly family members.',
  instruction: CARELY_TEXT_INSTRUCTION,
  tools: carelyTools,
  generateContentConfig: {
    maxOutputTokens: 2048,
    temperature: 0.2,
    thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
  },
  contextCompactors: [new TruncatingContextCompactor({ threshold: 64, preserveLeadingEvents: 2 })],
})

const runner = new InMemoryRunner({ agent: carelyAgent, appName: 'carely' })

const carelyVoiceAgent = new LlmAgent({
  name: 'carely_voice',
  model: 'gemini-3.1-flash-live-preview',
  description: 'A soft-spoken live guide for elderly family members.',
  instruction: CARELY_VOICE_INSTRUCTION,
  tools: carelyTools,
  generateContentConfig: {
    maxOutputTokens: 2048,
    thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
  },
})

const voiceRunner = new InMemoryRunner({ agent: carelyVoiceAgent, appName: 'carely-voice' })

export function sanitizeCallerFacingText(value: string) {
  return value
    .replace(/\*+/g, '')
    .replace(/^\s*(?:[-•]|\d+[.)])\s+/gm, '')
    .trim()
}

export async function askCarely(
  message: string,
  sessionId = crypto.randomUUID(),
  userId = 'prototype-user',
  providedGuides: Array<{ title: string; record: string }> = [],
  priorTranscript: PriorTranscriptEntry[] = [],
) {
  const urgentResponse = urgentSafetyResponse(message)
  if (urgentResponse) return { response: urgentResponse, sources: [], actions: [] }
  const runnerSessionId = priorTranscript.length ? crypto.randomUUID() : sessionId
  await runner.sessionService.getOrCreateSession({ appName: 'carely', userId, sessionId: runnerSessionId })
  const sources = new Set<string>()
  const actions: ConversationAction[] = []
  const storedGuides = userId !== 'prototype-user' && shouldSearchFamilyContext(message)
    ? listGuideContextRecords(userId)
    : []
  const storedTitles = new Set(storedGuides.map(({ title }) => title.toLowerCase()))
  let remainingGuideCharacters = 16_000
  const savedGuides = selectRelevantGuides(
    message,
    [...storedGuides, ...providedGuides.filter(({ title }) => !storedTitles.has(title.toLowerCase()))],
  )
    .flatMap(({ title, record }) => {
      if (remainingGuideCharacters <= 0) return []
      const boundedRecord = record.slice(0, Math.min(remainingGuideCharacters, 4_000))
      remainingGuideCharacters -= boundedRecord.length
      return [{ title, record: boundedRecord }]
    })
    .slice(0, 8)
  const parts = buildAgentMessageParts(message, savedGuides, priorTranscript)

  for await (const event of runner.runAsync({
    userId,
    sessionId: runnerSessionId,
    newMessage: { role: 'user', parts },
    runConfig: { maxLlmCalls: 6 },
  })) {
    if (event.errorCode) throw new Error(event.errorMessage || event.errorCode)
    collectConversationEvidence(event, sources, actions)
    if (!isFinalResponse(event)) continue

    const response = sanitizeCallerFacingText(stringifyContent(event))
    if (response) return { response, sources: [...sources], actions }
  }

  throw new Error('Carely agent returned no response')
}

export function streamCarelyVoice(
  sessionId: string,
  userId: string,
  liveRequestQueue: LiveRequestQueue,
  abortSignal: AbortSignal,
) {
  return voiceRunner.runLive({
    userId,
    sessionId,
    liveRequestQueue,
    abortSignal,
    runConfig: {
      responseModalities: [Modality.AUDIO],
      inputAudioTranscription: {},
      outputAudioTranscription: {},
      realtimeInputConfig: {
        automaticActivityDetection: {
          disabled: false,
          prefixPaddingMs: 40,
          silenceDurationMs: 650,
        },
      },
      contextWindowCompression: {
        triggerTokens: '25000',
        slidingWindow: { targetTokens: '8000' },
      },
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Achernar' } },
      },
    },
  })
}

function functionOutput(response: Record<string, unknown> | undefined) {
  const output = response?.output
  return output && typeof output === 'object' ? output as Record<string, unknown> : response
}

export function collectConversationEvidence(
  event: Parameters<typeof getFunctionResponses>[0],
  sources: Set<string>,
  actions: ConversationAction[],
) {
  for (const functionResponse of getFunctionResponses(event)) {
    const result = functionOutput(functionResponse.response)
    if (functionResponse.name === 'search_family_context' && Array.isArray(result?.sources)) {
      for (const source of result.sources) if (typeof source === 'string' && source.trim()) sources.add(source.trim())
    }
    if (functionResponse.name === 'create_personal_reminder' && result?.saved === true) {
      const title = typeof result.title === 'string' ? result.title : 'reminder'
      const time = typeof result.time === 'string' ? result.time : ''
      const summary = `Saved ${title}${time ? ` for ${time}` : ''}`
      if (!actions.some((action) => action.summary === summary)) {
        actions.push({ type: 'reminder', summary, status: 'completed' })
      }
    }
    if (functionResponse.name === 'search_nearby_places' && Array.isArray(result?.places)) {
      for (const place of result.places) {
        if (!place || typeof place !== 'object') continue
        const name = 'name' in place && typeof place.name === 'string' ? place.name.trim() : ''
        if (name) sources.add(`Google Maps: ${name}`)
      }
    }
  }
}
