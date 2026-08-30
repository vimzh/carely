"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { getCareRecipient, getContact } from "@/lib/contacts-db";
import type { ReminderInput } from "@/lib/reminder";
import { validateReminder } from "@/lib/reminder";
import { deleteReminder as removeReminder, insertReminder } from "@/lib/reminders-db";

async function ownerEmail() {
  const session = await auth();
  return session?.user?.email?.trim().toLowerCase() ?? null;
}

export async function createReminder(input: ReminderInput) {
  const email = await ownerEmail();
  if (!email) return { ok: false as const, error: "You must be signed in." };

  let validated: ReminderInput;
  try {
    validated = validateReminder(input);
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Check the reminder details.",
    };
  }

  const target = validated.recipientId
    ? getCareRecipient(email, validated.recipientId)
    : getContact(email, validated.contactId);
  if (!target) return { ok: false as const, error: "Choose someone Carely should call." };
  if (!target.phone) {
    return { ok: false as const, error: `Add a phone number for ${target.name} in Contacts first.` };
  }

  try {
    const reminder = insertReminder(email, validated);
    revalidatePath("/reminders");
    return { ok: true as const, reminder };
  } catch (error) {
    console.error("Could not add reminder", error);
    return { ok: false as const, error: "Could not add the reminder. Try again." };
  }
}

export async function deleteReminder(reminderId: string) {
  const email = await ownerEmail();
  if (!email) return { ok: false as const, error: "You must be signed in." };
  if (!reminderId) return { ok: false as const, error: "Reminder not found." };

  try {
    removeReminder(email, reminderId);
    revalidatePath("/reminders");
    return { ok: true as const };
  } catch (error) {
    console.error("Could not delete reminder", error);
    return { ok: false as const, error: "Could not delete the reminder. Try again." };
  }
}
