// Persists completed Carely voice-test sessions for dashboard activity totals.
import { database } from "@/lib/database";

database.exec(`
  CREATE TABLE IF NOT EXISTS voice_calls (
    owner_email TEXT NOT NULL,
    id TEXT PRIMARY KEY,
    started_at TEXT NOT NULL,
    ended_at TEXT,
    duration_seconds INTEGER NOT NULL DEFAULT 0
  ) STRICT;
`);

export type CareStats = {
  callsAnswered: number;
  minutesTalked: number;
};

export function startVoiceCallRecord(ownerEmail: string, id = crypto.randomUUID()) {
  database
    .prepare("INSERT OR IGNORE INTO voice_calls (owner_email, id, started_at) VALUES (?, ?, ?)")
    .run(ownerEmail, id, new Date().toISOString());
  return id;
}

export function finishVoiceCallRecord(ownerEmail: string, callId: string) {
  const call = database
    .prepare("SELECT started_at FROM voice_calls WHERE owner_email = ? AND id = ? AND ended_at IS NULL")
    .get(ownerEmail, callId) as { started_at?: unknown } | undefined;
  if (!call || typeof call.started_at !== "string") return false;

  const durationSeconds = Math.max(0, Math.floor((Date.now() - Date.parse(call.started_at)) / 1000));
  database
    .prepare(
      "UPDATE voice_calls SET ended_at = ?, duration_seconds = ? WHERE owner_email = ? AND id = ? AND ended_at IS NULL",
    )
    .run(new Date().toISOString(), durationSeconds, ownerEmail, callId);
  return true;
}

export function getCareStats(ownerEmail: string): CareStats {
  const row = database
    .prepare(
      "SELECT COUNT(*) AS calls_answered, COALESCE(SUM(duration_seconds), 0) AS total_seconds FROM voice_calls WHERE owner_email = ? AND ended_at IS NOT NULL",
    )
    .get(ownerEmail) as { calls_answered: number; total_seconds: number };

  return {
    callsAnswered: Number(row.calls_answered),
    minutesTalked: Math.round(Number(row.total_seconds) / 60),
  };
}
