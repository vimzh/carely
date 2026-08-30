export type Reminder = {
  id: string;
  title: string;
  time: string;
  context: string;
  contactId: string;
  recipientId: string;
  timeZone: string;
  source: "carely-call" | "dashboard";
  createdBy: string;
};

export type ReminderInput = Omit<Reminder, "createdBy" | "id" | "source">;

export function validateReminder(input: ReminderInput): ReminderInput {
  const reminder = {
    title: input.title.trim(),
    time: input.time.trim().toUpperCase(),
    context: input.context.trim(),
    contactId: input.contactId.trim(),
    recipientId: input.recipientId.trim(),
    timeZone: input.timeZone.trim(),
  };

  if (!reminder.title || reminder.title.length > 160) {
    throw new Error("Add a reminder name of 160 characters or fewer.");
  }
  if (!/^(?:[1-9]|1[0-2]):[0-5]\d (?:AM|PM)$/.test(reminder.time)) {
    throw new Error("Choose a valid reminder time.");
  }
  if (!reminder.context || reminder.context.length > 2_000) {
    throw new Error("Add what Carely should say in 2,000 characters or fewer.");
  }
  if (!reminder.contactId && !reminder.recipientId) {
    throw new Error("Choose who Carely should call.");
  }
  if (reminder.contactId && reminder.recipientId) throw new Error("Choose one person for this reminder.");
  if (!reminder.timeZone || reminder.timeZone.length > 100) {
    throw new Error("Choose a valid time zone.");
  }
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: reminder.timeZone }).format();
  } catch {
    throw new Error("Choose a valid time zone.");
  }

  return reminder;
}
