import { database } from "@/lib/database";
import type { Reminder, ReminderInput } from "@/lib/reminder";

database.exec(`
  CREATE TABLE IF NOT EXISTS reminder_owners (
    owner_email TEXT PRIMARY KEY,
    seeded_at TEXT NOT NULL
  ) STRICT;

  CREATE TABLE IF NOT EXISTS reminders (
    owner_email TEXT NOT NULL,
    id TEXT NOT NULL,
    title TEXT NOT NULL,
    call_time TEXT NOT NULL,
    context TEXT NOT NULL,
    contact_id TEXT NOT NULL DEFAULT '',
    recipient_id TEXT NOT NULL DEFAULT '',
    time_zone TEXT NOT NULL DEFAULT 'UTC',
    source TEXT NOT NULL DEFAULT 'dashboard',
    created_by TEXT NOT NULL DEFAULT 'You',
    created_at TEXT NOT NULL,
    PRIMARY KEY (owner_email, id)
  ) STRICT;

  CREATE TABLE IF NOT EXISTS reminder_calls (
    id TEXT PRIMARY KEY,
    owner_email TEXT NOT NULL,
    reminder_id TEXT NOT NULL,
    local_date TEXT NOT NULL,
    status TEXT NOT NULL,
    provider_call_id TEXT,
    response TEXT,
    error TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE (owner_email, reminder_id, local_date)
  ) STRICT;
`);

const reminderColumns = database
  .prepare("PRAGMA table_info(reminders)")
  .all() as Array<{ name: string }>;
if (!reminderColumns.some(({ name }) => name === "contact_id")) {
  database.exec("ALTER TABLE reminders ADD COLUMN contact_id TEXT NOT NULL DEFAULT ''");
}
if (!reminderColumns.some(({ name }) => name === "time_zone")) {
  database.exec("ALTER TABLE reminders ADD COLUMN time_zone TEXT NOT NULL DEFAULT 'UTC'");
}
if (!reminderColumns.some(({ name }) => name === "recipient_id")) {
  database.exec("ALTER TABLE reminders ADD COLUMN recipient_id TEXT NOT NULL DEFAULT ''");
}
if (!reminderColumns.some(({ name }) => name === "source")) {
  database.exec("ALTER TABLE reminders ADD COLUMN source TEXT NOT NULL DEFAULT 'dashboard'");
}
if (!reminderColumns.some(({ name }) => name === "created_by")) {
  database.exec("ALTER TABLE reminders ADD COLUMN created_by TEXT NOT NULL DEFAULT 'You'");
}

const starterReminder: Reminder = {
  id: "morning-medicine",
  title: "Morning medicine",
  time: "9:00 AM",
  context: "Take the blue medicine in the box, then take the small white medicine beside it.",
  contactId: "",
  recipientId: "",
  timeZone: process.env.CARELY_TIME_ZONE ?? Intl.DateTimeFormat().resolvedOptions().timeZone ?? "UTC",
  source: "dashboard",
  createdBy: "You",
};

function seedReminders(ownerEmail: string) {
  const result = database
    .prepare("INSERT OR IGNORE INTO reminder_owners (owner_email, seeded_at) VALUES (?, ?)")
    .run(ownerEmail, new Date().toISOString());
  if (result.changes === 0) return;

  database.prepare(`
    INSERT INTO reminders
      (owner_email, id, title, call_time, context, contact_id, recipient_id, time_zone, source, created_by, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    ownerEmail,
    starterReminder.id,
    starterReminder.title,
    starterReminder.time,
    starterReminder.context,
    starterReminder.contactId,
    starterReminder.recipientId,
    starterReminder.timeZone,
    starterReminder.source,
    starterReminder.createdBy,
    new Date().toISOString(),
  );
}

function toReminder(row: Record<string, unknown>): Reminder {
  return {
    id: String(row.id),
    title: String(row.title),
    time: String(row.call_time),
    context: String(row.context),
    contactId: String(row.contact_id ?? ""),
    recipientId: String(row.recipient_id ?? ""),
    timeZone: String(row.time_zone ?? "UTC"),
    source: row.source === "carely-call" ? "carely-call" : "dashboard",
    createdBy: String(row.created_by ?? "You"),
  };
}

export function listReminders(ownerEmail: string): Reminder[] {
  seedReminders(ownerEmail);
  return database
    .prepare(`
      SELECT id, title, call_time, context, contact_id, recipient_id, time_zone, source, created_by
      FROM reminders
      WHERE owner_email = ?
      ORDER BY created_at, id
    `)
    .all(ownerEmail)
    .map(toReminder);
}

export function insertReminder(
  ownerEmail: string,
  input: ReminderInput,
  attribution: Pick<Reminder, "createdBy" | "source"> = { createdBy: "You", source: "dashboard" },
): Reminder {
  seedReminders(ownerEmail);
  const reminder = { id: crypto.randomUUID(), ...input, ...attribution };
  database.prepare(`
    INSERT INTO reminders
      (owner_email, id, title, call_time, context, contact_id, recipient_id, time_zone, source, created_by, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    ownerEmail,
    reminder.id,
    reminder.title,
    reminder.time,
    reminder.context,
    reminder.contactId,
    reminder.recipientId,
    reminder.timeZone,
    reminder.source,
    reminder.createdBy,
    new Date().toISOString(),
  );
  return reminder;
}

export type ScheduledReminder = Reminder & {
  ownerEmail: string;
  phone: string;
};

export function listRemindersForScheduling(): ScheduledReminder[] {
  return database
    .prepare(`
      SELECT r.owner_email, r.id, r.title, r.call_time, r.context, r.contact_id,
        r.recipient_id, r.time_zone, r.source, r.created_by,
        COALESCE(NULLIF(cr.phone, ''), c.phone, '') AS phone
      FROM reminders r
      LEFT JOIN care_recipients cr
        ON cr.owner_email = r.owner_email AND cr.id = r.recipient_id
      LEFT JOIN contacts c
        ON c.owner_email = r.owner_email AND c.id = r.contact_id
      WHERE COALESCE(NULLIF(cr.phone, ''), c.phone, '') <> ''
    `)
    .all()
    .map((row) => ({
      ...toReminder(row),
      ownerEmail: String(row.owner_email),
      phone: String(row.phone),
    }));
}

export function claimReminderCall(ownerEmail: string, reminderId: string, localDate: string) {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const result = database.prepare(`
    INSERT OR IGNORE INTO reminder_calls
      (id, owner_email, reminder_id, local_date, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'calling', ?, ?)
  `).run(id, ownerEmail, reminderId, localDate, now, now);
  return result.changes === 1 ? id : null;
}

export function finishReminderCall(
  callId: string,
  status: "called" | "failed",
  providerCallId: string | null,
  error: string | null,
) {
  database.prepare(`
    UPDATE reminder_calls
    SET status = ?, provider_call_id = ?, error = ?, updated_at = ?
    WHERE id = ?
  `).run(status, providerCallId, error, new Date().toISOString(), callId);
}

export function getReminderCall(callId: string) {
  return database
    .prepare(`
      SELECT c.id, c.owner_email, c.reminder_id, r.title, r.context
      FROM reminder_calls c
      JOIN reminders r ON r.owner_email = c.owner_email AND r.id = c.reminder_id
      WHERE c.id = ?
    `)
    .get(callId) as { id: string; owner_email: string; reminder_id: string; title: string; context: string } | null;
}

export function saveReminderCallResponse(callId: string, response: string) {
  database.prepare(`
    UPDATE reminder_calls
    SET response = ?, updated_at = ?
    WHERE id = ?
  `).run(response, new Date().toISOString(), callId);
}

export function deleteReminder(ownerEmail: string, reminderId: string) {
  const result = database
    .prepare("DELETE FROM reminders WHERE owner_email = ? AND id = ?")
    .run(ownerEmail, reminderId);
  if (result.changes === 0) throw new Error("Reminder not found.");
  database
    .prepare("DELETE FROM reminder_calls WHERE owner_email = ? AND reminder_id = ?")
    .run(ownerEmail, reminderId);
}
