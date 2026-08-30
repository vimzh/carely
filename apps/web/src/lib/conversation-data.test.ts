// Verifies that only bounded, server-scored conversation captures can be persisted.
import { expect, test } from "bun:test";

import { normalizeConversationCapture } from "@/lib/conversation-data";

const score = {
  total: 80,
  qualification: "qualified",
  metrics: Object.fromEntries(
    ["resolution", "accuracy", "clarity", "tone", "safety"].map((key) => [key, { score: 16, reason: "Clear and safe." }]),
  ),
  contextSuggestion: null,
};

test("accepts a complete grounded transcript", () => {
  const capture = normalizeConversationCapture({
    channel: "phone",
    transcript: [{ role: "user", text: "How do I use the TV?" }, { role: "assistant", text: "Press Input once." }],
    sources: ["TV remote guide"],
    actions: [],
    review: { summary: "Asked for TV help.", struggle: "Could not find Input.", score },
    reviewStatus: "complete",
  });
  expect(capture?.sources).toEqual(["TV remote guide"]);
});

test("rejects a forged or oversized capture", () => {
  expect(normalizeConversationCapture({
    channel: "phone",
    transcript: [{ role: "user", text: "x".repeat(4_001) }],
    sources: [],
    actions: [],
    review: null,
    reviewStatus: "failed",
  })).toBeNull();
});
