import { test, expect, type Page } from '@playwright/test'

// While a select is open, reka-ui marks the rest of the page aria-hidden (modal listbox pattern),
// so triggers and other page controls are located with includeHidden.
function combobox(page: Page, name: string) {
  return page.getByRole('combobox', { name, exact: true, includeHidden: true })
}

test.beforeEach(async ({ page }) => {
  await page.goto('/ui-preview')
  await expect(page.getByRole('heading', { level: 1, name: 'UI preview' })).toBeVisible()
})

test('select opens and navigates with the keyboard, selects with Enter, and returns focus', async ({
  page,
}) => {
  const trigger = combobox(page, 'Support type')
  await trigger.focus()
  await page.keyboard.press('Enter')
  const listbox = page.getByRole('listbox')
  await expect(listbox).toBeVisible()
  await expect(trigger).toHaveAttribute('aria-expanded', 'true')
  await expect(page.getByRole('option', { name: 'Pin' })).toBeFocused()

  await page.keyboard.press('ArrowDown')
  await expect(page.getByRole('option', { name: 'Roller' })).toBeFocused()
  // Fixed is disabled: ArrowDown skips it and stays on Roller.
  await page.keyboard.press('ArrowDown')
  await expect(page.getByRole('option', { name: 'Roller' })).toBeFocused()

  await page.keyboard.press('Enter')
  await expect(listbox).toBeHidden()
  await expect(trigger).toBeFocused()
  await expect(trigger).toContainText('Roller')
  await expect(page.getByTestId('preview-values')).toContainText('Support: roller')

  await page.keyboard.press('Enter')
  await expect(page.getByRole('option', { name: 'Roller' })).toHaveAttribute(
    'aria-selected',
    'true',
  )
})

test('typing jumps to a matching option', async ({ page }) => {
  const trigger = combobox(page, 'Material')
  await trigger.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('listbox')).toBeVisible()
  await page.keyboard.type('ti')
  await expect(page.getByRole('option', { name: 'Timber' })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(trigger).toContainText('Timber')
})

test('disabled options cannot be chosen with the mouse', async ({ page }) => {
  const trigger = combobox(page, 'Support type')
  await trigger.click()
  const fixed = page.getByRole('option', { name: 'Fixed' })
  await expect(fixed).toHaveAttribute('aria-disabled', 'true')
  // A real mouse press on the disabled row (click() would wait for it to become enabled).
  await fixed.hover()
  await page.mouse.down()
  await page.mouse.up()
  await expect(page.getByTestId('preview-values')).toContainText('Support: none')
  await page.getByRole('option', { name: 'Pin' }).click()
  await expect(trigger).toContainText('Pin')
})

test('Escape closes without selecting and returns focus to the trigger', async ({ page }) => {
  const trigger = combobox(page, 'Support type')
  await trigger.focus()
  await page.keyboard.press('ArrowDown')
  await expect(page.getByRole('listbox')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('listbox')).toBeHidden()
  await expect(trigger).toBeFocused()
  await expect(trigger).toHaveAttribute('aria-expanded', 'false')
  await expect(page.getByTestId('preview-values')).toContainText('Support: none')
})

test('Tab closes the panel and continues normal focus navigation', async ({ page }) => {
  const trigger = combobox(page, 'Support type')
  await trigger.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('listbox')).toBeVisible()
  await page.keyboard.press('Tab')
  await expect(page.getByRole('listbox')).toBeHidden()
  await expect(combobox(page, 'Material')).toBeFocused()

  await page.keyboard.press('Enter')
  await expect(page.getByRole('listbox')).toBeVisible()
  await page.keyboard.press('Shift+Tab')
  await expect(page.getByRole('listbox')).toBeHidden()
  await expect(trigger).toBeFocused()
})

test('outside clicks close the panel without stealing focus', async ({ page }) => {
  await combobox(page, 'Support type').click()
  await expect(page.getByRole('listbox')).toBeVisible()
  const nameInput = page.getByRole('textbox', { name: 'Structure name', includeHidden: true })
  await nameInput.click()
  await expect(page.getByRole('listbox')).toBeHidden()
  await expect(nameInput).toBeFocused()
})

test('empty lists and unknown values are shown explicitly', async ({ page }) => {
  const empty = combobox(page, 'Empty select')
  await expect(empty).toBeDisabled()
  await expect(empty).toContainText('No options available')
  await expect(combobox(page, 'Unknown value')).toContainText('Unavailable option (hinge)')
})

test('dropdown inside a scrollable panel stays aligned with its trigger and is not clipped', async ({
  page,
}) => {
  const trigger = combobox(page, 'Scrolled material')
  await trigger.scrollIntoViewIfNeeded()
  const t = (await trigger.boundingBox())!
  const panel = (await page.getByTestId('scroll-panel').boundingBox())!
  await trigger.click()
  const listbox = page.getByRole('listbox')
  await expect(listbox).toBeVisible()
  const l = (await listbox.boundingBox())!
  expect(Math.abs(l.x - t.x)).toBeLessThanOrEqual(2)
  // Below or above the trigger, and not confined to the scroll container's box.
  expect(l.y >= t.y + t.height - 1 || l.y + l.height <= t.y + 1).toBe(true)
  expect(l.y + l.height > panel.y + panel.height || l.y < panel.y).toBe(true)
  await expect(page.getByRole('option', { name: 'Steel', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  )
})

test('dropdown stays within the viewport on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 })
  const trigger = combobox(page, 'Material')
  await trigger.scrollIntoViewIfNeeded()
  await trigger.click()
  const listbox = page.getByRole('listbox')
  await expect(listbox).toBeVisible()
  const l = (await listbox.boundingBox())!
  expect(l.x).toBeGreaterThanOrEqual(0)
  expect(l.x + l.width).toBeLessThanOrEqual(360)
  expect(l.y).toBeGreaterThanOrEqual(0)
  expect(l.y + l.height).toBeLessThanOrEqual(640)
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
  expect(scrollWidth).toBeLessThanOrEqual(360)
})

test('theme changes apply to the dropdown; invalid imports keep the last valid theme', async ({
  page,
}) => {
  const json = page.getByRole('textbox', { name: 'Theme' })
  const theme = JSON.parse(await json.inputValue())
  theme.colors.surface = '#fefce8'
  theme.shape.controlHeight = 56
  await json.fill(JSON.stringify(theme))
  await page.getByRole('button', { name: 'Apply theme' }).click()
  await expect(page.getByRole('status')).toContainText('Theme applied')

  const trigger = combobox(page, 'Material')
  await expect(trigger).toHaveCSS('min-height', '56px')
  await trigger.click()
  const listbox = page.getByRole('listbox')
  await expect(listbox).toBeVisible()
  const panel = page.locator('.ui-select__panel')
  await expect(panel).toHaveCSS('background-color', 'rgb(254, 252, 232)')
  const t = (await trigger.boundingBox())!
  const l = (await listbox.boundingBox())!
  expect(Math.abs(l.x - t.x)).toBeLessThanOrEqual(2)
  // Placed directly below, or flipped above when there is not enough room.
  expect(l.y >= t.y + t.height - 1 || l.y + l.height <= t.y + 1).toBe(true)
  await page.keyboard.press('Escape')

  await json.fill('{"colors": {"primary": "blue"}}')
  await page.getByRole('button', { name: 'Apply theme' }).click()
  await expect(page.getByRole('status')).toContainText('The previous theme is still active')
  await expect(trigger).toHaveCSS('min-height', '56px')

  await page.reload()
  await expect(combobox(page, 'Material')).toHaveCSS('min-height', '56px')
  await page.getByRole('button', { name: 'Reset defaults' }).click()
  await expect(combobox(page, 'Material')).toHaveCSS('min-height', '44px')
})

test('buttons show loading state and block repeat activation', async ({ page }) => {
  const button = page.getByRole('button', { name: 'Click to load' })
  await button.click()
  const busy = page.getByRole('button', { name: 'Saving…' })
  await expect(busy).toBeDisabled()
  await expect(busy).toHaveAttribute('aria-busy', 'true')
  await expect(page.getByRole('button', { name: 'Click to load' })).toBeEnabled({ timeout: 4000 })
})
