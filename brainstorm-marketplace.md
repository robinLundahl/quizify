# Marketplace Brainstorm

A pay-per-quiz marketplace layered on top of the existing subscription system. Creators sell quizzes, buyers purchase them, platform takes 10%.

---

## User Tiers

|                               | Free       | Pro (subscription) |
| ----------------------------- | ---------- | ------------------ |
| Browse library                | ✅         | ✅                 |
| Buy quizzes                   | ✅         | ✅                 |
| Publish quizzes               | ✅ (max 3) | ✅ (unlimited)     |
| Earn money on sales           | ✅         | ✅                 |
| Platform Pro features         | ❌         | ✅                 |
| Sales analytics               | ❌         | ✅                 |
| Priority placement in library | ❌         | ✅                 |

---

## Pro Subscription

- Price: **$2.00/month**, automatic renewal
- **7-day free trial** — no payment required to start the trial, but a valid payment method must be on file
- Cancel before trial ends → not charged
- After trial: billing starts automatically, renews monthly until cancelled
- Subscription management (upgrade, cancel, billing details) lives in the **Settings page** under a dedicated subscription section
- Receipts for subscription charges are downloadable from Settings

---

## Creator Rules

- Free users can publish up to 3 quizzes (counts active/published listings only — unpublishing frees a slot)
- Pro users can publish unlimited quizzes
- Only **logged-in users** can publish to the marketplace
- Creators set their own price per quiz, subject to platform minimums:
  - Minimum buy price: **$0.99**
  - Minimum rent price: **$0.49**
  - Rent price can **never exceed 80% of the buy price** — enforced server-side
  - No hard cap on buy price
- Revenue split: **88% creator / 12% platform**
- Pro creators can apply custom theme colors to their quizzes
- Pro creators get priority placement in the library

### Content Moderation

- Any logged-in user or guest can **flag/report** a marketplace listing
- Flagged listings are queued for review in the admin panel
- Admins can investigate and take down listings
- Platform reserves the right to remove content that violates policies

### When a Pro user cancels their subscription

- All existing published quizzes remain live — no takedowns
- Existing themes stay baked into those quizzes
- They continue earning from sales on existing quizzes
- Drop back to free tier: cannot publish new quizzes beyond the 3-quiz free limit
- If they had more than 3 published quizzes from their Pro period, all stay live but no new ones can be added until they resubscribe
- Any edits to existing published quizzes are allowed regardless of tier — edits create a new version, not a republish
- Republishing a taken-down quiz counts as a new publish and is subject to the free tier limit

---

## Quiz Themes

- Themes are **baked into the quiz at publish time**, not tied to the creator's account
- All buyers experience the creator's theme during playback — regardless of buyer tier
- Free buyers who purchase a themed quiz see that theme — this is not the same as having theme access themselves
- Free users cannot apply themes to their own content, except light or dark mode
- Buyers cannot change or override the creator's theme

---

## Currency

- Three supported currencies: **USD, SEK, EUR**
- Creators choose the currency when pricing a quiz (in the quiz editor and publish flow)
- Buyers can switch the display currency on the marketplace via a UI toggle
- All prices are stored in the creator's chosen currency; the marketplace converts for display only

---

## Library & Discovery

Public library browsable by all users. Filterable by:

- **Free text search** — search quiz titles and descriptions
- **Category** — fixed enum (same 31 values as `AI_CATEGORIES` in `QuizEditor.tsx`): History, Science, Sports, Geography, Film & TV, Music, Food & Drink, Technology, Literature, General Knowledge, Mathematics, Physics, Chemistry, Social Studies, Languages, Art & Literature, AI, Security, Communication, Design, Economics, Banking & Insurance, Marketing & Sales, Law, Agriculture, Nutrition, Travel & Tourism, Culture & Tradition, Dance, Theatre, Entertainment
- **Language** — fixed list (same 7 values as `AI_LANGUAGES` in `QuizEditor.tsx`): Swedish, English, Norwegian, Danish, German, French, Spanish
- **Difficulty** — Easy, Medium, Hard
- **Question count** — range spans: 1–10, 11–20, 21–30, 31–40, 41–50, 51–60, 61–70, 71–80, 81–90, 91–100
- **Price range**
- **Rating**

Pro creator quizzes get priority placement in library listings.

### Before purchasing, users can

- See full metadata: title, description, category, difficulty, number of questions, ratings and reviews, color theme
- See the first two questions of the quiz. The rest of the quiz should be blurred out

---

## Rental Model

Users can rent a quiz for 48 hours instead of purchasing it outright.

- Creator sets the rental price separately from the buy price (min $0.50, max 80% of buy price)
- Platform takes 12% cut on rentals (same as purchases)
- Rental access expires after 48 hours

### Post-expiry flow

When a rental expires:

1. A **message appears in their Notifications inbox** with a special offer: buy the full quiz at **20% off**
2. The discount offer is valid for **24 hours** after expiry
3. If the 24-hour window passes without purchase, the offer is removed and the standard buy price applies

### Notes

- Discount offers are time-limited and generated server-side on expiry — not manually issued by creators
- The 10% platform cut applies to the discounted price if the user buys via the offer

---

## Reviews

- Only **verified buyers** can leave a review
- Star rating 1–5, optional written review
- `MarketplaceReview` has `purchaseId` as a foreign key — one review per purchase, enforced at DB level

---

## Open Questions & Implementation Notes

### 1. Creator payouts

**Decision: Stripe Connect Express**

- Handles KYC, tax forms (1099), and currency conversion automatically
- On purchase: create a PaymentIntent with `application_fee_amount` (12%) — Stripe routes the rest to the creator's connected account
- **Hold funds for 14 days** before releasing to creators to cover the refund window
- Payouts are on-demand: creators can withdraw at any time once their available balance reaches **$10**

### 2. Integrating marketplace alongside subscription

Keep them as two distinct domains that interact at defined seams only:

- **Subscription system** answers: what can this user _do_?
- **Marketplace** answers: what has this user _bought or sold_?

Intersection points:

- Publish gate (check tier before allowing a new listing)
- Analytics/placement (check tier when rendering creator dashboard and library ranking)

New tables needed: `MarketplaceListing`, `QuizPurchase`, `CreatorPayout`, `MarketplaceReview`, `RentalOffer`

### 3. Cancellation logic

When a user downgrades:

- Flip `subscriptionStatus` to `free` (or set `proExpiresAt`)
- No cascade deletes, no status changes on existing listings
- "Can they publish more?" is a runtime check: `SELECT COUNT(*) FROM MarketplaceListing WHERE creatorId = ? AND status = 'published'`
- Any edit to a published quiz creates a new version in place — no republish required, no tier restriction
- Republishing a taken-down quiz is treated as a new publish and counts against the free tier slot limit

### 4. Enforcing the 3-quiz publish limit

- Enforce **server-side only** — never trust the client
- Count active listings before any publish action
- Unpublishing **frees up a slot** — the limit tracks currently active listings only, not lifetime publishes
- No need for a `publishCount` counter — a runtime count of active listings is sufficient

### 5. Piracy prevention

- Never expose a "get full quiz JSON" endpoint — serve questions one at a time during active game sessions
- Gate all content endpoints behind a `QuizPurchase` record
- Rate-limit content endpoints aggressively
- **Never include correct answers in question payloads** — validate answers server-side, return only correct/incorrect

### 6. Demo mode

- Creator designates 2 demo questions at publish time (or auto-select the first two)
- Flag demo questions on the `Question` row
- Public endpoint: `GET /api/marketplace/:quizId/demo` — returns only those questions with `correctOptionId` stripped
- Full content lives behind a purchase-verified endpoint
- No client-side "reveal" toggle — purely server-side

### 7. Verified buyer reviews

- `MarketplaceReview` has `purchaseId` as a foreign key (not just `userId`)
- Before inserting a review, verify a `QuizPurchase` row exists for that user + quiz
- Enforce one review per purchase with a **unique constraint on `purchaseId`** at DB level

### 8. Priority placement

Compute a `listingScore` on relevant events (new purchase, new rating, subscription change) and store it as a materialized value — don't compute on every query.

Example formula:

```
score = (avgRating * 20) + (purchaseCount * 0.5) + (isProCreator ? 30 : 0) + recencyBoost
```

Weights can be tuned over time.

### 9. Quiz versioning for buyers

- Buyers are **locked to the version at time of purchase** by default — updates are opt-in, not automatic
- When a creator publishes a new version of a quiz a user has already bought, the buyer receives a **notification** in their inbox prompting them to update
- The buyer should be able to see the new changes before deciding wether to update the version or not
- The buyer can accept (upgrade to latest version) or dismiss (stay on current version)
- `QuizPurchase` needs a `versionAtPurchase` field (integer matching `Quiz.version`) to track which version the buyer is on

### 10. Game sessions for buyers

- Buyers can host **unlimited game sessions** from purchased quizzes — no restrictions
- Creators see **buy count** and **rent count** on each of their quizzes (not session counts hosted by buyers)

### 11. Account deletion policy

Deletion is never instant if money is involved:

- **Pending balance** (in 14-day hold): deletion blocked until hold clears; user is shown the exact date they can proceed
- **Available balance**: a forced payout is triggered before deletion is allowed; the $10 minimum threshold is waived as a one-time exception so no earnings are forfeited
- On confirmed deletion: all creator's published quizzes are **immediately unpublished** (no new purchases or rentals can occur); existing buyers retain permanent access
- Creator's **Stripe Connect account is disconnected and deauthorized** at deletion time
- **Soft delete**: personal data is anonymized immediately; transaction records are retained for legal and accounting purposes
- **Hard delete** is performed after a **90-day retention period**

---

## Dashboard Design

Four tabs in the user dashboard:

**Tab 1: My Quizzes**

- Shows all quizzes you've created — drafts and published together
- Published quizzes show a visible badge with version number (e.g. "Published v3")
- Version increments every time the creator saves an edit to a published quiz
- Draft quizzes show no badge

**Tab 2: Purchased**

- Quizzes bought from other creators
- Shows creator name, rating, and purchase date
- If a new version is available for a purchased quiz, a badge indicates an available update

**Tab 3: Rentals**

- Active rentals: standard appearance with time remaining shown
- Expired rentals: greyed-out styling with the expiry date visible
- The post-expiry 20% discount offer surfaces in the Notifications inbox, not here

**Tab 4: Earnings**
Visible to **all users** (free and pro):

- Current available balance
- Pending balance (in 14-day hold, with release date)
- Total earned (all time)
- Payout history with downloadable receipts per payout
- **Withdraw** button — enabled when available balance ≥ $10; threshold waived on forced payout during account deletion

**Analytics** (Pro only, within Earnings or as a sub-tab):

- Top 3 quizzes by average rating
- Top 3 quizzes by number of sales

**Notifications inbox**
General inbox for all logged-in users. Events:

- Quiz purchased by a buyer
- Quiz rented by a buyer
- New review received on one of your quizzes
- New version available for a quiz you purchased (with accept/dismiss)
- Post-rental 20% discount offer (time-limited, 24h after expiry)
- Pro subscription expiry reminder (before renewal or trial end)

On version display:

- **Dashboard (creator's own view)**: version number (v1, v2, v3)
- **Public library listing (buyer's view)**: date-based ("Updated Jan 12")

---

## Settings & Profile

**Settings page** has a dedicated **Profile tab** (new):

- Name and avatar editing (moved here from the main settings view)
- Short bio field (displayed on the public creator profile page)

**Settings page** also has a **Subscription section**:

- Current plan (Free / Pro)
- Upgrade / cancel controls
- Billing details and payment method
- Downloadable receipts for past subscription charges

---

## Creator Profiles

Public-facing page separate from the private dashboard. Anyone can visit — no login required.

**Shows:**

- Creator name, avatar, and bio
- All published marketplace quizzes
- Aggregate stats: number of quizzes, average rating, member since date

**Does not show:**

- Drafts, purchased quizzes, earnings, or anything private

---

## Sharing

Every marketplace quiz listing has a **share button**. Clicking it copies a direct link to that quiz's listing page. Works the same way on:

- The library listing
- The quiz detail/preview page
- The creator's public profile

Links are public and accessible without login.

---

## Guest (Logged-Out) State

The marketplace is publicly browsable without an account.

**What guests can do:**

- Browse the full library and filter it
- View any quiz listing (metadata, ratings, reviews)
- See demo questions (2 questions), the rest of the quiz is blur
- Visit creator profiles
- Share quiz links

**What requires login:**

- Purchasing or renting a quiz
- Leaving a review
- Publishing a quiz
- Accessing purchased quizzes

### Deferred authentication

When a guest tries to purchase, redirect to login/signup, then redirect back to the same quiz listing automatically after authentication.

---

## Routing & Landing Page

The marketplace is the landing page — the first thing anyone sees, logged in or not.

**Route structure:**

- `/` — marketplace/library (public, the landing page)
- `/quiz/:id` — individual quiz listing page (public)
- `/creator/:id` — creator profile page (public)
- `/dashboard` — private, requires login

---

## Backlog Tickets

| Ticket     | Title                                                                            | Priority |
| ---------- | -------------------------------------------------------------------------------- | -------- |
| TICKET-059 | Add marketplace database schema (incl. rental tables)                            | High     |
| TICKET-060 | Implement guest/logged-out state                                                 | High     |
| TICKET-061 | Build marketplace landing page                                                   | Medium   |
| TICKET-062 | Build quiz listing page                                                          | Medium   |
| TICKET-063 | Build creator profile page                                                       | Medium   |
| TICKET-064 | Build publish-to-marketplace flow                                                | Medium   |
| TICKET-065 | Implement demo mode                                                              | Medium   |
| TICKET-066 | Stripe Connect onboarding for creators                                           | Medium   |
| TICKET-067 | Implement purchase flow                                                          | Medium   |
| TICKET-068 | Implement creator payout system                                                  | Medium   |
| TICKET-069 | Redesign dashboard with four tabs (My Quizzes, Purchased, Rentals, Earnings)     | Medium   |
| TICKET-070 | Implement verified buyer review system                                           | Medium   |
| TICKET-071 | Sales analytics for Pro creators                                                 | Low      |
| TICKET-072 | Priority placement and listing score                                             | Low      |
| TICKET-074 | Implement rental purchase flow                                                   | Medium   |
| TICKET-075 | Rental expiry worker and discount offer generation                               | Medium   |
| TICKET-076 | Dashboard notifications/message inbox                                            | Medium   |
| TICKET-077 | Discount offer redemption flow                                                   | Medium   |
| TICKET-078 | Pro subscription payment flow (Stripe Checkout / Billing)                        | High     |
| TICKET-079 | Settings: Profile tab (name, avatar, bio)                                        | Medium   |
| TICKET-080 | Settings: Subscription section (upgrade, cancel, receipts)                       | Medium   |
| TICKET-081 | Report/flag mechanism for marketplace listings                                   | Medium   |
| TICKET-082 | Account deletion policy enforcement (balance checks, forced payout, soft delete) | Medium   |
| TICKET-083 | Quiz version update notifications for buyers                                     | Low      |

_(TICKET-073 was intentionally removed)_

