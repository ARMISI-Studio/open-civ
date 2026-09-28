import { test, expect, type Page } from '@playwright/test'
import { canvas, chooseOption, createSharedQuestion } from './helpers'

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow).toBeLessThanOrEqual(0)
}

test.use({ viewport: { width: 1280, height: 900 } })

test('desktop editor: tool strip left, canvas in the middle, properties on the right', async ({
  page,
}) => {
  await page.goto('/structures/str_simplebeam')
  const tools = (await page.getByRole('group', { name: 'Drawing tools' }).boundingBox())!
  const drawing = (await canvas(page).boundingBox())!
  const properties = (await page.locator('.structure-workspace__properties').boundingBox())!
  expect(tools.x + tools.width).toBeLessThanOrEqual(drawing.x)
  expect(drawing.x + drawing.width).toBeLessThanOrEqual(properties.x)
  expect(Math.abs(properties.width - 280)).toBeLessThanOrEqual(2)
  expect(drawing.width).toBeGreaterThan(500)
  await expectNoHorizontalOverflow(page)
})

test('desktop builder: form beside the structure preview, main action at the bottom', async ({
  page,
}) => {
  await page.goto('/questions/create')
  await chooseOption(page, 'Structure (required)', /^Simply supported beam/)
  const form = (await page.locator('form.question-form').boundingBox())!
  const preview = (await page.getByRole('region', { name: 'Structure preview' }).boundingBox())!
  expect(form.x + form.width).toBeLessThanOrEqual(preview.x)
  const save = (await page.getByRole('button', { name: 'Save question' }).boundingBox())!
  const answer = (await page.getByRole('region', { name: 'Answer' }).boundingBox())!
  expect(save.y).toBeGreaterThan(answer.y + answer.height - 1)
  await expectNoHorizontalOverflow(page)
})

test('desktop answer page: centered column about 960px wide', async ({ page }) => {
  const url = await createSharedQuestion(page)
  await page.goto(url)
  const column = (await page.locator('.answer-view').boundingBox())!
  expect(column.width).toBeLessThanOrEqual(960)
  expect(column.width).toBeGreaterThan(900)
  const main = (await page.locator('main').boundingBox())!
  const left = column.x - main.x
  const right = main.x + main.width - (column.x + column.width)
  expect(Math.abs(left - right)).toBeLessThanOrEqual(2)
  await expectNoHorizontalOverflow(page)
})
