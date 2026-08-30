// Verifies the ADK-to-OpenRouter request conversion without making a paid API call.
import { expect, test } from 'bun:test'
import { Type } from '@google/genai'

import { buildOpenRouterRequest, openRouterSignal } from './openrouter-llm'

test('converts ADK conversation history and function tools for OpenRouter', () => {
  const request = buildOpenRouterRequest({
    contents: [
      { role: 'user', parts: [{ text: 'Help with my TV' }] },
      { role: 'model', parts: [{ functionCall: { id: 'call-1', name: 'search_family_context', args: { query: 'TV' } } }] },
      { role: 'user', parts: [{ functionResponse: { id: 'call-1', name: 'search_family_context', response: { found: false } } }] },
    ],
    toolsDict: {},
    liveConnectConfig: {},
    config: {
      maxOutputTokens: 2048,
      systemInstruction: 'Be patient.',
      tools: [{ functionDeclarations: [{
        name: 'search_family_context',
        description: 'Search saved context.',
        parameters: { type: Type.OBJECT, properties: { query: { type: Type.STRING } }, required: ['query'] },
      }] }],
    },
  })

  expect(request.messages).toEqual([
    { role: 'system', content: 'Be patient.' },
    { role: 'user', content: 'Help with my TV' },
    { role: 'assistant', content: null, tool_calls: [{ type: 'function', id: 'call-1', function: { name: 'search_family_context', arguments: '{"query":"TV"}' } }] },
    { role: 'tool', tool_call_id: 'call-1', name: 'search_family_context', content: '{"found":false}' },
  ])
  expect(request.tools?.[0].function.parameters).toEqual({
    type: 'object',
    properties: { query: { type: 'string' } },
    required: ['query'],
  })
})

test('combines caller cancellation with a bounded provider timeout', async () => {
  const caller = new AbortController()
  const callerSignal = openRouterSignal(caller.signal, 1_000)
  caller.abort('caller stopped')
  expect(callerSignal.aborted).toBe(true)
  expect(callerSignal.reason).toBe('caller stopped')

  const timeoutSignal = openRouterSignal(undefined, 1)
  await Bun.sleep(5)
  expect(timeoutSignal.aborted).toBe(true)
  expect(timeoutSignal.reason).toBeInstanceOf(DOMException)
})
