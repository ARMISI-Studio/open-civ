import { test, expect } from '@playwright/test'
import { canvas, dragWorld, element } from './helpers'

test('shows reactions, member forces, and the deflected shape, and updates them live', async ({
  page,
}) => {
  await page.goto('/structures/str_simplebeam')
  await expect(element(page, 'Member A–B, 3 m')).toBeVisible()
  const toggle = page.getByRole('button', { name: 'Show results' })
  await expect(page.getByRole('heading', { name: 'Results' })).toHaveCount(0)
  await toggle.click()
  await expect(page.getByRole('button', { name: 'Hide results' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )

  // 6 m simply supported beam, 10 kN at midspan: 5 kN at each support, 15 kN·m at midspan.
  const reactions = page.getByRole('table', { name: 'Support reactions' })
  await expect(reactions.getByRole('row', { name: /^A \(Pin\)/ })).toContainText('5')
  await expect(reactions.getByRole('row', { name: /^C \(Roller\)/ })).toHaveText(/—\s*5\s*—/)
  const forces = page.getByRole('table', { name: 'Member end forces' })
  await expect(forces.getByRole('row').nth(2)).toHaveText(/B\s*0\s*5\s*15/)
  await expect(page.getByRole('img', { name: 'Reaction at A: Rx 0 kN, Ry 5 kN' })).toBeVisible()
  await expect(page.getByRole('img', { name: 'Reaction at C: Ry 5 kN' })).toBeVisible()
  await expect(canvas(page).getByTestId('deflected-shape').locator('polyline')).toHaveCount(2)
  await expect(page.getByText(/Largest displacement: 2\.69 mm/)).toBeVisible()

  // Moving the load's node changes the results straight away.
  await dragWorld(page, [3, 0], [2, 0])
  await expect(page.getByRole('img', { name: 'Reaction at A: Rx 0 kN, Ry 6.67 kN' })).toBeVisible()

  // Removing a support makes the beam a mechanism.
  await element(page, 'Roller support at C').click()
  await page.keyboard.press('Delete')
  await expect(page.getByRole('status').filter({ hasText: 'The structure is unstable' })).toBeVisible()
  await expect(canvas(page).getByTestId('deflected-shape')).toHaveCount(0)

  await page.getByRole('button', { name: 'Hide results' }).click()
  await expect(page.getByRole('heading', { name: 'Results' })).toHaveCount(0)
})

test('asks for the structure to be fixed before showing results', async ({ page }) => {
  await page.goto('/structures/new')
  await page.getByRole('button', { name: 'Show results' }).click()
  await expect(
    page.getByRole('status').filter({ hasText: 'Fix the problems listed above to see results.' }),
  ).toBeVisible()
})

test('shows the fixed-end moment of a cantilever', async ({ page }) => {
  await page.goto('/structures/str_cantilever')
  await page.getByRole('button', { name: 'Show results' }).click()
  // 4 m cantilever, 5 kN tip load: 5 kN up and 20 kN·m counter-clockwise at the support.
  await expect(
    page.getByRole('img', { name: 'Reaction at A: Rx 0 kN, Ry 5 kN, M 20 kN·m' }),
  ).toBeVisible()
})
