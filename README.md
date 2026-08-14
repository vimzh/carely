# Carely

Bun monorepo with a Next.js frontend and Hono backend.

## Development

```bash
bun install
cp apps/web/.env.example apps/web/.env.local
bun run dev
```

Set the Google OAuth values in `apps/web/.env.local`. The local redirect URI is
`http://localhost:3004/api/auth/callback/google`.

- Frontend: http://localhost:3004
- API: http://localhost:3001
- Health check: http://localhost:3001/health

## Font attribution

P22 Mackinac W01 Book is sourced from [OnlineWebFonts](https://www.onlinewebfonts.com/fonts) under the CC BY 4.0 terms stated by the supplied stylesheet.
