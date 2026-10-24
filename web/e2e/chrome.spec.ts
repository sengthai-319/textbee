import { expect, test } from '@playwright/test'
import { authenticate } from './session'
import { mockApi } from './mock-api'
import { Routes } from '../config/routes'

// Guards for the app chrome. The dashboard has no page footer: on desktop the
// sidebar runs the full height and carries help and the account (with the
// theme) at its foot; on phones the header's account menu carries both.

test.describe('app chrome (mocked API, no real backend)', () => {
  test('desktop: full-height sidebar, no top bar and no page footer', async ({
    page,
    context,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await authenticate(context)
    await mockApi(page)
    await page.goto('/dashboard')

    const sidebar = page.getByRole('complementary', { name: 'Sidebar' })
    await expect(sidebar).toBeVisible()
    const box = await sidebar.boundingBox()
    expect(box!.y, 'sidebar starts at the top of the window').toBe(0)
    expect(box!.height).toBe(900)

    await expect(page.locator('header')).toBeHidden()
    await expect(page.locator('footer')).toHaveCount(0)
    await expect(sidebar.getByRole('link', { name: 'CrossHub home' })).toBeVisible()
  })

  test('desktop: the help menu holds the setup guides', async ({
    page,
    context,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await authenticate(context)
    await mockApi(page)
    await page.goto('/dashboard')

    await page
      .getByRole('complementary', { name: 'Sidebar' })
      .getByRole('button', { name: 'Help & guides' })
      .click()
    const menu = page.getByRole('menu')
    await expect(menu.getByRole('menuitem', { name: /Setup guide/ })).toHaveAttribute(
      'href',
      Routes.quickstart
    )
    await expect(menu.getByRole('menuitem', { name: /iPhone with Windows/ })).toHaveAttribute(
      'href',
      Routes.setupShortcut
    )
  })

  test('desktop: theme is chosen from the account menu in the sidebar', async ({
    page,
    context,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await authenticate(context)
    await mockApi(page)
    await page.goto('/dashboard')

    const openTheme = async () => {
      await page
        .getByRole('complementary', { name: 'Sidebar' })
        .getByRole('button', { name: 'Account menu' })
        .click()
      await page.getByRole('menuitem', { name: 'Theme' }).click()
    }

    await openTheme()
    await page.getByRole('menuitemradio', { name: 'Light' }).click()
    await expect(page.locator('html')).not.toHaveClass(/dark/)

    await openTheme()
    await page.getByRole('menuitemradio', { name: 'Dark' }).click()
    await expect(page.locator('html')).toHaveClass(/dark/)
  })

  test('desktop: the sidebar collapses to a rail and remembers it', async ({
    page,
    context,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await authenticate(context)
    await mockApi(page)
    await page.goto('/dashboard')

    const sidebar = page.getByRole('complementary', { name: 'Sidebar' })
    const width = async () => (await sidebar.boundingBox())!.width
    expect(await width()).toBe(240)

    await page.getByRole('button', { name: 'Collapse sidebar' }).click()
    await expect.poll(width).toBe(72)
    // Icons only, still reachable by name.
    await expect(sidebar.getByRole('link', { name: 'Messaging' })).toBeVisible()

    await page.reload()
    await expect.poll(width).toBe(72)

    await page.getByRole('button', { name: 'Expand sidebar' }).click()
    await expect.poll(width).toBe(240)
  })

  test('mobile: the header account menu carries theme and help', async ({
    page,
    context,
  }) => {
    await page.setViewportSize({ width: 375, height: 800 })
    await authenticate(context)
    await mockApi(page)
    await page.goto('/dashboard')

    await expect(page.locator('footer')).toHaveCount(0)
    await page.locator('header').getByRole('button', { name: 'Account menu' }).click()
    await expect(page.getByRole('menuitem', { name: 'Theme' })).toBeVisible()
    await expect(page.getByRole('menuitem', { name: 'Help & guides' })).toBeVisible()
    await expect(page.getByRole('menuitem', { name: 'Log out' })).toBeVisible()
  })

  test('top bar is reduced to brand and account', async ({ page, context }) => {
    await authenticate(context)
    await mockApi(page)
    await page.goto('/dashboard')

    const header = page.locator('header')
    await expect(
      header.getByRole('link', { name: /contribute/i })
    ).toHaveCount(0)
    await expect(header.getByRole('button', { name: 'Toggle theme' })).toHaveCount(
      0
    )
  })
})
