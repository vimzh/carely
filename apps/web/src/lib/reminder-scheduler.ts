// Runs daily reminder calls from the Next.js server when Twilio is configured.
import "@/lib/contacts-db";

import {
  claimReminderCall,
  finishReminderCall,
  listRemindersForScheduling,
} from "@/lib/reminders-db";
import type { ScheduledReminder } from "@/lib/reminders-db";
import { buildReminderTwiML, isReminderDue, localDateForReminder } from "@/lib/reminder-scheduler-utils";

const CHECK_INTERVAL_MS = 30_000;
const schedulerState = globalThis as typeof globalThis & {
  carelyReminderScheduler?: ReturnType<typeof setInterval>;
};

type CallingConfig = {
  accountSid: string;
  authToken: string;
  fromNumber: string;
  publicUrl: string | null;
};

function getCallingConfig(): CallingConfig | null {
  if (process.env.CARELY_REMINDER_SCHEDULER_ENABLED !== "true") return null;

  const missing = [
    ["TWILIO_ACCOUNT_SID", process.env.TWILIO_ACCOUNT_SID],
    ["TWILIO_AUTH_TOKEN", process.env.TWILIO_AUTH_TOKEN],
    ["TWILIO_FROM_NUMBER", process.env.TWILIO_FROM_NUMBER],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name);
  if (missing.length > 0) {
    throw new Error(`Reminder scheduler is enabled but missing ${missing.join(", ")}.`);
  }

  return {
    accountSid: process.env.TWILIO_ACCOUNT_SID!,
    authToken: process.env.TWILIO_AUTH_TOKEN!,
    fromNumber: process.env.TWILIO_FROM_NUMBER!,
    publicUrl: process.env.CARELY_PUBLIC_URL?.replace(/\/$/, "") || null,
  };
}

export function isReminderCallingConfigured() {
  return Boolean(
    process.env.CARELY_REMINDER_SCHEDULER_ENABLED === "true" &&
      process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_FROM_NUMBER,
  );
}

async function placeTwilioCall(reminder: ScheduledReminder, deliveryId: string, config: CallingConfig) {
  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(config.accountSid)}/Calls.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${config.accountSid}:${config.authToken}`).toString("base64")}`,
        "content-type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: reminder.phone,
        From: config.fromNumber,
        Twiml: buildReminderTwiML(reminder, deliveryId, config.publicUrl),
      }),
    },
  );
  const body = await response.json().catch(() => null) as { sid?: unknown } | null;
  if (!response.ok || typeof body?.sid !== "string") {
    throw new Error(`Twilio could not start the reminder call (${response.status}).`);
  }
  return body.sid;
}

export async function dispatchDueReminders(now = new Date()) {
  const config = getCallingConfig();
  if (!config) return;

  for (const reminder of listRemindersForScheduling()) {
    if (!isReminderDue(reminder, now)) continue;
    const localDate = localDateForReminder(reminder, now);
    const deliveryId = claimReminderCall(reminder.ownerEmail, reminder.id, localDate);
    if (!deliveryId) continue;

    try {
      const providerCallId = await placeTwilioCall(reminder, deliveryId, config);
      finishReminderCall(deliveryId, "called", providerCallId, null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown reminder call error.";
      finishReminderCall(deliveryId, "failed", null, message);
      console.error(`Reminder call failed for ${reminder.id}: ${message}`);
    }
  }
}

export function startReminderScheduler() {
  if (schedulerState.carelyReminderScheduler) return;
  if (process.env.CARELY_REMINDER_SCHEDULER_ENABLED !== "true") return;

  try {
    getCallingConfig();
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Reminder scheduler is not configured.");
    return;
  }

  void dispatchDueReminders();
  schedulerState.carelyReminderScheduler = setInterval(() => {
    void dispatchDueReminders().catch((error) => console.error("Reminder scheduler failed", error));
  }, CHECK_INTERVAL_MS);
}
