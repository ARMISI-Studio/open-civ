import { expect, type Locator, type Page } from '@playwright/test'

/** The editable structure canvas (previews are read-only and have no tools). */
export function canvas(page: Page): Locator {
  return page.locator('svg.structure-canvas:not(.structure-canvas--readonly)')
}

/** Screen coordinates for a point in structure coordinates (metres, y up). */
export async function worldToScreen(page: Page, x: number, y: number) {
  return canvas(page).evaluate(
    (svg, [wx, wy]) => {
      const el = svg as SVGSVGElement
      const scale = Number(el.dataset.scale)
      const p = new DOMPoint(wx! * scale, -wy! * scale).matrixTransform(el.getScreenCTM()!)
      return { x: p.x, y: p.y }
    },
    [x, y],
  )
}

export async function clickWorld(page: Page, x: number, y: number) {
  const p = await worldToScreen(page, x, y)
  await page.mouse.click(p.x, p.y)
}

export async function dragWorld(page: Page, from: [number, number], to: [number, number]) {
  const a = await worldToScreen(page, ...from)
  const b = await worldToScreen(page, ...to)
  await page.mouse.move(a.x, a.y)
  await page.mouse.down()
  await page.mouse.move((a.x + b.x) / 2, (a.y + b.y) / 2, { steps: 4 })
  await page.mouse.move(b.x, b.y, { steps: 4 })
  await page.mouse.up()
}

export function tool(page: Page, name: 'Select' | 'Node' | 'Member' | 'Support' | 'Load') {
  return page.getByRole('group', { name: 'Drawing tools' }).getByRole('button', { name })
}

export function element(page: Page, name: string | RegExp) {
  return canvas(page).getByRole('button', { name })
}

/** Picks an option from a UiSelect identified by its label. */
export async function chooseOption(page: Page, label: string, option: string | RegExp) {
  await page.getByRole('combobox', { name: label, exact: true }).click()
  await page.getByRole('option', { name: option }).click()
  await expect(page.getByRole('listbox')).toBeHidden()
}

/**
 * Draws a 4 m beam A–B with a pin at A, a roller at B, and a 10 kN load at B, using the
 * pointer tools.
 */
export async function drawSimpleBeam(page: Page, name: string) {
  await page.getByRole('textbox', { name: /Structure name/ }).fill(name)
  await tool(page, 'Node').click()
  await clickWorld(page, 0, 0)
  await clickWorld(page, 4, 0)
  await expect(element(page, 'Node A at (0, 0) m')).toBeVisible()
  await expect(element(page, 'Node B at (4, 0) m')).toBeVisible()

  await tool(page, 'Member').click()
  await element(page, /^Node A/).click()
  await element(page, /^Node B/).click()
  await expect(element(page, 'Member A–B, 4 m')).toBeVisible()
  await page.keyboard.press('Escape')

  await tool(page, 'Support').click()
  await element(page, /^Node A/).click()
  await expect(element(page, 'Pin support at A')).toBeVisible()
  await element(page, /^Node B/).click()
  await chooseOption(page, 'Support type', /^Roller/)
  await expect(element(page, 'Roller support at B')).toBeVisible()

  await tool(page, 'Load').click()
  await element(page, /^Node B/).click()
  await expect(element(page, 'Load at B, 10 kN')).toBeVisible()
  await tool(page, 'Select').click()
}

/**
 * Creates and shares a multiple choice question on the seeded simply supported beam through
 * the Question Builder, and returns the share link from the API.
 */
export async function createSharedQuestion(page: Page): Promise<string> {
  await page.goto('/questions/create')
  await page.getByRole('textbox', { name: /^Title/ }).fill('Find the support reaction')
  await page.getByRole('textbox', { name: /^Prompt/ }).fill('What is the vertical reaction at A?')
  await chooseOption(page, 'Structure (required)', /^Simply supported beam/)
  await page.getByRole('textbox', { name: 'Option 1', exact: true }).fill('0 kN')
  await page.getByRole('textbox', { name: 'Option 2', exact: true }).fill('5 kN upward')
  await page.getByRole('radio', { name: 'Option 2 is correct' }).check()
  await page
    .getByRole('textbox', { name: /^Explanation/ })
    .fill('By symmetry each support carries half of the 10 kN load.')
  await page.getByRole('button', { name: 'Save question' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Question saved.' })).toBeVisible()
  await page.getByRole('button', { name: 'Create share link' }).click()
  const link = page.getByRole('textbox', { name: 'Share link' })
  await expect(link).toHaveValue(/\/questions\/answer\/[A-Z2-9]{8}$/)
  return link.inputValue()
}
