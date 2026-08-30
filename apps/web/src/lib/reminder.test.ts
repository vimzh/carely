import { describe, expect, test } from "bun:test";

import { validateReminder } from "@/lib/reminder";
import { buildReminderTwiML, isReminderDue } from "@/lib/reminder-scheduler-utils";

describe("reminder validation", () => {
  test("trims a valid reminder and rejects invalid times", () => {
    expect(validateReminder({
      title: "  Morning medicine  ",
      time: "9:15 am",
      context: "  Take the blue medicine.  ",
      contactId: "",
      recipientId: "grandfather",
      timeZone: "Asia/Kolkata",
    })).toEqual({
      title: "Morning medicine",
      time: "9:15 AM",
      context: "Take the blue medicine.",
      contactId: "",
      recipientId: "grandfather",
      timeZone: "Asia/Kolkata",
    });

    expect(() => validateReminder({
      title: "Medicine",
      time: "21:00",
      context: "Take the medicine.",
      contactId: "mom",
      recipientId: "",
      timeZone: "Asia/Kolkata",
    })).toThrow("valid reminder time");
  });

  test("matches a daily reminder in its saved time zone and escapes call context", () => {
    expect(isReminderDue(
      { time: "9:00 PM", timeZone: "Asia/Kolkata" },
      new Date("2026-08-24T15:30:00.000Z"),
    )).toBe(true);
    const twiml = buildReminderTwiML(
      { title: "Evening medicine", context: "Take <one> & rest." },
      "delivery-id",
      null,
    );
    expect(twiml).toContain("Take &lt;one&gt; &amp; rest.");
    expect(twiml).toContain('language="hi-IN"');
    expect(twiml).toContain("मदद चाहिए तो मदद कहिए");
  });
});
