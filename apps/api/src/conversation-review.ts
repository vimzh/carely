// Creates a compact, structured family brief from a completed Carely conversation.
import { GoogleGenAI } from '@google/genai'

import { createConversationReviewPrompt } from './prompts/carely'

export type TranscriptEntry = { role: 'assistant' | 'user'; text: string }
export type ConversationAction = { type: 'reminder'; summary: string; status: 'completed' }
export type ConversationMetricKey = 'accuracy' | 'clarity' | 'resolution' | 'safety' | 'tone'
export type ConversationReview = {
  summary: string
  struggle: string
  score: {
    total: number
    qualification: 'needs_context' | 'qualified' | 'review'
    metrics: Record<ConversationMetricKey, { reason: string; score: number }>
    contextSuggestion: string | null
  }
}
export type ConversationReviewInput = {
  transcript: TranscriptEntry[]
  sources: string[]
  actions: ConversationAction[]
}

const REVIEW_MODEL = 'gemini-3.5-flash-lite'
const METRIC_KEYS: ConversationMetricKey[] = ['resolution', 'accuracy', 'clarity', 'tone', 'safety']
const reviewSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['summary', 'struggle', 'metrics', 'contextSuggestion'],
  properties: {
    summary: { type: 'string', maxLength: 400 },
    struggle: { type: 'string', maxLength: 300 },
    contextSuggestion: { anyOf: [{ type: 'string', maxLength: 300 }, { type: 'null' }] },
    metrics: {
      type: 'object',
      additionalProperties: false,
      required: METRIC_KEYS,
      properties: Object.fromEntries(METRIC_KEYS.map((key) => [key, {
        type: 'object',
        additionalProperties: false,
        required: ['score', 'reason'],
        properties: {
          score: { type: 'integer', minimum: 0, maximum: 20 },
          reason: { type: 'string', maxLength: 180 },
        },
      }])),
    },
  },
}

function cleanText(value: unknown, field: string, maxLength: number) {
  if (typeof value !== 'string' || !value.trim() || value.length > maxLength) {
    throw new Error(`Conversation review returned an invalid ${field}`)
  }
  return value.trim()
}

export function parseConversationReview(value: unknown): ConversationReview {
  if (!value || typeof value !== 'object') throw new Error('Conversation review returned invalid JSON')
  const record = value as Record<string, unknown>
  const rawMetrics = record.metrics
  if (!rawMetrics || typeof rawMetrics !== 'object') throw new Error('Conversation review returned invalid metrics')

  const metrics = {} as ConversationReview['score']['metrics']
  for (const key of METRIC_KEYS) {
    const metric = (rawMetrics as Record<string, unknown>)[key]
    if (!metric || typeof metric !== 'object') throw new Error(`Conversation review omitted ${key}`)
    const { reason, score } = metric as Record<string, unknown>
    if (!Number.isInteger(score) || Number(score) < 0 || Number(score) > 20) {
      throw new Error(`Conversation review returned an invalid ${key} score`)
    }
    metrics[key] = { reason: cleanText(reason, `${key} reason`, 180), score: Number(score) }
  }

  const total = METRIC_KEYS.reduce((sum, key) => sum + metrics[key].score, 0)
  const qualification = total >= 80 && metrics.accuracy.score >= 16 && metrics.safety.score >= 16
    ? 'qualified'
    : total >= 60 && metrics.resolution.score >= 12 && metrics.accuracy.score >= 12 && metrics.safety.score >= 12
      ? 'review'
      : 'needs_context'
  const contextSuggestion = record.contextSuggestion === null
    ? null
    : cleanText(record.contextSuggestion, 'context suggestion', 300)

  return {
    summary: cleanText(record.summary, 'summary', 400),
    struggle: cleanText(record.struggle, 'struggle', 300),
    score: { total, qualification, metrics, contextSuggestion },
  }
}

export function normalizeConversationReviewInput(value: unknown): ConversationReviewInput | null {
  if (!value || typeof value !== 'object') return null
  const input = value as Record<string, unknown>
  if (!Array.isArray(input.transcript) || input.transcript.length < 1 || input.transcript.length > 100) return null
  let totalLength = 0
  const transcript: TranscriptEntry[] = []
  for (const entry of input.transcript) {
    if (!entry || typeof entry !== 'object') return null
    const { role, text } = entry as Record<string, unknown>
    if ((role !== 'user' && role !== 'assistant') || typeof text !== 'string' || !text.trim() || text.length > 4_000) return null
    totalLength += text.length
    if (totalLength > 40_000) return null
    transcript.push({ role, text: text.trim() })
  }
  if (!Array.isArray(input.sources) || input.sources.length > 10 || input.sources.some((source) => typeof source !== 'string' || !source.trim() || source.length > 200)) return null
  if (!Array.isArray(input.actions) || input.actions.length > 10) return null
  const actions: ConversationAction[] = []
  for (const action of input.actions) {
    if (!action || typeof action !== 'object') return null
    const { type, status, summary } = action as Record<string, unknown>
    if (type !== 'reminder' || status !== 'completed' || typeof summary !== 'string' || !summary.trim() || summary.length > 300) return null
    actions.push({ type, status, summary: summary.trim() })
  }
  return { transcript, sources: [...new Set(input.sources as string[])], actions }
}

export async function reviewConversation(input: ConversationReviewInput) {
  if (!input.transcript.length) throw new Error('A transcript is required for conversation review')
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY, httpOptions: { timeout: 60_000 } })
  const response = await ai.models.generateContent({
    model: REVIEW_MODEL,
    contents: createConversationReviewPrompt({
      transcript: input.transcript,
      sources: input.sources.slice(0, 10),
      actions: input.actions.slice(0, 10),
    }),
    config: {
      maxOutputTokens: 1400,
      responseMimeType: 'application/json',
      responseJsonSchema: reviewSchema,
      temperature: 0.1,
    },
  })
  if (!response.text) throw new Error('Gemini returned no conversation review')
  return parseConversationReview(JSON.parse(response.text))
}
