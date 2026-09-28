import { test, expect } from '@playwright/test'

const TABS = [
  { name: 'Structures', path: '/structures' },
  { name: 'Questions', path: '/questions' },
  { name: 'Answers', path: '/answers' },
]

test('root opens the Structures tab', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/structures$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Structures' })).toBeVisible()
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

test('each list has a "new" action that opens an empty editor, and back returns to the list', async ({
  page,
}) => {
  await page.goto('/structures')
  await page.getByRole('button', { name: 'New structure' }).click()
  await expect(page).toHaveURL(/\/structures\/new$/)
  await expect(page.getByRole('heading', { level: 1, name: 'New structure' })).toBeVisible()
  await page.getByRole('link', { name: '← All structures' }).click()
  await expect(page).toHaveURL(/\/structures$/)

  await page.goto('/questions')
  await page.getByRole('button', { name: 'New question' }).click()
  await expect(page).toHaveURL(/\/questions\/new$/)
  await expect(page.getByRole('heading', { level: 1, name: 'New question' })).toBeVisible()
  await expect(
    page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Questions' }),
  ).toHaveAttribute('aria-current', 'page')
  await page.getByRole('link', { name: '← All questions' }).click()
  await expect(page).toHaveURL(/\/questions$/)
})

test('earlier paths redirect to the new routes', async ({ page }) => {
  await page.goto('/questions/create')
  await expect(page).toHaveURL(/\/questions\/new$/)
  await page.goto('/questions/answer')
  await expect(page).toHaveURL(/\/answers$/)
  await page.goto('/questions/answer/ABCD2345')
  await expect(page).toHaveURL(/\/answers\/ABCD2345$/)
})

test('unknown routes show a not-found page with a way back', async ({ page }) => {
  await page.goto('/no/such/page')
  await expect(page.getByRole('heading', { level: 1, name: 'Page not found' })).toBeVisible()
  await page.getByRole('link', { name: 'Go to Structures' }).click()
  await expect(page).toHaveURL(/\/structures$/)
})
