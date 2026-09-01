<p align="center">
  <img src="docs/devpost/carely-poster.png" alt="Carely connects a basic phone to a family-managed voice companion" width="100%" />
</p>

<h1 align="center">Carely</h1>

<p align="center">
  A voice companion that older adults can call from any phone for patient, family-grounded help, while relatives manage guides, reminders, contacts, and conversation history from a web dashboard.
</p>

<p align="center">
  <a href="https://github.com/vimzh/carely">Source code</a>
</p>

<!-- README-HACK:NEEDS-OWNER key="demo-video" instruction="Add the final public demo video URL beside the source-code link." -->
<!-- README-HACK:NEEDS-OWNER key="live-demo" instruction="Add the deployed public Carely URL beside the source-code link." -->

## The idea

A basic phone can make a call, but it cannot open an app, search the web, or reach an AI assistant. That becomes a real problem when an older parent needs help remembering medicine, following household instructions, or checking a family detail.

They may already have their child's number saved and still hesitate to call. Small questions can feel like interruptions. Carely starts with the interface they already trust: a phone call.

## How Carely works

1. **A family member prepares Carely.** They add care recipients, trusted contacts, daily reminders, and household guides from the dashboard.
2. **The older adult calls.** Carely identifies the saved caller, listens through a normal phone connection, and answers in short, clear language.
3. **The family improves the support.** Conversation transcripts, summaries, actions, sources, and quality review help the family see where better guidance is needed.

<table>
  <tr>
    <th>1. Configure</th>
    <th>2. Call</th>
    <th>3. Review</th>
  </tr>
  <tr>
    <td><img src="apps/web/public/workflow/configure-carely.jpg" alt="A family member configuring care details and instructions in the Carely dashboard" /></td>
    <td><img src="apps/web/public/workflow/parents-call.jpg" alt="Older adults calling Carely while family guidance is available to the voice agent" /></td>
    <td><img src="apps/web/public/workflow/review-improve.jpg" alt="A family member reviewing conversations and improving Carely's saved guidance" /></td>
  </tr>
</table>

### What works today

- Text and live browser voice use the same Google ADK agent experience.
- Family guides can include written instructions, PDFs, documents, images, audio, and one short video.
- Each signed-in family receives an isolated Gemini File Search store for its own profiles and guides.
- A retrieval gate skips private family memory for basic questions and searches it only when personal context is relevant.
- Google Search can support questions that depend on current public information. Nearby Google Places assistance is available behind an explicit opt-in flag.
- Callers can create daily reminders only after confirming the person, time, and message.
- The dashboard stores owner-scoped contacts, care recipients, guides, reminders, transcripts, summaries, sources, completed actions, and conversation reviews.
- The inbound phone path validates Twilio webhook and WebSocket signatures, bridges phone audio to Gemini Live, and saves the completed conversation.

## Personal context without guessing

Carely does not send every question into family memory. Greetings, arithmetic, time, weather, and other general questions skip it. Questions about medicines, routines, preferences, appliances, relationships, or saved instructions can retrieve the relevant family context instead.

Guide edits replace their matching memory, and guide deletion removes it. The agent is instructed to treat every uploaded file and retrieved result as untrusted reference data and never invent missing family or medication details.

![How Carely turns family guides into gated context for text and live voice answers](docs/devpost/carely-agentic-system.png)

## Architecture

Carely is a Bun and TypeScript monorepo with two applications:

- **Next.js web app:** Google sign-in, the family dashboard, browser text and voice testing, SQLite-backed family records, and the reminder worker.
- **Hono API:** Google ADK orchestration, Gemini text and live voice sessions, Gemini File Search ingestion and retrieval, Google Search, optional Places lookup, conversation review, and telephony endpoints.
- **Twilio bridge:** signed inbound webhooks create a caller-bound session. Bidirectional Media Streams are converted between 8 kHz G.711 mu-law phone audio and the PCM format used by Gemini Live.
- **Conversation record:** transcripts, retrieved source names, and confirmed reminder actions are reviewed and sent back to the web app under the authenticated family owner.

SQLite keeps the prototype understandable and runnable on one web instance and one API instance. The reminder scheduler uses an atomic database claim so the same daily call is not dispatched twice.

## Built with

- TypeScript and Bun
- Next.js 16 and React 19
- Hono
- Google ADK
- Gemini text and live audio models
- Gemini File Search and Google Search
- Twilio Voice and Media Streams
- SQLite
- Google Cloud Build and Cloud Run Docker images

## Run locally

Prerequisites: Bun 1.3.14 and a Gemini API key. Google OAuth credentials are required for the signed-in dashboard.

```bash
bun install
cp apps/web/.env.example apps/web/.env.local
cp apps/api/.env.example apps/api/.env
```

Set `GEMINI_API_KEY` in `apps/api/.env`, fill the Google authentication values in `apps/web/.env.local`, and use the same `CARELY_AGENT_SECRET` in both files. Then run:

```bash
bun run dev
```

- Web app: `http://localhost:3004`
- API health check: `http://localhost:3001/health`
- Demo introduction: `http://localhost:3004/pitch`

The browser text and voice paths work locally. A real carrier call additionally requires a Twilio voice number, public HTTPS and WSS endpoints, and the provider credentials described in the main [README](README.md).

## Prototype boundaries

The inbound Twilio bridge and reminder-call scheduler are implemented, but no provider number or public deployment is included in this repository. A live phone demonstration depends on external Twilio and Google credentials.

The current SQLite databases, voice-session admission, uploaded files, and reminder worker are local state. Keep each Cloud Run service at one instance for a demo. Before horizontal scaling, move those responsibilities to shared durable services.

## What's next

- Publish the hosted demo and final walkthrough video.
- Move database, upload, voice-session, and scheduler state to durable shared infrastructure.
- Validate real carrier calls, interrupted-stream recovery, and monitoring on the public deployment.
- Production-test the optional nearby-place flow with restricted Google Maps and Places keys.

## Attribution

P22 Mackinac W01 Book is sourced from [OnlineWebFonts](https://www.onlinewebfonts.com/fonts) under the CC BY 4.0 terms stated by the supplied stylesheet.
