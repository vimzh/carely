import { createHash } from "node:crypto";

import type { CareRecipient } from "@/lib/contact";

export function careRecipientMemoryHash(recipient: Pick<CareRecipient, "name" | "relationship" | "address" | "latitude" | "longitude" | "likes" | "dislikes" | "instructions">) {
  return createHash("sha256").update(JSON.stringify([
    recipient.name,
    recipient.relationship,
    recipient.address,
    recipient.latitude,
    recipient.longitude,
    recipient.likes,
    recipient.dislikes,
    recipient.instructions,
  ])).digest("hex");
}
