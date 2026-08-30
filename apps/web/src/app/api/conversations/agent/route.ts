// Accepts authenticated telephone transcripts and family briefs from the Carely API.
import { revalidatePath } from "next/cache";

import { isAgentAuthorized } from "@/lib/agent-secret";
import { normalizeConversationCapture } from "@/lib/conversation-data";
import { createConversationLog } from "@/lib/conversations-db";

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
  const callId = typeof body?.callId === "string" ? body.callId : "";
  const capture = normalizeConversationCapture(body);
  if (
    !ownerEmail ||
    ownerEmail.length > 320 ||
    !/^CA[A-Za-z0-9]{32}$/.test(callId) ||
    !capture ||
    capture.channel !== "phone"
  ) {
    return Response.json({ error: "The telephone conversation payload is invalid." }, { status: 400 });
  }

  const id = createConversationLog(ownerEmail, capture, callId);
  revalidatePath("/home");
  revalidatePath("/logs");
  return Response.json({ id }, { status: 201 });
}
