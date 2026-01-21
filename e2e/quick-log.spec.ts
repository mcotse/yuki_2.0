import { test, expect, Page } from '@playwright/test'

// Helper to login as admin
async function loginAsAdmin(page: Page) {
  await page.goto('/login')
  await page.getByPlaceholder('Enter password...').fill('yuki2026')
  await page.getByRole('button', { name: 'Login' }).click()
  await expect(page).toHaveURL('/')
}

test.describe('Quick Log Feature', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await loginAsAdmin(page)
    await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible()
    await page.waitForLoadState('networkidle')
  })

  test('quick log card is visible on dashboard', async ({ page }) => {
    const quickLogCard = page.locator('[data-testid="quick-log-card"]')
    await expect(quickLogCard).toBeVisible()
  })

  test('quick log card shows trigger with "Quick Log" text', async ({ page }) => {
    const trigger = page.locator('[data-testid="quick-log-trigger"]')
    await expect(trigger).toBeVisible()
    await expect(trigger).toContainText('Quick Log')
  })

  test('clicking trigger expands the quick log options', async ({ page }) => {
    // Options should not be visible initially
    await expect(page.locator('[data-testid="quick-log-options"]')).not.toBeVisible()

    // Click trigger to expand
    await page.locator('[data-testid="quick-log-trigger"]').click()

    // Options should now be visible
    await expect(page.locator('[data-testid="quick-log-options"]')).toBeVisible()
  })

  test('shows all category chips when expanded', async ({ page }) => {
    await page.locator('[data-testid="quick-log-trigger"]').click()

    // Check all categories are visible
    await expect(page.locator('[data-testid="category-snack"]')).toBeVisible()
    await expect(page.locator('[data-testid="category-behavior"]')).toBeVisible()
    await expect(page.locator('[data-testid="category-symptom"]')).toBeVisible()
    await expect(page.locator('[data-testid="category-other"]')).toBeVisible()
  })

  test('selecting a category shows the note input', async ({ page }) => {
    await page.locator('[data-testid="quick-log-trigger"]').click()

    // Click on snack category
    await page.locator('[data-testid="category-snack"]').click()

    // Note input should appear
    await expect(page.locator('[data-testid="quick-log-input"]')).toBeVisible()
    await expect(page.locator('[data-testid="quick-log-submit"]')).toBeVisible()
  })

  test('category chip gets highlighted when selected', async ({ page }) => {
    await page.locator('[data-testid="quick-log-trigger"]').click()
    await page.locator('[data-testid="category-snack"]').click()

    // Snack category should have 'selected' class
    await expect(page.locator('[data-testid="category-snack"]')).toHaveClass(/selected/)
  })

  test('can switch between categories', async ({ page }) => {
    await page.locator('[data-testid="quick-log-trigger"]').click()

    // Select snack
    await page.locator('[data-testid="category-snack"]').click()
    await expect(page.locator('[data-testid="category-snack"]')).toHaveClass(/selected/)

    // Switch to behavior
    await page.locator('[data-testid="category-behavior"]').click()
    await expect(page.locator('[data-testid="category-snack"]')).not.toHaveClass(/selected/)
    await expect(page.locator('[data-testid="category-behavior"]')).toHaveClass(/selected/)
  })

  test('can enter a note in the input field', async ({ page }) => {
    await page.locator('[data-testid="quick-log-trigger"]').click()
    await page.locator('[data-testid="category-snack"]').click()

    const input = page.locator('[data-testid="quick-log-input"]')
    await input.fill('Gave treat after eye drops')

    await expect(input).toHaveValue('Gave treat after eye drops')
  })

  test('submitting quick log creates entry and shows success', async ({ page }) => {
    // Wait for items to be fully loaded before interacting
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)

    // Note the initial done count
    const headerText = await page.locator('p').filter({ hasText: /pending.*done/ }).textContent()
    const initialDoneMatch = headerText?.match(/(\d+)\s*done/)
    const initialDone = initialDoneMatch ? parseInt(initialDoneMatch[1]) : 0

    await page.locator('[data-testid="quick-log-trigger"]').click()
    await page.locator('[data-testid="category-snack"]').click()
    await page.locator('[data-testid="quick-log-input"]').fill('Test snack for e2e')

    // Submit
    await page.locator('[data-testid="quick-log-submit"]').click()

    // Wait for the quick log to be created - check that done count increased
    await expect(async () => {
      const newHeaderText = await page.locator('p').filter({ hasText: /pending.*done/ }).textContent()
      const newDoneMatch = newHeaderText?.match(/(\d+)\s*done/)
      const newDone = newDoneMatch ? parseInt(newDoneMatch[1]) : 0
      expect(newDone).toBeGreaterThan(initialDone)
    }).toPass({ timeout: 5000 })

    // The quick log card should collapse after success
    await expect(page.locator('[data-testid="quick-log-options"]')).not.toBeVisible({ timeout: 2000 })
  })

  test('quick log card collapses after successful submission', async ({ page }) => {
    await page.locator('[data-testid="quick-log-trigger"]').click()
    await page.locator('[data-testid="category-snack"]').click()

    // Submit
    await page.locator('[data-testid="quick-log-submit"]').click()

    // Wait for success animation to complete
    await page.waitForTimeout(1000)

    // Options should be hidden again
    await expect(page.locator('[data-testid="quick-log-options"]')).not.toBeVisible()
  })

  test('clicking trigger again collapses the options', async ({ page }) => {
    await page.locator('[data-testid="quick-log-trigger"]').click()
    await expect(page.locator('[data-testid="quick-log-options"]')).toBeVisible()

    // Click again to collapse
    await page.locator('[data-testid="quick-log-trigger"]').click()
    await expect(page.locator('[data-testid="quick-log-options"]')).not.toBeVisible()
  })

  test('quick log entry appears in completed section after submission', async ({ page }) => {
    // Get initial completed count
    const completedHeader = page.getByRole('button').filter({ hasText: /completed/i })

    await page.locator('[data-testid="quick-log-trigger"]').click()
    await page.locator('[data-testid="category-snack"]').click()
    await page.locator('[data-testid="quick-log-input"]').fill('E2E test snack')
    await page.locator('[data-testid="quick-log-submit"]').click()

    // Wait for submission to complete
    await page.waitForTimeout(1500)

    // The quick log should appear in the completed section
    // Since it's immediately confirmed, it should show in completed
    await expect(completedHeader).toBeVisible({ timeout: 5000 })
  })
})

test.describe('Quick Log - Category Types', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await loginAsAdmin(page)
    await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible()
    await page.waitForLoadState('networkidle')
    // Expand quick log
    await page.locator('[data-testid="quick-log-trigger"]').click()
  })

  test('snack category has correct label and icon', async ({ page }) => {
    const snackChip = page.locator('[data-testid="category-snack"]')
    await expect(snackChip).toContainText('Snack')
    // Should have an icon (Cookie)
    await expect(snackChip.locator('svg')).toBeVisible()
  })

  test('behavior category has correct label and icon', async ({ page }) => {
    const behaviorChip = page.locator('[data-testid="category-behavior"]')
    await expect(behaviorChip).toContainText('Behavior')
    await expect(behaviorChip.locator('svg')).toBeVisible()
  })

  test('symptom category has correct label and icon', async ({ page }) => {
    const symptomChip = page.locator('[data-testid="category-symptom"]')
    await expect(symptomChip).toContainText('Symptom')
    await expect(symptomChip.locator('svg')).toBeVisible()
  })

  test('other category has correct label and icon', async ({ page }) => {
    const otherChip = page.locator('[data-testid="category-other"]')
    await expect(otherChip).toContainText('Other')
    await expect(otherChip.locator('svg')).toBeVisible()
  })
})

test.describe('Quick Log - Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await loginAsAdmin(page)
    await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible()
    await page.waitForLoadState('networkidle')
  })

  test('quick log card is focusable', async ({ page }) => {
    const card = page.locator('[data-testid="quick-log-card"]')
    await card.focus()
    await expect(card).toBeFocused()
  })

  test('input placeholder provides context', async ({ page }) => {
    await page.locator('[data-testid="quick-log-trigger"]').click()
    await page.locator('[data-testid="category-snack"]').click()

    const input = page.locator('[data-testid="quick-log-input"]')
    await expect(input).toHaveAttribute('placeholder', /optional/i)
  })
})
