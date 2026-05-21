# TICKET-051 — Stripe PRO Subscription Upgrade Flow

**Status:** Open  
**Type:** Feature  
**Priority:** High

## Problem

The FREE/PRO plan tiers are enforced in the app, but there is no way for a user to upgrade through the product — the only current path is via Prisma Studio or direct SQL. Users who hit a plan restriction see a dead-end modal with no way to pay.

## Goal

Wire up Stripe Checkout so users can self-serve upgrade to PRO, with the plan activated automatically via webhook. Include subscription cancellation via the Stripe Customer Portal.

---

## User flow

1. User hits a plan restriction → upgrade modal appears
2. Modal has **"Upgrade to Pro"** button
3. Client calls `POST /api/checkout/create-session`
4. Server returns a Stripe-hosted Checkout URL → client redirects
5. User pays on Stripe → redirected to `/upgrade/success`
6. Stripe fires `checkout.session.completed` webhook → server sets `plan = 'PRO'`
7. Success page polls `/api/auth/me` until `plan === 'PRO'`, then shows confirmation
8. PRO users can cancel via "Manage subscription" in Settings → Stripe Customer Portal

---

## Required env vars

Add to `server/.env` and root `.env.example`:

```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID_PRO=price_...
```

No publishable key needed — Stripe Checkout is fully server-side.

---

## Implementation

### Schema (`server/prisma/schema.prisma`)

Add to `User` model:
```prisma
stripeCustomerId     String?  @unique
stripeSubscriptionId String?  @unique
```

Run `npx prisma db push` (from `server/`) then `npx prisma generate`.

### New: `server/src/lib/stripe.ts`

Stripe singleton (mirrors `prisma.ts` pattern):
```typescript
import Stripe from 'stripe'
export const stripe = new Stripe(process.env['STRIPE_SECRET_KEY']!)
```

### New: `server/src/routes/checkout.ts`

**`POST /api/checkout/create-session`** (requireAuth)
1. Load user — get `email` + `stripeCustomerId`
2. If no `stripeCustomerId`: create Stripe customer, save to DB
3. Create Stripe Checkout session:
   - `mode: 'subscription'`
   - `line_items: [{ price: STRIPE_PRICE_ID_PRO, quantity: 1 }]`
   - `customer: stripeCustomerId`
   - `success_url: CLIENT_URL/upgrade/success?session_id={CHECKOUT_SESSION_ID}`
   - `cancel_url: CLIENT_URL/upgrade/cancel`
   - `metadata: { userId }`
4. Return `{ url: session.url }`

**`POST /api/checkout/portal`** (requireAuth)
1. Load `stripeCustomerId`
2. Create Stripe Billing Portal session
3. Return `{ url: portalSession.url }`

### New: `server/src/routes/webhooks.ts`

**`POST /api/webhooks/stripe`** — raw body, no auth

1. Verify signature: `stripe.webhooks.constructEvent(body, sig, STRIPE_WEBHOOK_SECRET)`
2. `checkout.session.completed` → set `plan = 'PRO'`, store `stripeCustomerId` + `stripeSubscriptionId`
3. `customer.subscription.deleted` → find user by `stripeCustomerId`, set `plan = 'FREE'`, clear `stripeSubscriptionId`
4. Return `200` for all other events

### `server/src/index.ts`

**Critical:** webhook route must be mounted BEFORE `express.json()`:

```typescript
// Before app.use(express.json())
app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), stripeWebhookRouter)

app.use(express.json())  // existing — keep here
app.use('/api/checkout', checkoutRouter)  // add after json middleware
```

### `client/src/pages/Dashboard.tsx`

Replace the single "Got it" button in the upgrade modal with:
- **"Maybe later"** — dismisses modal
- **"Upgrade to Pro →"** — calls `POST /api/checkout/create-session`, redirects to Stripe URL

### New: `client/src/pages/UpgradeSuccess.tsx` (protected route)

- Poll `GET /api/auth/me` via `refetchInterval` until `plan === 'PRO'`
- Spinner + "Activating your Pro plan…" while waiting
- Checkmark + "You're now Pro!" once confirmed
- Timeout after 15 s → fallback message + dashboard link

### New: `client/src/pages/UpgradeCancel.tsx` (protected route)

- "No worries, you can upgrade anytime." + button back to `/dashboard`

### `client/src/App.tsx`

Inside `<ProtectedRoute>`:
```tsx
<Route path="/upgrade/success" element={<UpgradeSuccess />} />
<Route path="/upgrade/cancel" element={<UpgradeCancel />} />
```

### `client/src/pages/Settings.tsx`

Add billing section visible only when `plan === 'PRO'`:
- "Manage subscription" button → `POST /api/checkout/portal` → redirect to portal URL

### i18n (`en.json` + `sv.json`) — add to `plan` section

```json
"upgrade_cta": "Upgrade to Pro",
"maybe_later": "Maybe later",
"activating": "Activating your Pro plan…",
"success_title": "You're now Pro!",
"success_body": "Enjoy unlimited quizzes and all question types.",
"go_to_dashboard": "Go to dashboard",
"cancel_title": "No worries",
"cancel_body": "You can upgrade anytime from your dashboard.",
"manage_subscription": "Manage subscription"
```

---

## Files to create

| File | Purpose |
|---|---|
| `server/src/lib/stripe.ts` | Stripe client singleton |
| `server/src/routes/checkout.ts` | Checkout session + portal endpoints |
| `server/src/routes/webhooks.ts` | Stripe webhook handler |
| `client/src/pages/UpgradeSuccess.tsx` | Post-payment success page |
| `client/src/pages/UpgradeCancel.tsx` | Cancelled checkout page |

## Files to modify

| File | Change |
|---|---|
| `server/prisma/schema.prisma` | Add `stripeCustomerId`, `stripeSubscriptionId` |
| `server/src/index.ts` | Mount webhook before `express.json()`, add checkout router |
| `client/src/pages/Dashboard.tsx` | Replace "Got it" with "Maybe later" + "Upgrade to Pro" |
| `client/src/pages/Settings.tsx` | Add billing/portal section for PRO users |
| `client/src/App.tsx` | Add `/upgrade/success` and `/upgrade/cancel` routes |
| `client/src/locales/en.json` | Add i18n keys |
| `client/src/locales/sv.json` | Add i18n keys |

---

## Acceptance criteria

- [ ] FREE user can click "Upgrade to Pro" and reach Stripe Checkout
- [ ] Successful payment with test card `4242 4242 4242 4242` upgrades plan to PRO
- [ ] `/upgrade/success` page activates and shows confirmation once webhook is processed
- [ ] NavDropdown badge changes from "Free" to "Pro" after upgrade
- [ ] PRO plan restrictions are lifted immediately after upgrade
- [ ] PRO user can open Stripe Customer Portal from Settings
- [ ] Cancelling subscription via portal resets plan to FREE (webhook)
- [ ] Stripe webhook signature is verified — unsigned requests rejected with 400

## Verification

1. Add test keys to `server/.env`
2. Create product + recurring price in Stripe Dashboard (test mode) → copy `STRIPE_PRICE_ID_PRO`
3. Run `stripe listen --forward-to localhost:3001/api/webhooks/stripe`
4. Trigger upgrade modal as FREE user → click "Upgrade to Pro"
5. Pay with `4242 4242 4242 4242`
6. Confirm success page resolves and badge updates
7. Check DB: `plan = 'PRO'`, `stripeCustomerId` and `stripeSubscriptionId` set
8. Cancel via portal → webhook fires → `plan = 'FREE'`
