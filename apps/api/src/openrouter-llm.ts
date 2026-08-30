// Adapts OpenRouter chat completions to the Google ADK text-model interface.
import { BaseLlm, type LlmRequest, type LlmResponse } from '@google/adk'

type JsonObject = Record<string, unknown>

function normalizeSchema(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalizeSchema)
  if (!value || typeof value !== 'object') return value

  return Object.fromEntries(Object.entries(value).map(([key, child]) => [
    key,
    key === 'type' && typeof child === 'string' ? child.toLowerCase() : normalizeSchema(child),
  ]))
}

function textFromParts(parts: unknown[]) {
  return parts.flatMap((part) => {
    if (!part || typeof part !== 'object') return []
    const text = (part as JsonObject).text
    return typeof text === 'string' ? [text] : []
  }).join('\n')
}

export function buildOpenRouterRequest(llmRequest: LlmRequest) {
  const messages: JsonObject[] = []
  const systemInstruction = llmRequest.config?.systemInstruction
  if (typeof systemInstruction === 'string') {
    messages.push({ role: 'system', content: systemInstruction })
  } else if (systemInstruction && typeof systemInstruction === 'object' && 'parts' in systemInstruction) {
    messages.push({ role: 'system', content: textFromParts(systemInstruction.parts ?? []) })
  }

  for (const content of llmRequest.contents) {
    const functionResponses = content.parts?.flatMap((part) => part.functionResponse ? [part.functionResponse] : []) ?? []
    for (const response of functionResponses) {
      messages.push({
        role: 'tool',
        tool_call_id: response.id,
        name: response.name,
        content: JSON.stringify(response.response ?? {}),
      })
    }

    const text = textFromParts(content.parts ?? [])
    const functionCalls = content.parts?.flatMap((part) => part.functionCall ? [part.functionCall] : []) ?? []
    if (!text && !functionCalls.length) continue

    messages.push({
      role: content.role === 'model' ? 'assistant' : 'user',
      content: text || null,
      ...(functionCalls.length ? {
        tool_calls: functionCalls.map((call) => ({
          type: 'function',
          id: call.id,
          function: { name: call.name, arguments: JSON.stringify(call.args ?? {}) },
        })),
      } : {}),
    })
  }

  const declarations = llmRequest.config?.tools?.flatMap((tool) =>
    'functionDeclarations' in tool ? tool.functionDeclarations ?? [] : [],
  ) ?? []
  const allowed = llmRequest.allowedTools ? new Set(llmRequest.allowedTools) : null
  const tools = declarations
    .filter((declaration) => !allowed || allowed.has(declaration.name ?? ''))
    .map((declaration) => ({
      type: 'function',
      function: {
        name: declaration.name,
        description: declaration.description,
        parameters: normalizeSchema(declaration.parameters ?? { type: 'object', properties: {} }),
      },
    }))

  return {
    messages,
    ...(tools.length ? { tools, tool_choice: 'auto' } : {}),
    max_tokens: llmRequest.config?.maxOutputTokens ?? 2048,
    temperature: llmRequest.config?.temperature ?? 0.2,
    reasoning: { effort: 'minimal' },
  }
}

export class OpenRouterLlm extends BaseLlm {
  constructor(private readonly apiKey: string) {
    super({ model: 'google/gemini-3.7-flash' })
  }

  async *generateContentAsync(llmRequest: LlmRequest, _stream = false, abortSignal?: AbortSignal): AsyncGenerator<LlmResponse, void> {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.CARELY_WEB_ORIGIN ?? 'http://localhost:3004',
        'X-Title': 'Carely',
      },
      body: JSON.stringify({ model: this.model, ...buildOpenRouterRequest(llmRequest) }),
      signal: abortSignal,
    })
    const result = await response.json() as JsonObject
    if (!response.ok) {
      const error = result.error as JsonObject | undefined
      throw new Error(`OpenRouter ${response.status}: ${typeof error?.message === 'string' ? error.message : 'request failed'}`)
    }

    const choice = (result.choices as JsonObject[] | undefined)?.[0]
    const message = choice?.message as JsonObject | undefined
    const parts: JsonObject[] = []
    if (typeof message?.content === 'string' && message.content.trim()) parts.push({ text: message.content })

    for (const toolCall of message?.tool_calls as JsonObject[] ?? []) {
      const fn = toolCall.function as JsonObject | undefined
      if (typeof fn?.name !== 'string' || typeof fn.arguments !== 'string') continue
      let args: unknown
      try {
        args = JSON.parse(fn.arguments)
      } catch {
        throw new Error(`OpenRouter returned invalid arguments for ${fn.name}`)
      }
      if (!args || typeof args !== 'object' || Array.isArray(args)) throw new Error(`OpenRouter returned invalid arguments for ${fn.name}`)
      parts.push({ functionCall: { id: toolCall.id, name: fn.name, args } })
    }

    if (!parts.length) throw new Error('OpenRouter returned no text or tool call')
    const usage = result.usage as JsonObject | undefined
    yield {
      content: { role: 'model', parts },
      modelVersion: typeof result.model === 'string' ? result.model : this.model,
      usageMetadata: usage ? {
        promptTokenCount: typeof usage.prompt_tokens === 'number' ? usage.prompt_tokens : undefined,
        candidatesTokenCount: typeof usage.completion_tokens === 'number' ? usage.completion_tokens : undefined,
        totalTokenCount: typeof usage.total_tokens === 'number' ? usage.total_tokens : undefined,
      } : undefined,
    }
  }

  async connect(): Promise<never> {
    throw new Error('OpenRouter is configured only for Carely text conversations')
  }
}
