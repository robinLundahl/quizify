# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Session start

At the start of every conversation, read `TODO.md` and tell the user which unchecked items are pending. Keep the message short — just the bullet points. If all items are checked or the file is empty, say nothing.

## Commands

From the **project root**:
```bash
npm run dev          # Start client (port 5173) and server (port 3001) concurrently
npm run build        # Build both client and server
npm run db:generate  # Regenerate Prisma client after schema changes
npm run db:migrate   # Apply schema changes to the database (runs prisma migrate dev)
```

From **server/**:
```bash
npx tsc --noEmit     # Type-check server
npx prisma migrate dev --name <name>  # Create and apply a new migration
npx prisma studio    # Open Prisma Studio to browse the database
```

From **client/**:
```bash
npx tsc --noEmit     # Type-check client
```

## Architecture

This is a Kahoot-style quiz platform. A monorepo with two packages:

- **`client/`** — React + Vite + TypeScript + Tailwind v4. Proxies `/api` requests to the server (configured in `vite.config.ts`).
- **`server/`** — Node + Express + TypeScript. Shares an HTTP server with Socket.io for real-time game sessions.

### Auth flow

Google OAuth via Passport.js. The flow: browser navigates to `GET /api/auth/google` → Google redirects to `/api/auth/google/callback` → server upserts the User in DB, signs a JWT, sets it as an `httpOnly` cookie → redirects to `/dashboard`.

All subsequent requests send the cookie automatically. `requireAuth` middleware (`server/src/middleware/requireAuth.ts`) reads and verifies the JWT from `req.cookies.token` and attaches `req.userId`.

On the client, `useAuth` (`client/src/hooks/useAuth.ts`) calls `GET /api/auth/me` via React Query on mount to rehydrate the session. The result is stored in a Zustand store (`authStore`). `ProtectedRoute` guards routes by checking the store.

### Database (Prisma v7 + Supabase PostgreSQL)

Schema is in `server/prisma/schema.prisma`. Prisma client is generated to `server/src/generated/prisma/` — import from `../generated/prisma/client.js`.

Prisma v7 requires an explicit adapter. The singleton in `server/src/lib/prisma.ts` uses `@prisma/adapter-pg` with `DATABASE_URL` (pooled, port 6543). Migrations use `DIRECT_URL` (direct, port 5432) — configured in `server/prisma.config.ts`.

After any schema change: run `npm run db:migrate` then `npm run db:generate`.

### Real-time (Socket.io)

Socket.io is initialized in `server/src/socket/index.ts` and shares the same HTTP server as Express. Game session handlers will live in `server/src/socket/gameHandlers.ts` (not yet built).

### Key data model relationships

`Quiz` owns many `Question`s. Each `Question` has a `type` enum (`MULTIPLE_CHOICE`, `TRUE_FALSE`, `OPEN_ENDED`, `IMAGE`, `MAP`). MAP questions have a companion `MapQuestion` row with `lat`/`lng`/`radiusKm`. Multiple-choice questions have `AnswerOption` rows.

`GameSession` is a live instance of a quiz, identified by a short `code`. Players join as `Participant`s (optionally linked to a `User`). Each answer is recorded in `GameAnswer` with `pointsEarned` and `responseTimeMs`.

### Environment

`server/.env` holds all secrets. The client has no `.env` — it talks to the server via the Vite proxy. Required vars: `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`. See `.env.example` at the root for the full list.
