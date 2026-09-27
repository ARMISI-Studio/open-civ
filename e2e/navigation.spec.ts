import { test, expect } from '@playwright/test'

const TABS = [
  { name: 'Structure Editor', path: '/structures' },
  { name: 'Question Builder', path: '/questions/create' },
  { name: 'Answer Questions', path: '/questions/answer' },
]

test('root opens the Structure Editor', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/structures$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Structure Editor' })).toBeVisible()
})

test('navigates between the three main tabs', async ({ page }) => {
  await page.goto('/')
  const nav = page.getByRole('navigation', { name: 'Main' })
  for (const tab of [...TABS, TABS[0]!]) {
    await nav.getByRole('link', { name: tab.name }).click()
    await expect(page).toHaveURL(new RegExp(`${tab.path}$`))
    await expect(page.getByRole('heading', { level: 1, name: tab.name })).toBeVisible()
    await expect(nav.getByRole('link', { name: tab.name })).toHaveAttribute('aria-current', 'page')
    await expect(nav.locator('[aria-current="page"]')).toHaveCount(1)
  }
})

for (const tab of TABS) {
  test(`loads ${tab.path} by direct URL and after reload`, async ({ page }) => {
    await page.goto(tab.path)
    await expect(page.getByRole('heading', { level: 1, name: tab.name })).toBeVisible()
    await page.reload()
    await expect(page.getByRole('heading', { level: 1, name: tab.name })).toBeVisible()
    await expect(
      page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: tab.name }),
    ).toHaveAttribute('aria-current', 'page')
  })
}

test('unknown routes show a not-found page with a way back', async ({ page }) => {
  await page.goto('/no/such/page')
  await expect(page.getByRole('heading', { level: 1, name: 'Page not found' })).toBeVisible()
  await page.getByRole('link', { name: 'Go to the Structure Editor' }).click()
  await expect(page).toHaveURL(/\/structures$/)
})
