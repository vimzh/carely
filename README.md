# Carely

Carely is a voice companion for older adults who use a basic mobile phone instead of a smartphone. A parent or grandparent can call a familiar number and ask for help with medication reminders, TV instructions, family questions, or everyday tasks in plain language.

Family members configure that experience from a simple dashboard: they add important context, instructions, medication schedules, and trusted contacts without asking the older adult to learn a new app. The project is designed to help families stay supportive when they cannot always answer every call themselves, while keeping the interaction familiar and phone-based for the person receiving care.

This repository is a Bun monorepo with a Next.js frontend and Hono backend.

## Development

```bash
bun install
cp apps/web/.env.example apps/web/.env.local
bun run dev
```

Set the Google OAuth values in `apps/web/.env.local`. The local redirect URI is
`http://localhost:3004/api/auth/callback/google`.

Home-location selection and nearby answers are disabled by default. Set
`NEXT_PUBLIC_CARELY_PLACES_ENABLED=true` in the web app and
`CARELY_PLACES_ENABLED=true` in the API to opt in. The feature requires a
browser-restricted `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` for Maps JavaScript and a
server-restricted `GOOGLE_MAPS_API_KEY` for Places API (New); keep the server key
only in `apps/api/.env`.

Reminders are daily and use each reminder's saved time zone. To place real outbound calls,
set `CARELY_REMINDER_SCHEDULER_ENABLED=true`, the three Twilio values, and a public
`CARELY_PUBLIC_URL` in `apps/web/.env.local`; add a phone number to the selected contact
in the Contacts page. A local `CARELY_PUBLIC_URL` can place the call but cannot receive
the spoken-response callback from Twilio.

For an inbound Carely conversation, save the caller's complete international number (for
example, `+91...`) on exactly one care recipient. Deploy `apps/api` behind public HTTPS,
set its `CARELY_API_PUBLIC_URL`, `CARELY_WEB_ORIGIN`, `TWILIO_AUTH_TOKEN`, and the same
`CARELY_AGENT_SECRET` used by the web app, then configure the Twilio number's incoming
Voice webhook as an HTTP `POST` to:

```text
https://your-carely-api.example/telephony/twilio/incoming
```

Carely validates Twilio's webhook and WebSocket signatures, maps the caller ID to the
family account, and converts Twilio's bidirectional phone audio for Gemini Live. Twilio's
number and account credentials are external resources and are not stored in this repository.

## Deployment constraints

The current SQLite and reminder-worker design requires one long-running web instance and
one long-running API instance, each with a durable data volume. Keep WebSocket traffic on
the same API instance and set `CARELY_TIME_ZONE` to the care recipient's time zone. Before
running multiple replicas, move both SQLite databases, voice-session admission, and the
reminder scheduler to shared durable services. A serverless or multi-replica deployment
without those changes can lose call state or place duplicate reminder calls.

Production also requires public HTTPS/WSS for the API, `ffprobe` on the API host, matching
`CARELY_AGENT_SECRET` values, a configured Twilio voice number, and persistent storage for
guide uploads and conversation records.

- Frontend: http://localhost:3004
- API: http://localhost:3001
- Health check: http://localhost:3001/health

## Font attribution

P22 Mackinac W01 Book is sourced from [OnlineWebFonts](https://www.onlinewebfonts.com/fonts) under the CC BY 4.0 terms stated by the supplied stylesheet.
