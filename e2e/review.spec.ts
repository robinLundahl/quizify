import { test, expect } from '@playwright/test'

const SERVER = 'http://localhost:3001'

async function loginAsTestUser(page: import('@playwright/test').Page) {
  const res = await page.request.post(`${SERVER}/api/auth/dev-login`)
  expect(res.ok()).toBeTruthy()
  const { token } = await res.json() as { token: string }
  await page.context().addCookies([{
    name: 'token',
    value: token,
    domain: 'localhost',
    path: '/',
    httpOnly: true,
    sameSite: 'Lax',
  }])
}

async function getFirstListingId(page: import('@playwright/test').Page): Promise<string | null> {
  const res = await page.request.get(`${SERVER}/api/marketplace`)
  const { listings } = await res.json() as { listings: { id: string }[] }
  return listings[0]?.id ?? null
}

async function setupFinishedSession(
  page: import('@playwright/test').Page,
  listingId: string,
): Promise<string> {
  await page.request.post(`${SERVER}/api/marketplace/${listingId}/dev-claim`)
  const listingRes = await page.request.get(`${SERVER}/api/marketplace/${listingId}`)
  const listing = await listingRes.json() as { quiz: { id: string } }
  const sessionRes = await page.request.post(`${SERVER}/api/sessions`, {
    data: { quizId: listing.quiz.id, listingId },
  })
  const { sessionId } = await sessionRes.json() as { sessionId: string }
  await page.request.post(`${SERVER}/api/sessions/${sessionId}/dev-finish`)
  return sessionId
}

function skipIfNoListings(listingId: string | null) {
  if (!listingId) test.skip(true, 'No published listings in dev DB — publish one first')
}

// ─── ResultsView tests ────────────────────────────────────────────────────────

test('review modal appears when clicking Back to Dashboard from ResultsView', async ({ page }) => {
  await loginAsTestUser(page)
  const listingId = await getFirstListingId(page)
  skipIfNoListings(listingId)

  const sessionId = await setupFinishedSession(page, listingId!)

  await page.goto(`/results/${sessionId}`)
  await page.waitForLoadState('networkidle')

  // Modal must NOT auto-appear on page load
  await expect(page.getByText('How was this quiz?')).not.toBeVisible()

  // Click Back to Dashboard → modal intercepts
  await page.getByRole('button', { name: /dashboard/i }).click()
  await expect(page.getByText('How was this quiz?')).toBeVisible({ timeout: 5_000 })

  // Submit a review and land on dashboard
  await page.getByRole('button', { name: '5 star' }).click()
  await page.getByRole('button', { name: /submit review/i }).click()
  await expect(page.getByText('Thanks for your review!')).toBeVisible({ timeout: 5_000 })
  await page.getByRole('button', { name: /close/i }).click()
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 5_000 })
})

test('Back to Dashboard navigates directly when review prompt already dismissed', async ({ page }) => {
  await loginAsTestUser(page)
  const listingId = await getFirstListingId(page)
  skipIfNoListings(listingId)

  const sessionId = await setupFinishedSession(page, listingId!)
  // Pre-dismiss so reviewPromptSeen = true before we visit results
  await page.request.post(`${SERVER}/api/marketplace/${listingId}/dismiss-review-prompt`)

  await page.goto(`/results/${sessionId}`)
  await page.waitForLoadState('networkidle')

  await page.getByRole('button', { name: /dashboard/i }).click()
  await expect(page.getByText('How was this quiz?')).not.toBeVisible()
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 5_000 })
})

test('modal does not reappear after dismissal on ResultsView', async ({ page }) => {
  await loginAsTestUser(page)
  const listingId = await getFirstListingId(page)
  skipIfNoListings(listingId)

  const sessionId = await setupFinishedSession(page, listingId!)

  await page.goto(`/results/${sessionId}`)
  await page.waitForLoadState('networkidle')

  await page.getByRole('button', { name: /dashboard/i }).click()
  await expect(page.getByText('How was this quiz?')).toBeVisible({ timeout: 5_000 })

  // Skip → navigates to dashboard (reviewPromptSeen = true)
  await page.getByRole('button', { name: /skip/i }).click()
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 5_000 })

  // Return to results — button should now navigate directly without modal
  await page.goto(`/results/${sessionId}`)
  await page.waitForLoadState('networkidle')
  await page.getByRole('button', { name: /dashboard/i }).click()
  await expect(page.getByText('How was this quiz?')).not.toBeVisible()
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 5_000 })
})

// ─── Listing page tests ───────────────────────────────────────────────────────

test('listing page shows "complete a session" hint for buyers without a finished session', async ({ page }) => {
  await loginAsTestUser(page)
  const listingId = await getFirstListingId(page)
  skipIfNoListings(listingId)

  await page.request.post(`${SERVER}/api/marketplace/${listingId!}/dev-claim`)
  await page.goto(`/marketplace/${listingId}`)
  await page.waitForLoadState('networkidle')

  await expect(page.getByText(/complete a game session to leave a review/i)).toBeVisible()
  await expect(page.getByRole('button', { name: /leave a review/i })).not.toBeVisible()
})

test('non-buyer sees no review controls on listing page', async ({ page }) => {
  await loginAsTestUser(page)
  const listingId = await getFirstListingId(page)
  skipIfNoListings(listingId)

  await page.goto(`/marketplace/${listingId}`)
  await page.waitForLoadState('networkidle')

  await expect(page.getByText(/complete a game session/i)).not.toBeVisible()
  await expect(page.getByRole('button', { name: /leave a review/i })).not.toBeVisible()
})
