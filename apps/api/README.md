Carely's API requires Bun, a `GEMINI_API_KEY`, a shared `CARELY_AGENT_SECRET`, and `ffprobe` for validating 30-second guide videos. Set the same `CARELY_AGENT_SECRET` on the web app so authenticated voice sessions can use the correct family account and save reminders. Nearby-place answers are disabled unless `CARELY_PLACES_ENABLED=true`; when enabled, they also require a server-restricted `GOOGLE_MAPS_API_KEY` with Places API (New) enabled.

For inbound phone calls, set `TWILIO_AUTH_TOKEN`, `CARELY_WEB_ORIGIN`, and the public HTTPS `CARELY_API_PUBLIC_URL`. Configure the Twilio number's incoming Voice webhook as an HTTP `POST` to `${CARELY_API_PUBLIC_URL}/telephony/twilio/incoming`. The API validates both Twilio requests, resolves the caller from the care-recipient phone number, and bridges Twilio Media Streams to Gemini Live at `/telephony/twilio/media/`. Session admission is persisted in `CARELY_API_DATABASE_PATH`; completed phone transcripts, summaries, quality scores, and call duration are saved to the family dashboard.

To install dependencies:
```sh
bun install
```

To run:
```sh
bun run dev
```

The API starts at http://localhost:3001.
