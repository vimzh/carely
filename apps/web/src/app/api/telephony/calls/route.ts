// Starts and finishes authenticated Twilio call activity for a resolved care recipient.
import { isAgentAuthorized } from "@/lib/agent-secret";
import { finishVoiceCallRecord, startVoiceCallRecord } from "@/lib/calls-db";
import { findCareRecipientByPhone } from "@/lib/contacts-db";

function isCallSid(value: unknown): value is string {
  return typeof value === "string" && /^CA[A-Za-z0-9]{32}$/.test(value);
}

function authorize(request: Request) {
  try {
    return isAgentAuthorized(request.headers.get("authorization"));
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Agent actions are not configured.");
    return null;
  }
}

export async function POST(request: Request) {
  const authorized = authorize(request);
  if (authorized === null) return Response.json({ error: "Agent actions are not configured." }, { status: 503 });
  if (!authorized) return Response.json({ error: "Unauthorized." }, { status: 401 });

  const body = await request.json().catch(() => null) as { callSid?: unknown; phone?: unknown } | null;
  if (typeof body?.phone !== "string" || !isCallSid(body.callSid)) {
    return Response.json({ error: "A valid caller phone number and call SID are required." }, { status: 400 });
  }

  try {
    const match = findCareRecipientByPhone(body.phone);
    if (!match) return Response.json({ error: "This caller is not linked to a care recipient." }, { status: 404 });
    startVoiceCallRecord(match.ownerEmail, body.callSid);
    return Response.json({
      ownerEmail: match.ownerEmail,
      recipientId: match.recipient.id,
      recipientName: match.recipient.name,
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Could not resolve this caller." },
      { status: 409 },
    );
  }
}

export async function PATCH(request: Request) {
  const authorized = authorize(request);
  if (authorized === null) return Response.json({ error: "Agent actions are not configured." }, { status: 503 });
  if (!authorized) return Response.json({ error: "Unauthorized." }, { status: 401 });

  const body = await request.json().catch(() => null) as { callSid?: unknown; ownerEmail?: unknown } | null;
  const ownerEmail = typeof body?.ownerEmail === "string" ? body.ownerEmail.trim().toLowerCase() : "";
  if (!ownerEmail || ownerEmail.length > 320 || !isCallSid(body?.callSid)) {
    return Response.json({ error: "A valid family owner and call SID are required." }, { status: 400 });
  }

  finishVoiceCallRecord(ownerEmail, body.callSid);
  return new Response(null, { status: 204 });
}
