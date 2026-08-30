// Synchronizes SQLite care-recipient profiles into the owner's Gemini File Search store.
import type { CareRecipient } from "@/lib/contact";
import { requireAgentSecret } from "@/lib/agent-secret";
import { careRecipientMemoryHash } from "@/lib/care-recipient-memory-hash";
import {
  listCareRecipientsNeedingMemorySync,
  markCareRecipientMemorySynced,
} from "@/lib/contacts-db";

const apiUrl = (process.env.CARELY_API_URL ?? "http://localhost:3001").replace(/\/$/, "");

export async function syncCareRecipientMemory(ownerEmail: string, recipient: CareRecipient) {
  const response = await fetch(`${apiUrl}/context/recipient`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${requireAgentSecret()}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      ownerEmail,
      recipientId: recipient.id,
      name: recipient.name,
      relationship: recipient.relationship,
      address: recipient.address,
      latitude: recipient.latitude,
      longitude: recipient.longitude,
      likes: recipient.likes,
      dislikes: recipient.dislikes,
      instructions: recipient.instructions,
    }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(
      body && typeof body === "object" && "error" in body && typeof body.error === "string"
        ? body.error
        : `Carely API returned ${response.status}.`,
    );
  }
  return careRecipientMemoryHash(recipient);
}

export async function syncPendingCareRecipientMemory(ownerEmail: string) {
  for (const recipient of listCareRecipientsNeedingMemorySync(ownerEmail)) {
    const memoryHash = await syncCareRecipientMemory(ownerEmail, recipient);
    markCareRecipientMemorySynced(ownerEmail, recipient.id, memoryHash);
  }
}
