// Defines and validates the conversation payload shared by chat, voice, and logs.
import { isConversationScore, type ConversationScore } from "@/lib/conversation-score";

export type ConversationChannel = "browser_voice" | "demo" | "phone" | "text";
export type TranscriptEntry = { role: "assistant" | "user"; text: string };
export type ConversationAction = { type: "reminder"; summary: string; status: "completed" };
export type ConversationReview = {
  summary: string;
  struggle: string;
  score: ConversationScore;
};
export type ConversationCapture = {
  channel: Exclude<ConversationChannel, "demo">;
  transcript: TranscriptEntry[];
  sources: string[];
  actions: ConversationAction[];
  review: ConversationReview | null;
  reviewStatus: "complete" | "failed";
};

function shortText(value: unknown, maxLength: number) {
  return typeof value === "string" && value.trim() && value.length <= maxLength ? value.trim() : null;
}

export function normalizeConversationCapture(value: unknown): ConversationCapture | null {
  if (!value || typeof value !== "object") return null;
  const input = value as Record<string, unknown>;
  if (input.channel !== "text" && input.channel !== "browser_voice" && input.channel !== "phone") return null;
  if (!Array.isArray(input.transcript) || input.transcript.length < 1 || input.transcript.length > 100) return null;

  let totalLength = 0;
  const transcript: TranscriptEntry[] = [];
  for (const entry of input.transcript) {
    if (!entry || typeof entry !== "object") return null;
    const { role, text } = entry as Record<string, unknown>;
    const clean = shortText(text, 4_000);
    if ((role !== "user" && role !== "assistant") || !clean) return null;
    totalLength += clean.length;
    if (totalLength > 40_000) return null;
    transcript.push({ role, text: clean });
  }

  if (!Array.isArray(input.sources) || input.sources.length > 10) return null;
  const sources = input.sources.map((source) => shortText(source, 200));
  if (sources.some((source) => source === null)) return null;
  if (!Array.isArray(input.actions) || input.actions.length > 10) return null;
  const actions: ConversationAction[] = [];
  for (const action of input.actions) {
    if (!action || typeof action !== "object") return null;
    const record = action as Record<string, unknown>;
    const summary = shortText(record.summary, 300);
    if (record.type !== "reminder" || record.status !== "completed" || !summary) return null;
    actions.push({ type: "reminder", status: "completed", summary });
  }

  let review: ConversationReview | null = null;
  if (input.review !== null) {
    if (!input.review || typeof input.review !== "object") return null;
    const record = input.review as Record<string, unknown>;
    const summary = shortText(record.summary, 400);
    const struggle = shortText(record.struggle, 300);
    if (!summary || !struggle || !isConversationScore(record.score)) return null;
    review = { summary, struggle, score: record.score };
  }
  const reviewStatus = input.reviewStatus;
  if ((reviewStatus !== "complete" && reviewStatus !== "failed") || (reviewStatus === "complete") !== Boolean(review)) {
    return null;
  }

  return {
    channel: input.channel,
    transcript,
    sources: [...new Set(sources as string[])],
    actions,
    review,
    reviewStatus,
  };
}
