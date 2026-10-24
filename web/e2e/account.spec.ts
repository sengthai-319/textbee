import { expect, test } from '@playwright/test'
import { authenticate } from './session'
import { mockApi } from './mock-api'

test.describe('account settings (mocked API, no real backend)', () => {
  test('/dashboard/account redirects to the profile tab', async ({
    page,
    context,
  }) => {
    await authenticate(context)
    await mockApi(page)
    await page.goto('/dashboard/account')

    await expect(page).toHaveURL(/\/dashboard\/account\/profile/)
    const nav = page.getByRole('navigation', { name: 'Section navigation' })
    await expect(
      nav.getByRole('link', { name: 'Profile' })
    ).toHaveAttribute('aria-current', 'page')
  })

  // The sidebar used to link to /dashboard/account, whose page is a server
  // redirect stub, so every click paid navigation + redirect + navigation.
  test('the sidebar Account link goes straight to the profile tab with no redirect hop', async ({
    page,
    context,
  }) => {
    await authenticate(context)
    await mockApi(page)

    const stubHits: string[] = []
    page.on('request', (request) => {
      if (new URL(request.url()).pathname === '/dashboard/account') {
        stubHits.push(request.url())
      }
    })

    await page.goto('/dashboard')
    await page
      .getByRole('navigation', { name: 'Main' })
      .getByRole('link', { name: 'Account' })
      .click()

    await expect(page).toHaveURL(/\/dashboard\/account\/profile$/)
    expect(stubHits).toEqual([])
  })

  // Password managers key off autoComplete to tell the three password boxes
  // apart. Without it they fill the saved password into the wrong field.
  test('password fields declare their autocomplete roles', async ({
    page,
    context,
  }) => {
    await authenticate(context)
    await mockApi(page)
    await page.goto('/dashboard/account/security')

    await expect(page.getByLabel('Old Password')).toHaveAttribute(
      'autocomplete',
      'current-password'
    )
    await expect(page.getByLabel('New Password')).toHaveAttribute(
      'autocomplete',
      'new-password'
    )
    await expect(page.getByLabel('Confirm Password')).toHaveAttribute(
      'autocomplete',
      'new-password'
    )
  })

  // The most destructive action in the app had a label pointing at an id that
  // did not exist and an email field with no label at all.
  test('the delete-account fields are reachable by their labels', async ({
    page,
    context,
  }) => {
    await authenticate(context)
    await mockApi(page)
    await page.goto('/dashboard/account/security')

    await page.getByRole('button', { name: 'Delete Account' }).click()
    const dialog = page.getByRole('dialog')

    await dialog.getByLabel('Reason for deletion').fill('Testing labels')
    await dialog
      .getByLabel('Type your email address to confirm')
      .fill('test@example.com')

    await expect(dialog.getByLabel('Reason for deletion')).toHaveValue(
      'Testing labels'
    )
  })

  test('security deep link survives refresh and separates the danger zone', async ({
    page,
    context,
  }) => {
    await authenticate(context)
    await mockApi(page)
    await page.goto('/dashboard/account/security')

    const nav = page.getByRole('navigation', { name: 'Section navigation' })
    await expect(nav.getByRole('link', { name: 'Security' })).toHaveAttribute(
      'aria-current',
      'page'
    )
    await expect(page.getByText('Password', { exact: true })).toBeVisible()
    await expect(page.getByText('Danger zone')).toBeVisible()
    await expect(
      page.getByRole('heading', { name: 'Delete Account' })
    ).toBeVisible()
  })

  test('legacy routes redirect into the merged settings', async ({
    page,
    context,
  }) => {
    await authenticate(context)
    await mockApi(page)

    await page.goto('/dashboard/account/change-password')
    await expect(page).toHaveURL(/\/dashboard\/account\/security/)

    await page.goto('/dashboard/account/edit-profile')
    await expect(page).toHaveURL(/\/dashboard\/account\/profile/)
  })

  test('a deep link on a phone keeps the page at the top and the tab in view', async ({
    page,
    context,
  }) => {
    await page.setViewportSize({ width: 375, height: 500 })
    await authenticate(context)
    await mockApi(page)
    await page.goto('/dashboard/account/support')

    const tab = page
      .getByRole('navigation', { name: 'Section navigation' })
      .getByRole('link', { name: 'Support' })
    await expect(tab).toHaveAttribute('aria-current', 'page')
    await expect(
      page.getByRole('navigation', { name: 'Breadcrumb' })
    ).toBeInViewport()
    expect(await page.evaluate(() => window.scrollY)).toBe(0)

    const strip = page.getByRole('navigation', { name: 'Section navigation' })
    await expect
      .poll(async () => {
        const [outer, inner] = await Promise.all([
          strip.boundingBox(),
          tab.boundingBox(),
        ])
        return Boolean(
          outer &&
            inner &&
            inner.x >= outer.x &&
            inner.x + inner.width <= outer.x + outer.width + 1
        )
      })
      .toBe(true)
    expect(await page.evaluate(() => window.scrollY)).toBe(0)
  })
})
