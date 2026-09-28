import { test, expect } from '@playwright/test'
import { createSharedQuestion } from './helpers'

test('opens a shared link and answers the question', async ({ page }) => {
  const url = await createSharedQuestion(page)
  const shareId = url.split('/').pop()!

  await page.goto(url)
  await expect(page.getByRole('heading', { level: 2, name: 'Find the support reaction' })).toBeVisible()
  await expect(page.getByText('What is the vertical reaction at A?')).toBeVisible()
  await expect(page.getByText(`Shared question · ${shareId}`)).toBeVisible()
  await expect(page.getByRole('group', { name: 'Diagram of Simply supported beam' })).toBeVisible()
  await expect(
    page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Answer Questions' }),
  ).toHaveAttribute('aria-current', 'page')

  const submit = page.getByRole('button', { name: 'Submit answer' })
  await expect(submit).toBeDisabled()
  await page.getByRole('radio', { name: '5 kN upward' }).check()
  await expect(submit).toBeEnabled()
  await submit.click()

  await expect(page.getByRole('status').filter({ hasText: 'Correct!' })).toBeVisible()
  await expect(page.getByText('By symmetry each support carries half of the 10 kN load.')).toBeVisible()
  await expect(page.getByText('✓ Correct answer')).toBeVisible()
  // Submitted: the answer is locked and cannot be sent twice.
  await expect(page.getByRole('button', { name: 'Submit answer' })).toHaveCount(0)
  await expect(page.getByRole('radio', { name: '0 kN' })).toBeDisabled()
  await page.getByRole('link', { name: 'Answer another question' }).click()
  await expect(page).toHaveURL(/\/questions\/answer$/)
})

test('shows feedback for a wrong answer', async ({ page }) => {
  const url = await createSharedQuestion(page)
  await page.goto(url)
  await page.getByRole('radio', { name: '0 kN' }).check()
  await page.getByRole('button', { name: 'Submit answer' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Not quite.' })).toBeVisible()
  await expect(page.getByText('✗ Your answer')).toBeVisible()
  await expect(page.getByText('✓ Correct answer')).toBeVisible()
})

test('opens a shared question from a share code or pasted link', async ({ page }) => {
  const url = await createSharedQuestion(page)
  const shareId = url.split('/').pop()!

  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Answer Questions' }).click()
  const input = page.getByRole('textbox', { name: 'Share code or link' })

  await page.getByRole('button', { name: 'Open question' }).click()
  await expect(page.getByText('Enter a share code or link.')).toBeVisible()
  await input.fill('not a code!')
  await page.getByRole('button', { name: 'Open question' }).click()
  await expect(page.getByText('That doesn’t look like a share code or link.')).toBeVisible()
  await expect(input).toHaveAttribute('aria-invalid', 'true')

  await input.fill(shareId.toLowerCase())
  await input.press('Enter')
  await expect(page).toHaveURL(new RegExp(`/questions/answer/${shareId}$`))
  await expect(page.getByRole('heading', { level: 2, name: 'Find the support reaction' })).toBeVisible()

  await page.goto('/questions/answer')
  await page.getByRole('textbox', { name: 'Share code or link' }).fill(url)
  await page.getByRole('button', { name: 'Open question' }).click()
  await expect(page).toHaveURL(new RegExp(`/questions/answer/${shareId}$`))
})

test('shared links survive a reload and unknown codes show an error', async ({ page }) => {
  const url = await createSharedQuestion(page)
  await page.goto(url)
  await page.reload()
  await expect(page.getByRole('heading', { level: 2, name: 'Find the support reaction' })).toBeVisible()

  await page.goto('/questions/answer/ZZZZ9999')
  await expect(page.getByRole('status').filter({ hasText: 'Loading the shared question…' })).toBeVisible()
  await expect(page.getByRole('alert')).toContainText(
    'This share link is invalid or the question is no longer shared.',
  )
  await page.getByRole('link', { name: 'Enter a different code' }).click()
  await expect(page.getByRole('textbox', { name: 'Share code or link' })).toBeVisible()
})
