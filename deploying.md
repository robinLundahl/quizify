# Deployment

## Stack split

| Layer | Service | Cost |
|-------|---------|------|
| Frontend (React + Vite) | Vercel | Free |
| Backend (Node + Express + Socket.io) | Railway | ~$5/month |
| Database | Supabase (already hosted) | existing plan |

Vercel cannot run a persistent Socket.io server (serverless), so the backend must go on Railway or equivalent.

## Environment strategy

**Single environment: production only**

- Deploy `main` branch to production
- Test changes locally before merging to `main`
- Vercel automatically generates preview URLs for every branch/PR — use these for testing before merge
- One Supabase project (production)

This keeps the deployment simple and avoids the cost/complexity of a staging environment. We can add staging later if needed.

## Branching strategy

```
main      → live production (only merge here when ready to release)
feature/* → individual features, test locally then merge into main
```

## Database

Single Supabase project for production. Local development uses the same database (RLS is enabled on all tables for security).

## Setup checklist

- [x] Push repo to GitHub
- [x] Create `dev` branch
- [ ] Connect repo to Railway (backend)
  - Link to `main` branch
  - Set environment variables (see below)
- [ ] Connect repo to Vercel (frontend)
  - Link to `main` branch for production
  - Configure custom domain
  - Set `VITE_API_URL` to Railway backend URL
- [ ] Update client to use `VITE_API_URL` instead of dev proxy
- [ ] Configure Google OAuth callback URLs to include production URLs
- [ ] Verify Resend sending domain (remove DEV_EMAIL workaround)

### Railway environment variables

Set these in Railway's environment variable panel (never commit to repo):

- `DATABASE_URL` — Supabase connection pooling URL (port 6543)
- `DIRECT_URL` — Supabase direct connection URL (port 5432)
- `JWT_SECRET` — same as local `.env`
- `GOOGLE_CLIENT_ID` — OAuth credentials
- `GOOGLE_CLIENT_SECRET` — OAuth credentials
- `NODE_ENV=production`
- `RESEND_API_KEY` — for email sending
- `CLIENT_URL` — your Vercel production URL (e.g., `https://quizcraft.app`)

## RLS

Row Level Security is enabled on all 20 tables (migration `20260527083025_enable_rls_all_tables`). No Supabase Data API (REST/GraphQL) access — all database queries go through Prisma on the Express server.
