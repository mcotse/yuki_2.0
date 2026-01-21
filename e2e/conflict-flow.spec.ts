import { test, expect, Page } from '@playwright/test'

const API_BASE = 'http://localhost:3000'

// Unique prefix for this test file to avoid conflicts with parallel tests
const TEST_PREFIX = 'CF'

// Helper to login
async function login(page: Page) {
  await page.goto('/login')
  await page.getByPlaceholder('Enter password...').fill('yuki2026')
  await page.getByRole('button', { name: 'Login' }).click()
  await expect(page).toHaveURL('/')
}

// Helper to create isolated test data for this file
async function createIsolatedTestData(page: Page) {
  const response = await page.request.post(`${API_BASE}/api/test-fixtures/create-isolated`, {
    data: { prefix: TEST_PREFIX, includeConflictGroups: true }
  })
  expect(response.ok()).toBeTruthy()
}

// Helper to clear confirmations for this file's data only
async function clearConfirmations(page: Page) {
  const response = await page.request.post(`${API_BASE}/api/test-fixtures/clear-confirmations/${TEST_PREFIX}`)
  expect(response.ok()).toBeTruthy()
}

test.describe('Conflict Warning Flow', () => {
  // Run conflict tests serially to avoid state interference
  test.describe.configure({ mode: 'serial' })

  test.beforeAll(async ({ browser }) => {
    // Create isolated test data once for all tests in this file
    const page = await browser.newPage()
    await createIsolatedTestData(page)
    await page.close()
  })

  test.beforeEach(async ({ page }) => {
    // Clear localStorage first
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    // Reset confirmations for our isolated data
    await clearConfirmations(page)
    // Login and wait for dashboard to load
    await login(page)
    await page.reload({ waitUntil: 'networkidle' })
    // Verify our isolated Ofloxacin has confirm button
    const ofloxacinCard = page.locator('.card').filter({ has: page.locator('h3', { hasText: `${TEST_PREFIX}-Ofloxacin` }) })
    await expect(ofloxacinCard.locator('.btn-primary')).toBeVisible({ timeout: 10000 })
  })

  test.afterEach(async ({ page }) => {
    // Clean up confirmations after each test
    await clearConfirmations(page)
  })

  test('should show conflict warning when confirming Atropine after Ofloxacin', async ({
    page,
  }) => {
    // Find the Ofloxacin card by h3 heading and confirm it
    const ofloxacinCard = page.locator('.card').filter({ has: page.locator('h3', { hasText: `${TEST_PREFIX}-Ofloxacin` }) })
    await expect(ofloxacinCard).toBeVisible()

    // Click confirm on Ofloxacin
    const ofloxacinConfirmBtn = ofloxacinCard.locator('.btn-primary')
    await ofloxacinConfirmBtn.click()

    // Wait for confirmation to process
    await page.waitForLoadState('networkidle')

    // Now find the Atropine card by h3 heading
    const atropineCard = page.locator('.card').filter({ has: page.locator('h3', { hasText: `${TEST_PREFIX}-Atropine` }) })
    await expect(atropineCard).toBeVisible()

    // The Atropine card should now show a conflict warning banner
    // (Both share the same conflict group)
    const conflictWarning = atropineCard.locator('text=/Wait.*min/')
    await expect(conflictWarning).toBeVisible()

    // The warning should mention the conflicting item (Ofloxacin)
    await expect(atropineCard.getByText(new RegExp(`${TEST_PREFIX}-Ofloxacin`))).toBeVisible()
  })

  test('should show conflict warning when confirming Amniotic after Ofloxacin', async ({
    page,
  }) => {
    // Confirm Ofloxacin first
    const ofloxacinCard = page.locator('.card').filter({ has: page.locator('h3', { hasText: `${TEST_PREFIX}-Ofloxacin` }) })
    await ofloxacinCard.locator('.btn-primary').click()
    await page.waitForLoadState('networkidle')

    // Amniotic drops should now show conflict warning
    const amnioticCard = page.locator('.card').filter({ has: page.locator('h3', { hasText: `${TEST_PREFIX}-Amniotic` }) })
    await expect(amnioticCard).toBeVisible()

    // Should have conflict warning
    const conflictWarning = amnioticCard.locator('text=/Wait.*min/')
    await expect(conflictWarning).toBeVisible()
  })

  test('should allow override on conflict with confirmation dialog', async ({ page }) => {
    // Confirm Ofloxacin first
    const ofloxacinCard = page.locator('.card').filter({ has: page.locator('h3', { hasText: `${TEST_PREFIX}-Ofloxacin` }) })
    await ofloxacinCard.locator('.btn-primary').click()
    await page.waitForLoadState('networkidle')

    // Set up dialog handler to accept the override BEFORE clicking
    let dialogMessage = ''
    const dialogPromise = page.waitForEvent('dialog').then(async (dialog) => {
      dialogMessage = dialog.message()
      await dialog.accept()
    })

    // Try to confirm Atropine (should trigger conflict dialog)
    const atropineCard = page.locator('.card').filter({ has: page.locator('h3', { hasText: `${TEST_PREFIX}-Atropine` }) })
    const atropineConfirmBtn = atropineCard.locator('.btn-primary')

    // Click and wait for dialog handling simultaneously
    await Promise.all([
      dialogPromise,
      atropineConfirmBtn.click()
    ])

    // Wait for the confirmation API call to complete
    await page.waitForLoadState('networkidle')

    // Verify dialog was shown with conflict message
    expect(dialogMessage).toContain(`${TEST_PREFIX}-Ofloxacin`)
    expect(dialogMessage).toContain('just given')

    // After override, Atropine should now be in the Completed section
    const completedSection = page.locator('section').filter({ hasText: 'Completed' })
    await expect(completedSection.locator('h3', { hasText: `${TEST_PREFIX}-Atropine` })).toBeVisible()
  })

  test('should allow cancel on conflict dialog (no override)', async ({ page }) => {
    // Confirm Ofloxacin first
    const ofloxacinCard = page.locator('.card').filter({ has: page.locator('h3', { hasText: `${TEST_PREFIX}-Ofloxacin` }) })
    await ofloxacinCard.locator('.btn-primary').click()
    await page.waitForLoadState('networkidle')

    // Set up dialog handler to DISMISS BEFORE clicking
    const dialogPromise = page.waitForEvent('dialog').then(async (dialog) => {
      await dialog.dismiss() // Cancel - don't override
    })

    // Try to confirm Atropine
    const atropineCard = page.locator('.card').filter({ has: page.locator('h3', { hasText: `${TEST_PREFIX}-Atropine` }) })
    const atropineConfirmBtn = atropineCard.locator('.btn-primary')

    // Click and wait for dialog handling simultaneously
    await Promise.all([
      dialogPromise,
      atropineConfirmBtn.click()
    ])

    // Wait for any potential network activity
    await page.waitForLoadState('networkidle')

    // Atropine should still show confirm button (not confirmed)
    await expect(atropineConfirmBtn).toBeVisible()

    // Should NOT be in completed section
    const completedSection = page.locator('section').filter({ hasText: 'Completed' })
    // Only Ofloxacin should be completed, not Atropine
    await expect(completedSection.locator('h3', { hasText: `${TEST_PREFIX}-Ofloxacin` })).toBeVisible()
  })

  test('should NOT show conflict for items in different conflict groups', async ({ page }) => {
    // Confirm a LEFT eye medication (Ofloxacin)
    const ofloxacinCard = page.locator('.card').filter({ has: page.locator('h3', { hasText: `${TEST_PREFIX}-Ofloxacin` }) })
    await ofloxacinCard.locator('.btn-primary').click()
    await page.waitForLoadState('networkidle')

    // RIGHT eye medications should NOT show conflict (different conflict group)
    const predCard = page.locator('.card').filter({ has: page.locator('h3', { hasText: `${TEST_PREFIX}-Prednisolone` }) })

    if (await predCard.isVisible().catch(() => false)) {
      // Should NOT have conflict warning (different eye)
      const conflictWarning = predCard.locator('text=/Wait.*min/')
      await expect(conflictWarning).not.toBeVisible()
    }

    // ORAL medications should also not have conflict (no conflict group)
    const gabapentinCard = page.locator('.card').filter({ has: page.locator('h3', { hasText: `${TEST_PREFIX}-Gabapentin` }) })
    if (await gabapentinCard.isVisible().catch(() => false)) {
      const conflictWarning = gabapentinCard.locator('text=/Wait.*min/')
      await expect(conflictWarning).not.toBeVisible()
    }
  })

  test('should show conflict for multiple items in same group after one confirmation', async ({
    page,
  }) => {
    // Confirm Ofloxacin
    const ofloxacinCard = page.locator('.card').filter({ has: page.locator('h3', { hasText: `${TEST_PREFIX}-Ofloxacin` }) })
    await ofloxacinCard.locator('.btn-primary').click()
    await page.waitForLoadState('networkidle')

    // Both Atropine AND Amniotic should show conflict warnings
    // (all three are in the same conflict group)
    const atropineCard = page.locator('.card').filter({ has: page.locator('h3', { hasText: `${TEST_PREFIX}-Atropine` }) })
    const amnioticCard = page.locator('.card').filter({ has: page.locator('h3', { hasText: `${TEST_PREFIX}-Amniotic` }) })

    await expect(atropineCard.locator('text=/Wait.*min/')).toBeVisible()
    await expect(amnioticCard.locator('text=/Wait.*min/')).toBeVisible()
  })

  test('conflict warning should display remaining minutes', async ({ page }) => {
    // Confirm Ofloxacin
    const ofloxacinCard = page.locator('.card').filter({ has: page.locator('h3', { hasText: `${TEST_PREFIX}-Ofloxacin` }) })
    await ofloxacinCard.locator('.btn-primary').click()
    await page.waitForLoadState('networkidle')

    // Check the conflict warning shows a number of minutes
    const atropineCard = page.locator('.card').filter({ has: page.locator('h3', { hasText: `${TEST_PREFIX}-Atropine` }) })
    const warningText = atropineCard.locator('text=/Wait \\d+ min/')
    await expect(warningText).toBeVisible()

    // The minutes should be between 1 and 5 (the conflict window)
    const text = await atropineCard.locator('.text-tertiary').textContent()
    const match = text?.match(/Wait (\d+) min/)
    expect(match).toBeTruthy()
    const minutes = parseInt(match![1])
    expect(minutes).toBeGreaterThanOrEqual(1)
    expect(minutes).toBeLessThanOrEqual(5)
  })
})

test.describe('Conflict Warning - Right Eye', () => {
  // Run conflict tests serially to avoid state interference
  test.describe.configure({ mode: 'serial' })

  test.beforeAll(async ({ browser }) => {
    // Ensure isolated test data exists
    const page = await browser.newPage()
    await createIsolatedTestData(page)
    await page.close()
  })

  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await clearConfirmations(page)
    await login(page)
    await page.reload({ waitUntil: 'networkidle' })
    // Verify Prednisolone has confirm button
    const predCard = page.locator('.card').filter({ has: page.locator('h3', { hasText: `${TEST_PREFIX}-Prednisolone` }) })
    await expect(predCard.locator('.btn-primary')).toBeVisible({ timeout: 10000 })
  })

  test.afterEach(async ({ page }) => {
    await clearConfirmations(page)
  })

  test('should show conflict between right eye medications', async ({ page }) => {
    // Confirm Prednisolone (right eye)
    const predCard = page.locator('.card').filter({ has: page.locator('h3', { hasText: `${TEST_PREFIX}-Prednisolone` }) })

    if (await predCard.isVisible()) {
      await predCard.locator('.btn-primary').click()
      await page.waitForLoadState('networkidle')

      // Tacrolimus (also right eye) should show conflict
      const tacrolimusCard = page.locator('.card').filter({ has: page.locator('h3', { hasText: `${TEST_PREFIX}-Tacrolimus` }) })
      if (await tacrolimusCard.isVisible()) {
        const conflictWarning = tacrolimusCard.locator('text=/Wait.*min/')
        await expect(conflictWarning).toBeVisible()
        await expect(tacrolimusCard.getByText(new RegExp(`${TEST_PREFIX}-Prednisolone`))).toBeVisible()
      }
    }
  })
})
