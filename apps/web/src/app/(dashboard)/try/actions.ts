"use server";

import { auth } from "@/auth";
import { requireAgentSecret } from "@/lib/agent-secret";
import { finishVoiceCallRecord, startVoiceCallRecord } from "@/lib/calls-db";
import { normalizeConversationCapture } from "@/lib/conversation-data";
import { createConversationLog } from "@/lib/conversations-db";
import { listGuides } from "@/lib/guides-db";

const apiUrl = (process.env.CARELY_API_URL ?? "http://localhost:3001").replace(/\/$/, "");
const publicApiUrl = (process.env.NEXT_PUBLIC_CARELY_API_URL ?? apiUrl).replace(/\/$/, "");

async function getOwnerKey() {
  const user = (await auth())?.user;
  if (!user) return null;
  return user.email?.trim().toLowerCase() || user.name?.trim() || "carely-user";
}

async function responseError(response: Response) {
  const body = await response.json().catch(() => null);
  return body && typeof body === "object" && "error" in body && typeof body.error === "string"
    ? body.error
    : `Carely API returned ${response.status}.`;
}

export async function sendAgentMessage(input: {
  message: string;
  sessionId: string;
  transcript: Array<{ role: "assistant" | "user"; text: string }>;
}) {
  const ownerEmail = await getOwnerKey();
  if (!ownerEmail) return { ok: false as const, error: "You must be signed in." };

  try {
    const secret = requireAgentSecret();
    const response = await fetch(`${apiUrl}/agent/message`, {
      method: "POST",
      headers: { authorization: `Bearer ${secret}`, "content-type": "application/json" },
      body: JSON.stringify({
        ...input,
        ownerEmail,
        guides: listGuides(ownerEmail).slice(-8).reverse().map((guide) => ({
          title: guide.title,
          record: [
            guide.note ? `Family note: ${guide.note}` : "",
            guide.context ? `Written instructions:\n${guide.context}` : "",
          ].filter(Boolean).join("\n\n").slice(0, 4_000),
        })),
      }),
    });
    if (!response.ok) return { ok: false as const, error: await responseError(response) };
    const body = (await response.json()) as Record<string, unknown>;
    if (typeof body.response !== "string" || !body.response.trim()) {
      throw new Error("Carely API returned no answer.");
    }
    const answer = body.response.trim();
    createConversationLog(ownerEmail, {
      channel: "text",
      transcript: [...input.transcript, { role: "assistant", text: answer }],
      sources: body.sources,
      actions: body.actions,
      review: body.review,
      reviewStatus: body.reviewStatus,
    }, input.sessionId);
    return { ok: true as const, response: answer };
  } catch (error) {
    console.error("Could not chat with Carely", error);
    return { ok: false as const, error: "Carely could not answer. Check that the API is running." };
  }
}

export async function startVoiceCall() {
  const ownerEmail = await getOwnerKey();
  if (!ownerEmail) return { ok: false as const, error: "You must be signed in." };

  try {
    const secret = requireAgentSecret();
    const response = await fetch(`${apiUrl}/agent/session`, {
      method: "POST",
      headers: { authorization: `Bearer ${secret}`, "content-type": "application/json" },
      body: JSON.stringify({ ownerEmail }),
    });
    if (!response.ok) return { ok: false as const, error: await responseError(response) };
    const body = await response.json() as { sessionId?: unknown };
    if (typeof body.sessionId !== "string") throw new Error("Carely API returned no voice session.");

    const callId = startVoiceCallRecord(ownerEmail);
    const websocketUrl = publicApiUrl.replace(/^http/, "ws");
    return {
      ok: true as const,
      callId,
      websocketUrl: `${websocketUrl}/agent/voice?sessionId=${encodeURIComponent(body.sessionId)}`,
    };
  } catch (error) {
    console.error("Could not start Carely voice session", error);
    return { ok: false as const, error: "Voice reminder actions are not configured." };
  }
}

export async function finishVoiceCall(callId: string, conversation: {
  transcript: Array<{ role: "assistant" | "user"; text: string }>;
  sources: string[];
  actions: Array<{ type: "reminder"; summary: string; status: "completed" }>;
}) {
  const ownerEmail = await getOwnerKey();
  if (!ownerEmail) return { ok: false as const, error: "You must be signed in." };
  if (!/^[0-9a-f-]{36}$/i.test(callId)) return { ok: false as const, error: "Invalid call ID." };

  finishVoiceCallRecord(ownerEmail, callId);
  if (!conversation.transcript.length) return { ok: true as const };

  let review: unknown = null;
  let reviewStatus: "complete" | "failed" = "failed";
  try {
    const secret = requireAgentSecret();
    const response = await fetch(`${apiUrl}/agent/review`, {
      method: "POST",
      headers: { authorization: `Bearer ${secret}`, "content-type": "application/json" },
      body: JSON.stringify(conversation),
    });
    if (response.ok) {
      const body = await response.json() as { review?: unknown; reviewStatus?: unknown };
      review = body.review ?? null;
      reviewStatus = body.reviewStatus === "complete" ? "complete" : "failed";
    } else {
      console.error("Could not review Carely voice transcript", await responseError(response));
    }
  } catch (error) {
    console.error("Could not review Carely voice transcript", error);
  }

  const capture = normalizeConversationCapture({
    channel: "browser_voice",
    ...conversation,
    review,
    reviewStatus,
  });
  if (!capture) return { ok: false as const, error: "The voice transcript was invalid." };
  createConversationLog(ownerEmail, capture);
  return { ok: true as const };
}
