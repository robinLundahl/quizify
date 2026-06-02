# Deployment

## Production URLs

- **Frontend:** https://quizcraft.online (and https://www.quizcraft.online)
- **Backend:** https://api.quizcraft.online
- **Database:** Supabase (production project)

## Stack

| Layer | Service | Cost |
|-------|---------|------|
| Frontend (React + Vite) | Vercel | Free |
| Backend (Node + Express + Socket.io) | Railway | ~$5/month |
| Database | Supabase | existing plan |
| Domain | quizcraft.online | ~$10-15/year |

## Environment strategy

**Single environment: production only**

- Deploy `main` branch to production
- Test changes locally before merging to `main`
- Vercel automatically generates preview URLs for every branch/PR
- One Supabase project (production)

⚠️ **Future consideration:** Set up a separate dev Supabase project to avoid running test migrations against production. For now, be extra careful with database migrations.

## Deployment checklist

### ✅ Completed

- [x] Push repo to GitHub
- [x] Create `dev` branch (optional, for future use)
- [x] Purchase custom domain (`quizcraft.online`)
- [x] Configure DNS records (CNAME for Vercel and Railway)
- [x] Deploy backend to Railway
  - Custom domain: `api.quizcraft.online`
  - Root directory: `server/`
  - Environment variables configured
- [x] Deploy frontend to Vercel
  - Custom domain: `quizcraft.online` and `www.quizcraft.online`
  - Root directory: `client/`
  - Environment variables configured
- [x] Configure Google OAuth
  - Authorized JavaScript Origins: both www and non-www
  - Authorized Redirect URIs: `https://api.quizcraft.online/api/auth/google/callback`
- [x] CORS configured for custom domain
- [x] Cookies configured with `.quizcraft.online` domain for cross-subdomain sharing

### 📋 Optional / Future Tasks

- [ ] Set up separate Supabase dev project
- [ ] Configure Resend custom sending domain (remove DEV_EMAIL workaround in `server/src/lib/email.ts`)
- [ ] Set up monitoring/alerting (e.g., Sentry)
- [ ] Configure staging environment (optional)

## Environment Variables

### Railway (Backend)

Set these in Railway → Variables:

| Variable | Value |
|----------|-------|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | Supabase pooled connection (port 6543) |
| `DIRECT_URL` | Supabase direct connection (port 5432) |
| `JWT_SECRET` | Random secret (same as local) |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `CLIENT_URL` | `https://www.quizcraft.online` |
| `BACKEND_URL` | `https://api.quizcraft.online` |
| `RESEND_API_KEY` | Resend API key |
| `FROM_EMAIL` | `noreply@quizcraft.online` (or your verified domain) |
| `ANTHROPIC_API_KEY` | Claude API key |
| `PEXELS_API_KEY` | Pexels API key |
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |

### Vercel (Frontend)

Set these in Vercel → Settings → Environment Variables:

| Variable | Value |
|----------|-------|
| `VITE_API_URL` | `https://api.quizcraft.online` |

## DNS Configuration

### Vercel (Frontend)

In your domain registrar (Namecheap, etc.):

| Type | Host | Value |
|------|------|-------|
| CNAME | `@` | `cname.vercel-dns.com` (from Vercel) |
| CNAME | `www` | `cname.vercel-dns.com` (from Vercel) |

### Railway (Backend)

| Type | Host | Value |
|------|------|-------|
| TXT | `_railway-verify.api` | Verification token (from Railway) |
| CNAME | `api` | CNAME target (from Railway) |

## Google OAuth Configuration

In [Google Cloud Console](https://console.cloud.google.com):

**Authorized JavaScript Origins:**
- `https://quizcraft.online`
- `https://www.quizcraft.online`
- `https://api.quizcraft.online`
- `http://localhost:5173` (for local dev)

**Authorized Redirect URIs:**
- `https://api.quizcraft.online/api/auth/google/callback`
- `http://localhost:3001/api/auth/google/callback` (for local dev)

## Deployment Process

### Deploying Changes

1. **Make changes locally** and test with `npm run dev`
2. **Commit and push** to `main` branch
3. **Railway and Vercel auto-deploy** (takes 2-3 minutes)
4. **Verify** at https://quizcraft.online

### Database Migrations

⚠️ **Important:** Migrations run against production database!

```bash
# In server/ directory
npm run db:migrate -- --name description_of_migration
```

This will:
1. Create migration file
2. Apply to production Supabase
3. Regenerate Prisma client

**Commit the migration files** to git.

## Troubleshooting

### OAuth not working
- Verify Google Console has correct redirect URIs
- Check Railway logs for errors
- Verify `CLIENT_URL` and `BACKEND_URL` in Railway variables

### CORS errors
- Verify CORS in `server/src/index.ts` includes your domain
- Check that both `quizcraft.online` and `www.quizcraft.online` are allowed

### Cookies not working
- Verify cookie `domain` is set to `.quizcraft.online` in production
- Check that `NODE_ENV=production` in Railway
- Verify browser allows third-party cookies (or use same domain for frontend/backend)

### Deployment fails
- Check build logs in Railway/Vercel
- Verify environment variables are set
- Check that `railway.toml` / `vercel.json` configs are correct

## Security Notes

- All secrets in Railway/Vercel environment variables (never in code)
- JWT tokens in httpOnly cookies (not localStorage)
- CORS restricted to specific domains
- RLS enabled on all Supabase tables
- HTTPS enforced on all production endpoints

## Future: Setting up Dev Environment

When the project grows, consider:

1. **Create separate Supabase project** for development
2. **Add `server/.env.development`** with dev database URLs
3. **Update branching strategy** to use `dev` branch
4. **Configure separate Railway service** for staging (linked to `dev` branch)

This keeps production data safe from test migrations and seed data.
