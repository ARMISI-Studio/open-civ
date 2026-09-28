import { test, expect, type Page } from '@playwright/test'
import { createSharedQuestion, element } from './helpers'

test.use({ viewport: { width: 375, height: 740 }, hasTouch: true })

async function expectNoHorizontalOverflow(page: Page) {
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }))
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth)
}

test('main navigation stays usable on a phone without horizontal overflow', async ({ page }) => {
  await page.goto('/')
  const nav = page.getByRole('navigation', { name: 'Main' })
  const tabs = ['Structures', 'Questions', 'Answers']

  for (const name of tabs) {
    const link = nav.getByRole('link', { name })
    await expect(link).toBeVisible()
    const box = (await link.boundingBox())!
    expect(box.x).toBeGreaterThanOrEqual(0)
    expect(box.x + box.width).toBeLessThanOrEqual(375)
    expect(box.height).toBeGreaterThanOrEqual(44)
  }

  for (const name of [...tabs, tabs[0]!]) {
    await nav.getByRole('link', { name }).tap()
    await expect(page.getByRole('heading', { level: 1, name })).toBeVisible()
    await expect(nav.getByRole('link', { name })).toHaveAttribute('aria-current', 'page')
    await expectNoHorizontalOverflow(page)
  }
})

test('the structure editor stacks on a phone and properties collapse', async ({ page }) => {
  await page.goto('/structures/str_simplebeam')
  await expect(element(page, 'Member A–B, 3 m')).toBeVisible()
  await expectNoHorizontalOverflow(page)

  const properties = page.locator('details.structure-workspace__properties')
  await expect(properties).not.toHaveAttribute('open')
  await element(page, /^Node C/).tap()
  await expect(properties).toHaveAttribute('open')
  await expect(page.getByRole('heading', { name: 'Node C' })).toBeVisible()
  await expectNoHorizontalOverflow(page)
})

test('answering a shared question works on a phone', async ({ page }) => {
  const url = await createSharedQuestion(page)
  await expectNoHorizontalOverflow(page)
  await page.goto(url)
  await page.getByRole('radio', { name: '5 kN upward' }).tap()
  await page.getByRole('button', { name: 'Submit answer' }).tap()
  await expect(page.getByRole('status').filter({ hasText: 'Correct!' })).toBeVisible()
  await expectNoHorizontalOverflow(page)
})
