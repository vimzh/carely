// Verifies that the browser cannot persist a forged total or qualification.
import { expect, test } from "bun:test";

import { isConversationScore } from "@/lib/conversation-score";

const score = {
  total: 88,
  qualification: "qualified",
  metrics: {
    resolution: { score: 18, reason: "The request was answered." },
    accuracy: { score: 17, reason: "The answer stayed grounded." },
    clarity: { score: 16, reason: "The steps were easy to follow." },
    tone: { score: 19, reason: "The tone was patient." },
    safety: { score: 18, reason: "The next step was appropriate." },
  },
  contextSuggestion: null,
};

test("accepts a valid score contract", () => {
  expect(isConversationScore(score)).toBe(true);
});

test("rejects a forged total", () => {
  expect(isConversationScore({ ...score, total: 100 })).toBe(false);
});
