# Carely

## One-line Summary

Carely turns any basic phone into a calm, personalized elder-care companion while giving families a web dashboard for trusted guidance, reminders, and conversation review.

## Problem

Many older adults can make a phone call but cannot comfortably use a smartphone app, search the web, or operate an AI interface. Small questions—how to use an appliance, when to take medicine, or what a family member previously explained—then become repeated interruptions or go unanswered.

The barrier is not intelligence. It is access, familiarity, and trust. Families need a way to make reliable help available without asking an older relative to learn a new device or interface.

## Solution

Carely uses the familiar phone call as the primary interface. A care recipient can speak naturally and receive short, clear guidance informed by family-provided context. The same agent is available through a hosted web experience for testing and family administration.

Family members can manage care recipients, contacts, reminders, and multimodal guides; try the agent through text or browser voice; and review transcripts, summaries, sources, actions, and quality results. Carely gates retrieval so general questions do not unnecessarily access private family context, and it refuses to invent missing medication or family details.

## Why This Matters

Carely gives older adults more independence without replacing a familiar device. It also reduces repetitive coordination work for families while keeping them in control of the trusted context and reminders the agent may use.

The project demonstrates that accessibility can mean removing the screen entirely—not merely simplifying one.

## How We Used AI

- Google ADK orchestrates the Carely agent, tool calls, multi-turn state, and live voice path.
- Gemini 3.5 Flash Lite runs through Vertex AI in the deployed Cloud Run API.
- The agent retrieves family-specific guidance only when the request needs personal context.
- Gemini reviews completed conversations into a bounded summary, struggle statement, and independently validated quality score.
- Gemini Live powers the implemented bidirectional phone-audio path when Twilio credentials are configured.
- Google Search grounding supports questions that depend on current public information.
- Multimodal ingestion turns family notes, documents, images, audio, and a short demonstration video into usable guidance.

## How We Used Codex

Codex helped build and refine the Bun/TypeScript monorepo, trace agent and persistence flows, reproduce race and authorization failures, add focused regression tests, harden trust boundaries, and verify complete user journeys. It also created the Cloud Run packaging, diagnosed clean-build dependency failures, migrated the deployed model path from a quota-limited API key to Vertex AI identity, and verified a real Gemini response plus structured review from the public API.

Codex was used as an engineering collaborator rather than as a substitute for verification: changes were checked through linting, type-checking, unit tests, production container builds, Cloud Run health checks, browser inspection, and live model calls.

## Key Features

- Text, browser-voice, and implemented telephone-agent paths sharing one Carely persona.
- Owner-scoped care recipients, trusted contacts, guides, reminders, and conversation history.
- Family-specific retrieval with a gate that skips private memory for general questions.
- Multimodal guides supporting text, documents, images, audio, and one bounded video walkthrough.
- Reminder confirmation and atomic delivery claims that prevent duplicate calls.
- Signed Twilio webhook and WebSocket validation for the configured phone path.
- Conversation summaries, source/action capture, and validated quality scoring.
- Explicit emergency-language handling and fail-fast provider/configuration errors.
- Public Google Cloud deployment with secrets kept in Secret Manager.

## Architecture

Carely is a Bun and TypeScript monorepo with two deployed services:

1. A Next.js 16 / React 19 web application provides Google authentication, family configuration, guide and reminder management, logs, and browser-based agent testing.
2. A Hono API runs Google ADK, Gemini 3.5 Flash Lite on Vertex AI, context ingestion and retrieval, reminder tools, conversation review, and the Twilio/Gemini Live audio bridge.

Google Cloud Run hosts both services. Artifact Registry stores their images, Cloud Build produces reproducible containers, and Secret Manager supplies production credentials. The current hackathon demo uses one instance per service because its SQLite state and attachment storage are local to each container.

Architecture diagram: `docs/devpost/carely-agentic-system.png`

## Testing Instructions

### Hosted demo

1. Open https://carely-web-58893316002.us-central1.run.app.
2. Select **Test Carely** and sign in with Google.
3. Open the text-agent experience and ask a simple question such as, “How can you help my family?”
4. Add a family guide or reminder, then ask a family-specific question to demonstrate retrieval and tool behavior.
5. Open conversation logs to inspect the transcript, sources, actions, summary, and review status.

The hosted phone-call path is not enabled for judges because it requires a production Twilio number and carrier credentials. The signed media-stream implementation and its audio conversion tests are included in the repository.

### Local verification

Follow the root `README.md` for environment setup and Cloud Run deployment. The focused verification commands are:

```bash
cd apps/api && bun run typecheck && bun test
cd apps/web && bun run lint && bun run typecheck && bun test
```

Verified results before submission preparation:

- API: 48 passing tests and successful type-check.
- Web: 19 passing tests, successful lint, and successful type-check.
- Cloud Build: successful production builds for both containers.
- Public deployment: web HTTP 200, API health OK, live Gemini response HTTP 200, conversation review complete.

## Public Demo Link

https://carely-web-58893316002.us-central1.run.app

Public pitch: https://carely-web-58893316002.us-central1.run.app/pitch

## Public Repository Link

https://github.com/vimzh/carely

The repository is currently private. Before final submission, either make it public or grant access to `testing@devpost.com` and `cloudhackathons@google.com`.

## Demo Video

**TODO: Add the final public YouTube or Vimeo URL.**

Recommended four-minute outline:

1. **0:00–0:30 — Problem:** Show a basic phone and explain the access gap for older adults.
2. **0:30–1:00 — Value:** Explain why a familiar phone call plus family-managed context is different from a generic chatbot.
3. **1:00–2:15 — Live demo:** Sign in, show the family dashboard, add or open a guide, then ask Carely a contextual question.
4. **2:15–2:50 — Agent action:** Create or confirm a reminder and show the resulting action/log.
5. **2:50–3:25 — Architecture:** Show the diagram and explain Next.js, Hono, Google ADK, Gemini, and owner-scoped state.
6. **3:25–3:50 — Google Cloud proof:** Show the Cloud Run services, public `.run.app` URL, and Vertex AI-backed successful request/log.
7. **3:50–4:00 — Close:** Restate the independence and family-confidence value proposition.

## Screenshot Shot List

1. Landing page with the “Test Carely” action.
2. Family dashboard showing care recipients and reminders without exposing real personal data.
3. Text-agent response grounded in a family guide.
4. Conversation transcript/review sheet showing sources, actions, and quality status.
5. Google Cloud Run service page or logs proving the deployed backend.

## Submission Readiness Notes

- Recommended category: **Collaborative Partner**.
- Submitter type: **Individuals** unless this is being submitted as a team.
- Country: **India** based on the current workspace context; confirm before final submission.
- Organization name: **N/A** unless submitting for an incorporated organization.
- Project start date: **08-14-26**.
- Google SDK: **Agent Development Kit (ADK)**.
- Google Cloud service field: **Cloud Run**.
- Google AI model: **Gemini 3.5 Flash Lite through Vertex AI**.
- Reproducible testing instructions in README: **Yes**.
- Required architecture upload: `docs/devpost/carely-agentic-system.png` is ready.

## Known Limitations

- Cloud Run's writable filesystem is ephemeral. The hackathon deployment is intentionally capped at one instance per service; a production rollout should move SQLite, attachments, voice-session admission, and scheduler coordination to shared durable services.
- The public deployment does not include Twilio carrier credentials, so real telephone calls are not enabled for judges.
- Google Places assistance remains disabled unless explicitly configured with a restricted production key.
- The final demo video, repository judge access, and architecture file upload remain required before submission.

## TODO Official Form Fields

- [ ] Confirm submitter type: Individuals, Team of individuals, or Organization.
- [ ] Confirm country of residence.
- [ ] Confirm the required organization-name answer, using `N/A` if appropriate.
- [ ] Add the public YouTube or Vimeo demo-video URL.
- [ ] Upload `docs/devpost/carely-agentic-system.png` to the architecture field.
- [ ] Make the repository public or grant the two official judge accounts access.
- [ ] Optionally add a public build article and social post with `#AllThingsAgenticHackathon` for bonus points.
