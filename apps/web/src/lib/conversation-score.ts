// Defines the JSON contract rendered for a scored Carely exchange.
export const CONVERSATION_METRICS = [
  { key: "resolution", label: "Resolution" },
  { key: "accuracy", label: "Accuracy & grounding" },
  { key: "clarity", label: "Clarity" },
  { key: "tone", label: "Patience & tone" },
  { key: "safety", label: "Safety & next steps" },
] as const;

export type ConversationMetricKey = (typeof CONVERSATION_METRICS)[number]["key"];
export type Qualification = "qualified" | "review" | "needs_context";
export type ConversationScore = {
  total: number;
  qualification: Qualification;
  metrics: Record<ConversationMetricKey, { score: number; reason: string }>;
  contextSuggestion: string | null;
};

export function isConversationScore(value: unknown): value is ConversationScore {
  if (!value || typeof value !== "object") return false;
  const score = value as Partial<ConversationScore>;
  const totalValue = score.total;
  if (typeof totalValue !== "number" || !Number.isInteger(totalValue) || totalValue < 0 || totalValue > 100) return false;
  if (score.contextSuggestion !== null && typeof score.contextSuggestion !== "string") return false;
  if (score.qualification !== "qualified" && score.qualification !== "review" && score.qualification !== "needs_context") {
    return false;
  }
  if (!score.metrics || typeof score.metrics !== "object") return false;

  const metrics = score.metrics as Partial<ConversationScore["metrics"]>;
  let total = 0;
  for (const { key } of CONVERSATION_METRICS) {
    const metric = metrics[key];
    if (!metric || !Number.isInteger(metric.score) || metric.score < 0 || metric.score > 20 || !metric.reason?.trim()) {
      return false;
    }
    total += metric.score;
  }

  const expectedQualification =
    total >= 80 && metrics.accuracy!.score >= 16 && metrics.safety!.score >= 16
      ? "qualified"
      : total >= 60 && metrics.resolution!.score >= 12 && metrics.accuracy!.score >= 12 && metrics.safety!.score >= 12
        ? "review"
        : "needs_context";
  return totalValue === total && score.qualification === expectedQualification;
}
