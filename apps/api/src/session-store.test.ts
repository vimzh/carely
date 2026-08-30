// Verifies that repeated Twilio webhook delivery reuses one persisted call session.
import { expect, test } from 'bun:test'

process.env.CARELY_API_DATABASE_PATH ??= ':memory:'

test('reuses an unexpired session for the same Twilio CallSid', async () => {
  const { createAgentSession, deleteAgentSession } = await import('./session-store')
  const callSid = `CA${crypto.randomUUID().replaceAll('-', '')}`
  const input = {
    kind: 'twilio' as const,
    ownerEmail: 'family@example.com',
    expiresAt: Date.now() + 60_000,
    callSid,
    recipientId: 'recipient-1',
    recipientName: 'Dadi',
  }

  const first = createAgentSession(input)
  const repeated = createAgentSession(input)
  expect(repeated.id).toBe(first.id)
  expect(repeated.expiresAt).toBe(first.expiresAt)
  deleteAgentSession(first.id)
  deleteAgentSession(first.id)
})

test('replaces an expired session for the same Twilio CallSid', async () => {
  const { createAgentSession, deleteAgentSession } = await import('./session-store')
  const callSid = `CA${crypto.randomUUID().replaceAll('-', '')}`
  const input = {
    kind: 'twilio' as const,
    ownerEmail: 'family@example.com',
    expiresAt: Date.now() - 1,
    callSid,
    recipientId: 'recipient-1',
    recipientName: 'Dadi',
  }

  const expired = createAgentSession(input)
  const replacement = createAgentSession({ ...input, expiresAt: Date.now() + 60_000 })
  expect(replacement.id).not.toBe(expired.id)
  deleteAgentSession(replacement.id)
})
