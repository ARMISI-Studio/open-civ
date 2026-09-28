import { test, expect } from '@playwright/test'
import { canvas, chooseOption, dragWorld, drawSimpleBeam, element, tool } from './helpers'

test('creates a simple structure, saves it through the API, and reloads it', async ({ page }) => {
  await page.goto('/structures')
  await drawSimpleBeam(page, 'Test beam')
  await expect(page.getByRole('heading', { name: 'No problems found' })).toBeVisible()

  await page.getByRole('button', { name: 'Save structure' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Structure created.' })).toBeVisible()
  await expect(page).toHaveURL(/\/structures\/str_[a-z0-9]+$/)

  await page.reload()
  await expect(page.getByRole('textbox', { name: /Structure name/ })).toHaveValue('Test beam')
  await expect(element(page, 'Member A–B, 4 m')).toBeVisible()
  await expect(element(page, 'Pin support at A')).toBeVisible()
  await expect(element(page, 'Roller support at B')).toBeVisible()
  await expect(element(page, 'Load at B, 10 kN')).toBeVisible()
})

test('edits a saved structure: move, change properties, delete, undo, and save', async ({ page }) => {
  await page.goto('/structures/str_simplebeam')
  await expect(page.getByRole('textbox', { name: /Structure name/ })).toHaveValue(
    'Simply supported beam',
  )
  await expect(element(page, 'Member B–C, 3 m')).toBeVisible()

  // Drag node C from (6, 0) to (8, 0).
  await dragWorld(page, [6, 0], [8, 0])
  await expect(element(page, 'Node C at (8, 0) m')).toBeVisible()
  await expect(element(page, 'Member B–C, 5 m')).toBeVisible()
  await expect(element(page, /^Node C/)).toHaveAttribute('aria-pressed', 'true')

  // Edit coordinates and label in the properties panel.
  await page.getByRole('spinbutton', { name: 'y (m)' }).fill('1.5')
  await expect(element(page, 'Node C at (8, 1.5) m')).toBeVisible()
  await page.getByRole('textbox', { name: 'Label' }).fill('D')
  await expect(element(page, 'Node D at (8, 1.5) m')).toBeVisible()

  // Change the load in the properties panel.
  await element(page, 'Load at B, 10 kN').click()
  await page.getByRole('spinbutton', { name: 'Fy (kN)' }).fill('-20')
  await expect(element(page, 'Load at B, 20 kN')).toBeVisible()

  // Delete with the keyboard, then undo and redo.
  await element(page, 'Load at B, 20 kN').focus()
  await page.keyboard.press('Delete')
  await expect(element(page, /^Load at B/)).toHaveCount(0)
  await page.getByRole('button', { name: 'Undo' }).click()
  await expect(element(page, 'Load at B, 20 kN')).toBeVisible()
  await page.getByRole('button', { name: 'Redo' }).click()
  await expect(element(page, /^Load at B/)).toHaveCount(0)

  // Deleting a node removes its members and support.
  await element(page, /^Node D/).click()
  await page.getByRole('button', { name: 'Delete node' }).click()
  await expect(element(page, /^Node D/)).toHaveCount(0)
  await expect(element(page, /^Member B–D/)).toHaveCount(0)
  await expect(element(page, /support at D/)).toHaveCount(0)
  await page.getByRole('button', { name: 'Undo' }).click()
  await expect(element(page, 'Member B–D, 5.22 m')).toBeVisible()

  await page.getByRole('button', { name: 'Save structure' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Changes saved.' })).toBeVisible()
  await page.reload()
  await expect(element(page, 'Node D at (8, 1.5) m')).toBeVisible()
  await expect(element(page, /^Load at B/)).toHaveCount(0)
})

test('shows validation errors instead of saving an invalid structure', async ({ page }) => {
  await page.goto('/structures')
  await tool(page, 'Node').click()
  const box = (await canvas(page).boundingBox())!
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
  await page.getByRole('button', { name: 'Save structure' }).click()

  await expect(page.getByRole('alert').filter({ hasText: /Fix 2 problems before saving/ })).toBeVisible()
  await expect(page.getByText('Enter a name for the structure.').first()).toBeVisible()
  await expect(page.getByRole('textbox', { name: /Structure name/ })).toHaveAttribute(
    'aria-invalid',
    'true',
  )
  await expect(page.getByText('Add at least one member.')).toBeVisible()
  await expect(page).toHaveURL(/\/structures$/)

  // Fix the problems with the keyboard-friendly controls in the properties panel.
  await page.getByRole('textbox', { name: /Structure name/ }).fill('Frame')
  await canvas(page).focus()
  await page.keyboard.press('Escape')
  await page.getByRole('spinbutton', { name: 'New node x (m)' }).fill('3')
  await page.getByRole('spinbutton', { name: 'New node y (m)' }).fill('-1')
  await page.getByRole('button', { name: 'Add node' }).click()
  await expect(page.getByRole('heading', { name: 'Node B' })).toBeVisible()
  await chooseOption(page, 'Connect to node', /^Node A/)
  await page.getByRole('button', { name: 'Add member' }).click()
  await expect(page.getByRole('heading', { name: 'No problems found' })).toBeVisible()
  await page.getByRole('button', { name: 'Save structure' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Structure created.' })).toBeVisible()
})

test('adds a zero load and flags it as invalid on the drawing', async ({ page }) => {
  await page.goto('/structures/str_cantilever')
  await expect(element(page, 'Load at B, 5 kN')).toBeVisible()
  await element(page, 'Load at B, 5 kN').click()
  await page.getByRole('spinbutton', { name: 'Fy (kN)' }).fill('0')
  await expect(page.getByRole('heading', { name: '1 problem to fix before saving' })).toBeVisible()
  await expect(canvas(page).locator('.structure-canvas__load--invalid')).toHaveCount(1)
  await expect(canvas(page).locator('.structure-canvas__marker')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Load at B has zero force.' })).toBeVisible()
})

test('opens saved structures from the list and handles missing ones', async ({ page }) => {
  await page.goto('/structures')
  await chooseOption(page, 'Open a saved structure', /^Cantilever/)
  await expect(page).toHaveURL(/\/structures\/str_cantilever$/)
  await expect(element(page, 'Fixed support at A')).toBeVisible()

  await page.goto('/structures/str_does_not_exist')
  await expect(page.getByRole('alert')).toContainText('This structure doesn’t exist or was deleted.')
  await page.getByRole('link', { name: 'Start a new structure' }).click()
  await expect(page).toHaveURL(/\/structures$/)
  await expect(page.getByRole('textbox', { name: /Structure name/ })).toHaveValue('')
})

test('deletes a saved structure after confirmation', async ({ page }) => {
  await page.goto('/structures/str_cantilever')
  await expect(element(page, 'Fixed support at A')).toBeVisible()
  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'Delete structure' }).click()
  await expect(page).toHaveURL(/\/structures$/)
  await chooseOption(page, 'Open a saved structure', /^Simply supported beam/)
  await expect(page.getByRole('option', { name: /Cantilever/ })).toHaveCount(0)
})

test('asks before leaving the editor with unsaved changes', async ({ page }) => {
  await page.goto('/structures/str_simplebeam')
  await expect(element(page, 'Member A–B, 3 m')).toBeVisible()
  await page.getByRole('textbox', { name: /Structure name/ }).fill('Renamed beam')
  const builderTab = page
    .getByRole('navigation', { name: 'Main' })
    .getByRole('link', { name: 'Question Builder' })

  page.once('dialog', (dialog) => {
    expect(dialog.message()).toContain('You have unsaved changes.')
    return dialog.dismiss()
  })
  await builderTab.click()
  await expect(page).toHaveURL(/\/structures\/str_simplebeam$/)
  await expect(page.getByRole('textbox', { name: /Structure name/ })).toHaveValue('Renamed beam')

  page.once('dialog', (dialog) => dialog.accept())
  await builderTab.click()
  await expect(page).toHaveURL(/\/questions\/create$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Question Builder' })).toBeVisible()
})
