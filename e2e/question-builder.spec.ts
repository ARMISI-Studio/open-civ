import { test, expect, type Page } from '@playwright/test'
import { chooseOption, clickWorld, createSharedQuestion, element, tool } from './helpers'

async function fillQuestion(page: Page) {
  await page.getByRole('textbox', { name: /^Title/ }).fill('Find the support reaction')
  await page.getByRole('textbox', { name: /^Prompt/ }).fill('What is the vertical reaction at A?')
  await page.getByRole('textbox', { name: 'Option 1', exact: true }).fill('0 kN')
  await page.getByRole('textbox', { name: 'Option 2', exact: true }).fill('5 kN upward')
  await page.getByRole('button', { name: 'Add option' }).click()
  await page.getByRole('textbox', { name: 'Option 3', exact: true }).fill('10 kN upward')
  await page.getByRole('radio', { name: 'Option 2 is correct' }).check()
  await page.getByRole('textbox', { name: /^Explanation/ }).fill('By symmetry each support takes half of 10 kN.')
}

test('creates a question from an existing structure and shares it', async ({ page }) => {
  await page.goto('/questions/new')
  await fillQuestion(page)
  await chooseOption(page, 'Structure (required)', /^Simply supported beam/)
  const preview = page.getByRole('figure')
  await expect(preview).toContainText('Simply supported beam')
  await expect(preview.getByRole('group', { name: 'Diagram of Simply supported beam' })).toBeVisible()

  await expect(page.getByRole('button', { name: 'Create share link' })).toBeDisabled()
  await page.getByRole('button', { name: 'Save question' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Question saved.' })).toBeVisible()
  await expect(page).toHaveURL(/\/questions\/q_[a-z0-9]+$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Edit question' })).toBeVisible()

  await page.getByRole('button', { name: 'Create share link' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Shared.' })).toBeVisible()
  const link = page.getByRole('textbox', { name: 'Share link' })
  await expect(link).toHaveValue(/\/answers\/[A-Z2-9]{8}$/)
  const url = await link.inputValue()
  const code = url.split('/').pop()!
  await expect(page.getByText(`Share code: ${code}`)).toBeVisible()
  await expect(page.getByRole('link', { name: /Open the answer page/ })).toHaveAttribute('href', url)
})

test('creates a question with a new structure drawn in the builder', async ({ page }) => {
  await page.goto('/questions/new')
  await fillQuestion(page)
  await page.getByRole('radio', { name: /Draw a new structure/ }).check()
  await expect(page.getByRole('group', { name: 'Drawing tools' })).toBeVisible()

  // Saving an empty structure is blocked with an explanation.
  await page.getByRole('button', { name: 'Save question' }).click()
  await expect(page.getByText('Fix the structure problems listed under the drawing.')).toBeVisible()

  await page.getByRole('textbox', { name: /^Structure name/ }).fill('Builder cantilever')
  await tool(page, 'Node').click()
  await clickWorld(page, 0, 0)
  await clickWorld(page, 3, 0)
  await tool(page, 'Member').click()
  await element(page, /^Node A/).click()
  await element(page, /^Node B/).click()
  await page.keyboard.press('Escape')
  await tool(page, 'Support').click()
  await element(page, /^Node A/).click()
  await chooseOption(page, 'Support type', /^Fixed/)
  await tool(page, 'Load').click()
  await element(page, /^Node B/).click()
  await expect(page.getByRole('heading', { name: 'No problems found' })).toBeVisible()

  await page.getByRole('button', { name: 'Save question' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Question saved.' })).toBeVisible()
  await page.getByRole('button', { name: 'Create share link' }).click()
  await expect(page.getByRole('textbox', { name: 'Share link' })).toHaveValue(
    /\/answers\/[A-Z2-9]{8}$/,
  )

  // The new structure was saved through the API and is now in the Structures list.
  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Structures' }).click()
  await page
    .getByRole('list', { name: 'Saved structures' })
    .getByRole('link', { name: /^Builder cantilever/ })
    .click()
  await expect(element(page, 'Fixed support at A')).toBeVisible()
  await expect(element(page, 'Load at B, 10 kN')).toBeVisible()
})

test('shows validation errors and requires saving changes before sharing', async ({ page }) => {
  await page.goto('/questions/new')
  await page.getByRole('button', { name: 'Save question' }).click()
  await expect(page.getByRole('alert').filter({ hasText: /Fix 6 problems before saving/ })).toBeVisible()
  await expect(page.getByText('Enter a title.')).toBeVisible()
  await expect(page.getByText('Enter the question prompt.')).toBeVisible()
  await expect(page.getByText('Choose a structure for this question.')).toBeVisible()
  await expect(page.getByText('Mark the correct option.')).toBeVisible()
  await expect(page.getByText('Enter the option text.')).toHaveCount(2)
  await expect(page.getByRole('textbox', { name: /^Title/ })).toHaveAttribute('aria-invalid', 'true')

  await fillQuestion(page)
  await page.getByRole('textbox', { name: 'Option 3', exact: true }).fill('0 KN')
  await expect(page.getByText('This option repeats another one.')).toBeVisible()
  await page.getByRole('button', { name: 'Remove option 3' }).click()
  await chooseOption(page, 'Structure (required)', /^Cantilever/)
  await page.getByRole('button', { name: 'Save question' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Question saved.' })).toBeVisible()

  await page.getByRole('textbox', { name: /^Title/ }).fill('Edited title')
  await expect(page.getByText('You have unsaved changes.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Create share link' })).toBeDisabled()
  await expect(page.getByText('Save your changes before sharing.')).toBeVisible()
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(page.getByRole('button', { name: 'Create share link' })).toBeEnabled()

  // The structure is now used by a question, so the API refuses to delete it.
  await page.goto('/structures/str_cantilever')
  await expect(element(page, 'Fixed support at A')).toBeVisible()
  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'Delete structure' }).click()
  await expect(page.getByRole('alert')).toContainText(
    'This structure is used by a question and can’t be deleted.',
  )
  await expect(page).toHaveURL(/\/structures\/str_cantilever$/)
})

test('lists questions with share status and reopens one for editing', async ({ page }) => {
  await page.goto('/questions')
  await expect(page.getByText('No questions yet. Create one from a structure.')).toBeVisible()

  const url = await createSharedQuestion(page)
  const shareId = url.split('/').pop()!
  await page.getByRole('link', { name: '← All questions' }).click()
  await expect(page).toHaveURL(/\/questions$/)
  const card = page
    .getByRole('list', { name: 'Your questions' })
    .getByRole('link', { name: /^Find the support reaction/ })
  await expect(card).toContainText('Structure: Simply supported beam')
  await expect(card).toContainText(`Shared · ${shareId}`)

  await card.click()
  await expect(page.getByRole('heading', { level: 1, name: 'Edit question' })).toBeVisible()
  await expect(page.getByRole('textbox', { name: /^Title/ })).toHaveValue('Find the support reaction')
  await expect(page.getByRole('radio', { name: 'Option 2 is correct' })).toBeChecked()
  await expect(page.getByRole('textbox', { name: 'Share link' })).toHaveValue(url)

  await page.getByRole('textbox', { name: /^Title/ }).fill('Support reaction at A')
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Question saved.' })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('textbox', { name: /^Title/ })).toHaveValue('Support reaction at A')

  await page.goto('/questions/q_missing')
  await expect(page.getByRole('alert')).toContainText('This question doesn’t exist or was deleted.')
})
