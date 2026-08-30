// Accepts authenticated reminder writes from the Carely ADK agent.
import { revalidatePath } from "next/cache";

import { isAgentAuthorized } from "@/lib/agent-secret";
import { findCareRecipientByName } from "@/lib/contacts-db";
import { validateReminder } from "@/lib/reminder";
import { insertReminder } from "@/lib/reminders-db";

export async function POST(request: Request) {
  try {
    if (!isAgentAuthorized(request.headers.get("authorization"))) {
      return Response.json({ error: "Unauthorized." }, { status: 401 });
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Agent actions are not configured.");
    return Response.json({ error: "Agent actions are not configured." }, { status: 503 });
  }

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const ownerEmail = typeof body?.ownerEmail === "string" ? body.ownerEmail.trim().toLowerCase() : "";
  const recipientName = typeof body?.recipientName === "string" ? body.recipientName.trim() : "";
  if (!ownerEmail || ownerEmail.length > 320 || !recipientName || recipientName.length > 80) {
    return Response.json({ error: "The family account or reminder recipient is invalid." }, { status: 400 });
  }

  const recipient = findCareRecipientByName(ownerEmail, recipientName);
  if (!recipient) {
    return Response.json({ error: `No care recipient named ${recipientName} was found.` }, { status: 404 });
  }
  if (!recipient.phone) {
    return Response.json({ error: `${recipient.name} needs a phone number in Contacts first.` }, { status: 409 });
  }

  try {
    const reminder = insertReminder(
      ownerEmail,
      validateReminder({
        title: typeof body?.title === "string" ? body.title : "",
        time: typeof body?.time === "string" ? body.time : "",
        context: typeof body?.context === "string" ? body.context : "",
        contactId: "",
        recipientId: recipient.id,
        timeZone: process.env.CARELY_TIME_ZONE
          ?? Intl.DateTimeFormat().resolvedOptions().timeZone
          ?? "UTC",
      }),
      { source: "carely-call", createdBy: recipient.name },
    );
    revalidatePath("/reminders");
    return Response.json({ reminder }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save the reminder.";
    return Response.json({ error: message }, { status: 400 });
  }
}
