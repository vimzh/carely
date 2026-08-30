// Persists browser and Twilio voice-session admission state across API restarts.
import { database } from './database'

export type AgentSession = {
  id: string
  kind: 'browser_voice' | 'twilio'
  ownerEmail: string
  expiresAt: number
  callSid: string | null
  recipientId: string | null
  recipientName: string | null
}

database.exec(`
  CREATE TABLE IF NOT EXISTS agent_sessions (
    id TEXT PRIMARY KEY,
    kind TEXT NOT NULL CHECK (kind IN ('browser_voice', 'twilio')),
    owner_email TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    call_sid TEXT,
    recipient_id TEXT,
    recipient_name TEXT,
    created_at TEXT NOT NULL
  ) STRICT;
`)

function toSession(row: Record<string, unknown>): AgentSession {
  return {
    id: String(row.id),
    kind: row.kind === 'twilio' ? 'twilio' : 'browser_voice',
    ownerEmail: String(row.owner_email),
    expiresAt: Number(row.expires_at),
    callSid: row.call_sid === null ? null : String(row.call_sid),
    recipientId: row.recipient_id === null ? null : String(row.recipient_id),
    recipientName: row.recipient_name === null ? null : String(row.recipient_name),
  }
}

export function createAgentSession(input: Omit<AgentSession, 'id'>) {
  database.prepare('DELETE FROM agent_sessions WHERE expires_at <= ?').run(Date.now())
  const session = { id: crypto.randomUUID(), ...input }
  database.prepare(`
    INSERT INTO agent_sessions
      (id, kind, owner_email, expires_at, call_sid, recipient_id, recipient_name, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    session.id,
    session.kind,
    session.ownerEmail,
    session.expiresAt,
    session.callSid,
    session.recipientId,
    session.recipientName,
    new Date().toISOString(),
  )
  return session
}

export function readAgentSession(sessionId: string) {
  const row = database.prepare('SELECT * FROM agent_sessions WHERE id = ?').get(sessionId) as Record<string, unknown> | null
  if (!row) return null
  const session = toSession(row)
  if (session.expiresAt > Date.now()) return session
  deleteAgentSession(sessionId)
  return null
}

export function deleteAgentSession(sessionId: string) {
  database.prepare('DELETE FROM agent_sessions WHERE id = ?').run(sessionId)
}
