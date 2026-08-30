// Persists text-agent exchanges and their server-generated quality breakdown.
import { database } from "@/lib/database";
import {
  normalizeConversationCapture,
  type ConversationAction,
  type ConversationChannel,
  type TranscriptEntry,
} from "@/lib/conversation-data";
import { isConversationScore, type ConversationScore } from "@/lib/conversation-score";

database.exec(`
  CREATE TABLE IF NOT EXISTS conversation_logs (
    owner_email TEXT NOT NULL,
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    score_json TEXT NOT NULL
  ) STRICT;

  CREATE TABLE IF NOT EXISTS conversation_log_owners (
    owner_email TEXT PRIMARY KEY,
    seeded_at TEXT NOT NULL
  ) STRICT;
`);

const conversationColumns = new Set(
  (database.prepare("PRAGMA table_info(conversation_logs)").all() as Array<{ name: string }>).map(({ name }) => name),
);
const conversationMigrations = [
  ["channel", "TEXT NOT NULL DEFAULT 'demo'"],
  ["transcript_json", "TEXT NOT NULL DEFAULT '[]'"],
  ["summary", "TEXT NOT NULL DEFAULT ''"],
  ["struggle", "TEXT NOT NULL DEFAULT ''"],
  ["sources_json", "TEXT NOT NULL DEFAULT '[]'"],
  ["actions_json", "TEXT NOT NULL DEFAULT '[]'"],
  ["review_status", "TEXT NOT NULL DEFAULT 'complete'"],
  ["call_id", "TEXT"],
] as const;
for (const [name, definition] of conversationMigrations) {
  if (!conversationColumns.has(name)) database.exec(`ALTER TABLE conversation_logs ADD COLUMN ${name} ${definition}`);
}

export type ConversationLogRecord = {
  id: string;
  createdAt: string;
  question: string;
  topic: string;
  summary: string;
  detail: string;
  experience: "Helpful" | "Needs follow-up" | "Review unavailable";
  channel: ConversationChannel;
  transcript: TranscriptEntry[];
  struggle: string;
  sources: string[];
  actions: ConversationAction[];
  reviewStatus: "complete" | "failed";
  score: ConversationScore | null;
};

type StarterConversation = {
  id: string;
  createdAt: string;
  question: string;
  answer: string;
  score: ConversationScore;
};

const metric = (score: number, reason: string) => ({ score, reason });

function starterScore(
  metrics: ConversationScore["metrics"],
  contextSuggestion: string | null,
): ConversationScore {
  const total = Object.values(metrics).reduce((sum, result) => sum + result.score, 0);
  const qualification =
    total >= 80 && metrics.accuracy.score >= 16 && metrics.safety.score >= 16
      ? "qualified"
      : total >= 60 && metrics.resolution.score >= 12 && metrics.accuracy.score >= 12 && metrics.safety.score >= 12
        ? "review"
        : "needs_context";
  return { total, qualification, metrics, contextSuggestion };
}

const starterConversations: StarterConversation[] = [
  {
    id: "morning-medicine",
    createdAt: "2026-08-24T09:00:00.000Z",
    question: "Which medicine should I take first this morning?",
    answer: "Take the blue medicine in the box first, then take the small white medicine beside it. If either one looks different from usual, please wait and check with your family.",
    score: starterScore(
      {
        resolution: metric(19, "The order was answered directly."),
        accuracy: metric(18, "The answer used the saved medicine description."),
        clarity: metric(18, "The order was given in two simple steps."),
        tone: metric(19, "The wording was calm and respectful."),
        safety: metric(18, "It included a sensible check if the medicine looked different."),
      },
      null,
    ),
  },
  {
    id: "tv-instructions",
    createdAt: "2026-08-23T20:30:00.000Z",
    question: "How do I get back to the regular TV channel?",
    answer: "Press the Input button once, then choose TV from the list. If the screen still looks wrong, tell me what you see and we can try one step at a time.",
    score: starterScore(
      {
        resolution: metric(13, "The answer gave a plausible first step but did not confirm the remote."),
        accuracy: metric(11, "The remote controls were not specific enough to verify the button."),
        clarity: metric(14, "The instructions were short and sequential."),
        tone: metric(16, "The answer invited another attempt without blame."),
        safety: metric(14, "It asked for the visible screen state before continuing."),
      },
      "Add the TV remote brand and the button your parent uses to return to regular channels.",
    ),
  },
  {
    id: "family-visit",
    createdAt: "2026-08-22T11:15:00.000Z",
    question: "When is the family coming to visit next?",
    answer: "Your family is planning to visit on Saturday afternoon. I can remind you again that morning if you would like.",
    score: starterScore(
      {
        resolution: metric(20, "The visit timing was answered and a follow-up was offered."),
        accuracy: metric(19, "The response matched the saved visit detail."),
        clarity: metric(19, "The answer was concise and easy to understand."),
        tone: metric(19, "The tone was warm without being distracting."),
        safety: metric(18, "The optional reminder was an appropriate next step."),
      },
      null,
    ),
  },
  {
    id: "evening-medicine",
    createdAt: "2026-08-21T19:45:00.000Z",
    question: "Is this small white tablet the one I take in the evening?",
    answer: "I cannot identify a tablet safely from its color and size alone. Please do not take it until a family member or pharmacist confirms the name and dose.",
    score: starterScore(
      {
        resolution: metric(10, "It could not identify the medicine, but it prevented an unsafe guess."),
        accuracy: metric(9, "The available description was not enough to verify the tablet."),
        clarity: metric(14, "The safety instruction was direct."),
        tone: metric(16, "The answer was careful and non-judgmental."),
        safety: metric(12, "It gave an appropriate escalation, but could name an urgent symptom path."),
      },
      "Add the medicine name, dose, and where it is kept so Carely can explain it more clearly next time.",
    ),
  },
  {
    id: "weather-walk",
    createdAt: "2026-08-20T10:00:00.000Z",
    question: "Is it safe for me to go for a walk outside?",
    answer: "The weather looks suitable for a short walk. Take your phone, wear comfortable shoes, and let someone know where you are going before you leave.",
    score: starterScore(
      {
        resolution: metric(17, "The question was answered with a practical plan."),
        accuracy: metric(17, "The answer stayed within the available weather context."),
        clarity: metric(18, "The precautions were presented as a short list."),
        tone: metric(19, "The answer was encouraging and respectful."),
        safety: metric(18, "It included sensible preparation and check-in guidance."),
      },
      null,
    ),
  },
  {
    id: "phone-ringer",
    createdAt: "2026-08-19T18:20:00.000Z",
    question: "How do I turn the phone ringer back on?",
    answer: "Press the volume-up button on the side of the phone a few times. When the volume symbol appears, make sure the bell is not crossed out, then ask someone to call and test it.",
    score: starterScore(
      {
        resolution: metric(19, "The ringer problem was addressed with a test step."),
        accuracy: metric(18, "The instructions fit the saved phone setup."),
        clarity: metric(19, "The steps used familiar controls and a clear check."),
        tone: metric(19, "The answer was patient and reassuring."),
        safety: metric(19, "Testing the ringer was a useful next step."),
      },
      null,
    ),
  },
  {
    id: "clinic-appointment",
    createdAt: "2026-08-18T08:10:00.000Z",
    question: "What time is my clinic appointment, and where is the clinic?",
    answer: "Your appointment is Thursday at 10:30 AM. I do not have the clinic address saved yet, so please ask your family before leaving for the appointment.",
    score: starterScore(
      {
        resolution: metric(14, "The time was answered, but the location was incomplete."),
        accuracy: metric(12, "The saved appointment time was used, while the missing address was acknowledged."),
        clarity: metric(15, "The answer clearly separated known and missing details."),
        tone: metric(17, "The answer was calm and helpful."),
        safety: metric(14, "It advised checking before travel, but could offer a stronger reminder."),
      },
      "Add the clinic address and a nearby landmark so Carely can give complete directions next time.",
    ),
  },
];

function seedConversationLogs(ownerEmail: string) {
  const count = database
    .prepare("SELECT COUNT(*) AS count FROM conversation_logs WHERE owner_email = ?")
    .get(ownerEmail) as { count: number };
  if (Number(count.count) > 0) return;

  const result = database
    .prepare("INSERT OR IGNORE INTO conversation_log_owners (owner_email, seeded_at) VALUES (?, ?)")
    .run(ownerEmail, new Date().toISOString());
  if (result.changes === 0) return;

  const insert = database.prepare(`
    INSERT INTO conversation_logs (owner_email, id, created_at, question, answer, score_json)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  database.exec("BEGIN");
  try {
    for (const conversation of starterConversations) {
      insert.run(
        ownerEmail,
        conversation.id,
        conversation.createdAt,
        conversation.question,
        conversation.answer,
        JSON.stringify(conversation.score),
      );
    }
    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    database.prepare("DELETE FROM conversation_log_owners WHERE owner_email = ?").run(ownerEmail);
    throw error;
  }
}

function summaryFor(answer: string) {
  const summary = answer.replace(/\s+/g, " ").trim();
  return summary.length > 140 ? `${summary.slice(0, 137)}…` : summary;
}

export function createConversationLog(ownerEmail: string, value: unknown, callId: string | null = null) {
  const capture = normalizeConversationCapture(value);
  if (!capture) throw new Error("Conversation log payload is invalid");
  const question = capture.transcript.find(({ role }) => role === "user")?.text ?? "Voice conversation";
  const answer = [...capture.transcript].reverse().find(({ role }) => role === "assistant")?.text ?? "";
  const existing = callId
    ? database.prepare("SELECT id FROM conversation_logs WHERE owner_email = ? AND call_id = ?").get(ownerEmail, callId) as { id: string } | null
    : null;
  const id = existing?.id ?? crypto.randomUUID();
  if (existing) {
    database.prepare(
      `UPDATE conversation_logs SET
        created_at = ?, question = ?, answer = ?, score_json = ?, channel = ?, transcript_json = ?,
        summary = ?, struggle = ?, sources_json = ?, actions_json = ?, review_status = ?
       WHERE owner_email = ? AND id = ?`,
    ).run(
      new Date().toISOString(),
      question,
      answer,
      JSON.stringify(capture.review?.score ?? null),
      capture.channel,
      JSON.stringify(capture.transcript),
      capture.review?.summary ?? summaryFor(answer || question),
      capture.review?.struggle ?? "Review unavailable.",
      JSON.stringify(capture.sources),
      JSON.stringify(capture.actions),
      capture.reviewStatus,
      ownerEmail,
      id,
    );
    return id;
  }
  database
    .prepare(
      `INSERT INTO conversation_logs (
        owner_email, id, created_at, question, answer, score_json, channel, transcript_json,
        summary, struggle, sources_json, actions_json, review_status, call_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      ownerEmail,
      id,
      new Date().toISOString(),
      question,
      answer,
      JSON.stringify(capture.review?.score ?? null),
      capture.channel,
      JSON.stringify(capture.transcript),
      capture.review?.summary ?? summaryFor(answer || question),
      capture.review?.struggle ?? "Review unavailable.",
      JSON.stringify(capture.sources),
      JSON.stringify(capture.actions),
      capture.reviewStatus,
      callId,
    );
  return id;
}

export function listConversationLogs(ownerEmail: string, limit = 50): ConversationLogRecord[] {
  seedConversationLogs(ownerEmail);
  const rows = database
    .prepare(
      `SELECT id, created_at, question, answer, score_json, channel, transcript_json, summary,
        struggle, sources_json, actions_json, review_status
       FROM conversation_logs WHERE owner_email = ? ORDER BY created_at DESC LIMIT ?`,
    )
    .all(ownerEmail, limit) as Array<{
    id: string;
    created_at: string;
    question: string;
    answer: string;
    score_json: string;
    channel: string;
    transcript_json: string;
    summary: string;
    struggle: string;
    sources_json: string;
    actions_json: string;
    review_status: string;
  }>;

  return rows.map((row) => {
    const parsedScore: unknown = JSON.parse(row.score_json);
    const score = isConversationScore(parsedScore) ? parsedScore : null;
    const parsedTranscript: unknown = JSON.parse(row.transcript_json);
    const transcript = Array.isArray(parsedTranscript) && parsedTranscript.length
      ? parsedTranscript as TranscriptEntry[]
      : [{ role: "user", text: row.question }, { role: "assistant", text: row.answer }] satisfies TranscriptEntry[];
    const channel = ["browser_voice", "demo", "phone", "text"].includes(row.channel)
      ? row.channel as ConversationChannel
      : "demo";
    return {
      id: row.id,
      createdAt: row.created_at,
      question: row.question,
      topic: row.question.length > 64 ? `${row.question.slice(0, 61)}…` : row.question,
      summary: row.summary || summaryFor(row.answer),
      detail: row.answer,
      experience: score ? (score.qualification === "qualified" ? "Helpful" : "Needs follow-up") : "Review unavailable",
      channel,
      transcript,
      struggle: row.struggle || "No clear struggle detected.",
      sources: JSON.parse(row.sources_json) as string[],
      actions: JSON.parse(row.actions_json) as ConversationAction[],
      reviewStatus: row.review_status === "failed" ? "failed" : "complete",
      score,
    };
  });
}
