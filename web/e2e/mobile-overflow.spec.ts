import { expect, test } from '@playwright/test'
import { authenticate } from './session'
import { mockApi } from './mock-api'

// Regression guard for mobile horizontal overflow: at 375px no page may be
// wider than the viewport (the bug showed a blank strip when scrolling right).
// document.scrollingElement covers the page; body scrollWidth catches clipped
// overflow introduced inside the layout.

const AUTHED_PAGES = [
  '/dashboard',
  '/dashboard/messaging',
  '/dashboard/messaging/bulk',
  '/dashboard/messaging/history',
  '/dashboard/messaging/api-guide',
  '/dashboard/webhooks',
  '/dashboard/webhooks/deliveries',
  // The profile tab, not /dashboard/account: that route is a redirect stub
  // with no layout of its own, and measuring it raced the redirect. The
  // redirect itself is covered in account.spec.ts.
  '/dashboard/account/profile',
  '/dashboard/account/security',
  '/dashboard/account/support',
]

// Deterministic replacement for waitForLoadState('networkidle'), which needs a
// 500ms window with zero connections. Link prefetching keeps issuing and
// aborting RSC requests, so under parallel workers that window can be missed
// until the test times out. Waiting for the page's own heading and for its
// loading placeholders to clear proves the same thing: content is laid out.
async function waitForContent(page: import('@playwright/test').Page) {
  await expect(page.locator('main#main-content h2').first()).toBeVisible()
  await expect(page.locator('main#main-content [role="status"]')).toHaveCount(0)
}

async function expectNoHorizontalScroll(page: import('@playwright/test').Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth
  )
  expect(overflow, 'page must not scroll sideways at 375px').toBeLessThanOrEqual(
    0
  )
}

test.describe('no horizontal overflow at 375px (mocked API)', () => {
  test.use({ viewport: { width: 375, height: 800 } })

  for (const path of AUTHED_PAGES) {
    test(`authed page ${path}`, async ({ page, context }) => {
      await authenticate(context)
      await mockApi(page)
      await page.goto(path)
      await waitForContent(page)
      await expectNoHorizontalScroll(page)
    })
  }

  test('login page', async ({ page }) => {
    await mockApi(page)
    await page.goto('/login')
    await expect(page.getByText('Welcome back')).toBeVisible()
    await expectNoHorizontalScroll(page)
  })
})
