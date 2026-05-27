# Deployment

## Stack split

| Layer | Service | Cost |
|-------|---------|------|
| Frontend (React + Vite) | Vercel | Free |
| Backend (Node + Express + Socket.io) | Railway | ~$5/month |
| Database | Supabase (already hosted) | existing plan |

Vercel cannot run a persistent Socket.io server (serverless), so the backend must go on Railway or equivalent.

## Environments

Two separate deployments, each linked to a GitHub branch:

| | Production | Staging |
|---|---|---|
| Branch | `main` | `dev` |
| URL | `quizcraft.app` | `dev.quizcraft.app` |
| Supabase project | production project | separate dev project |

Vercel automatically generates a preview URL for every branch/PR — useful for testing `dev` before merging to `main`.

## Branching strategy

```
main      → live production (only merge here when ready to release)
dev       → active development
feature/* → individual features, merged into dev
```

## Two Supabase projects

Create a second Supabase project for development. Never run migrations or seed test data against the production project.

- `server/.env` (production) → production DATABASE_URL, DIRECT_URL, JWT_SECRET, Google OAuth credentials
- `server/.env.development` → dev Supabase DATABASE_URL, DIRECT_URL

## Setup checklist

- [ ] Push repo to GitHub
- [ ] Create second Supabase project for dev
- [ ] Connect repo to Vercel (frontend) — link `main` to production domain, `dev` auto-previews
- [ ] Connect repo to Railway (backend) — one service per environment, each linked to its branch
- [ ] Replace Vite dev proxy with `VITE_API_URL` env variable pointing to the Railway backend URL
- [ ] Set all production secrets in Railway's environment variable panel (never in the repo):
  - `DATABASE_URL`
  - `DIRECT_URL`
  - `JWT_SECRET`
  - `GOOGLE_CLIENT_ID`
  - `GOOGLE_CLIENT_SECRET`

## RLS

Row Level Security is enabled on all 20 tables (migration `20260527083025_enable_rls_all_tables`). No Supabase Data API (REST/GraphQL) access — all database queries go through Prisma on the Express server.
