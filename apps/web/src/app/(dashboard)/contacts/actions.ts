"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { syncCareRecipientMemory } from "@/lib/care-recipient-memory";
import type { CareRecipientInput, ContactInput } from "@/lib/contact";
import { validateCareRecipient, validateContact, validateContactUpdate } from "@/lib/contact";
import {
  deleteContact as removeContact,
  getCareRecipient,
  insertCareRecipient,
  insertContact,
  patchCareRecipient,
  patchContact,
} from "@/lib/contacts-db";

async function ownerEmail() {
  const session = await auth();
  return session?.user?.email?.trim().toLowerCase() ?? null;
}

export async function createContact(input: ContactInput) {
  const email = await ownerEmail();
  if (!email) return { ok: false as const, error: "You must be signed in." };

  let validated: ContactInput;
  try {
    validated = validateContact(input);
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : "Check the contact details." };
  }

  try {
    const contact = insertContact(email, validated);
    revalidatePath("/contacts");
    return { ok: true as const, contact };
  } catch (error) {
    console.error("Could not add contact", error);
    return { ok: false as const, error: "Could not add the contact. Try again." };
  }
}

export async function updateContact(contactId: string, updates: Partial<ContactInput>) {
  const email = await ownerEmail();
  if (!email) return { ok: false as const, error: "You must be signed in." };
  if (!contactId) return { ok: false as const, error: "Contact not found." };

  let validated: Partial<ContactInput>;
  try {
    validated = validateContactUpdate(updates);
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : "Check the contact details." };
  }

  try {
    const contact = patchContact(email, contactId, validated);
    revalidatePath("/contacts");
    return { ok: true as const, contact };
  } catch (error) {
    console.error("Could not update contact", error);
    return { ok: false as const, error: "Could not update the contact. Try again." };
  }
}

export async function deleteContact(contactId: string) {
  const email = await ownerEmail();
  if (!email) return { ok: false as const, error: "You must be signed in." };
  if (!contactId || contactId.length > 80) return { ok: false as const, error: "Contact not found." };

  try {
    removeContact(email, contactId);
    revalidatePath("/contacts");
    return { ok: true as const };
  } catch (error) {
    console.error("Could not delete contact", error);
    return { ok: false as const, error: "Could not delete the contact. Try again." };
  }
}

export async function createCareRecipient(input: CareRecipientInput) {
  const email = await ownerEmail();
  if (!email) return { ok: false as const, error: "You must be signed in." };

  let validated: CareRecipientInput;
  try {
    validated = validateCareRecipient(input);
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : "Check the profile details." };
  }

  try {
    const recipient = { id: crypto.randomUUID(), ...validated };
    const memoryHash = await syncCareRecipientMemory(email, recipient);
    insertCareRecipient(email, validated, recipient.id, memoryHash);
    revalidatePath("/contacts");
    return { ok: true as const, recipient };
  } catch (error) {
    console.error("Could not add care recipient", error);
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Could not add this person. Try again.",
    };
  }
}

export async function updateCareRecipient(recipientId: string, input: CareRecipientInput) {
  const email = await ownerEmail();
  if (!email) return { ok: false as const, error: "You must be signed in." };
  if (!recipientId) return { ok: false as const, error: "Care recipient not found." };

  let validated: CareRecipientInput;
  try {
    validated = validateCareRecipient(input);
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : "Check the profile details." };
  }

  try {
    if (!getCareRecipient(email, recipientId)) {
      return { ok: false as const, error: "Care recipient not found." };
    }
    const recipient = { id: recipientId, ...validated };
    const memoryHash = await syncCareRecipientMemory(email, recipient);
    patchCareRecipient(email, recipientId, validated, memoryHash);
    revalidatePath("/contacts");
    return { ok: true as const, recipient };
  } catch (error) {
    console.error("Could not update care recipient", error);
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Could not save this profile. Try again.",
    };
  }
}
