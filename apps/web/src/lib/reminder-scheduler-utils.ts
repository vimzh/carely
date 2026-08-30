// Pure scheduling and TwiML helpers kept independent from the SQLite runtime.
import type { ScheduledReminder } from "@/lib/reminders-db";

function localDateTime(now: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return {
    date: `${values.year}-${values.month}-${values.day}`,
    hour: Number(values.hour),
    minute: Number(values.minute),
  };
}

function reminderTime(time: string) {
  const match = time.match(/^(\d{1,2}):(\d{2}) (AM|PM)$/);
  if (!match) return null;
  let hour = Number(match[1]);
  if (match[3] === "PM" && hour !== 12) hour += 12;
  if (match[3] === "AM" && hour === 12) hour = 0;
  return { hour, minute: Number(match[2]) };
}

export function localDateForReminder(reminder: Pick<ScheduledReminder, "timeZone">, now: Date) {
  return localDateTime(now, reminder.timeZone).date;
}

export function isReminderDue(reminder: Pick<ScheduledReminder, "time" | "timeZone">, now: Date) {
  const scheduled = reminderTime(reminder.time);
  if (!scheduled) return false;
  const current = localDateTime(now, reminder.timeZone);
  return current.hour === scheduled.hour && current.minute === scheduled.minute;
}

function escapeXml(value: string) {
  return value.replace(/[<>&'"]/g, (character) => ({
    "<": "&lt;",
    ">": "&gt;",
    "&": "&amp;",
    "'": "&apos;",
    '"': "&quot;",
  })[character]!);
}

export function buildReminderTwiML(
  reminder: Pick<ScheduledReminder, "title" | "context">,
  deliveryId: string,
  publicUrl: string | null,
) {
  const message = `Carely की तरफ से याद दिलाने के लिए फोन है: ${reminder.title}. ${reminder.context} पूरा होने पर हो गया कहिए। मदद चाहिए तो मदद कहिए।`;
  const say = (value: string) => `<Say language="hi-IN">${escapeXml(value)}</Say>`;
  if (!publicUrl) {
    return `<Response>${say(message)}</Response>`;
  }

  const actionUrl = new URL("/api/reminders/reply", publicUrl);
  actionUrl.searchParams.set("deliveryId", deliveryId);
  return `<Response><Gather input="speech" language="hi-IN" action="${escapeXml(actionUrl.toString())}" method="POST" speechTimeout="auto" timeout="8">${say(message)}</Gather>${say("मुझे जवाब सुनाई नहीं दिया। मदद चाहिए तो Carely को दोबारा फोन कीजिए।")}</Response>`;
}
