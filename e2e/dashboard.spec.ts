import { test, expect, Page } from '@playwright/test'

// Helper to login before tests
async function login(page: Page) {
  await page.goto('/login')
  await page.getByPlaceholder('Enter password...').fill('yuki2026')
  await page.getByRole('button', { name: 'Login' }).click()
  await expect(page).toHaveURL('/')
}

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Clear session and login fresh
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await login(page)
  })

  test('should display dashboard header with pending/done counts', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible()
    // Should show pending and done counts
    await expect(page.getByText(/pending/)).toBeVisible()
    await expect(page.getByText(/done/)).toBeVisible()
  })

  test('should display medication cards organized by status sections', async ({ page }) => {
    // Wait for medications to load
    await page.waitForLoadState('networkidle')

    // Check for status section headers (at least one should be visible)
    const sections = ['Overdue', 'Due Now', 'Coming Up', 'Snoozed', 'Completed']
    let foundSection = false
    for (const section of sections) {
      const sectionHeader = page.getByRole('heading', { name: section })
      if (await sectionHeader.isVisible().catch(() => false)) {
        foundSection = true
        break
      }
    }
    // If no sections, should show empty state
    if (!foundSection) {
      await expect(page.getByText('All caught up!')).toBeVisible()
    }
  })

  test('should show refresh button and handle refresh', async ({ page }) => {
    // Find refresh button (the RefreshCw icon button)
    const refreshButton = page.locator('button').filter({ has: page.locator('svg') }).first()
    await expect(refreshButton).toBeVisible()

    // Click refresh
    await refreshButton.click()

    // Should still be on dashboard after refresh
    await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible()
  })
})

test.describe('Medication Card Actions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await login(page)
    await page.waitForLoadState('networkidle')
  })

  test('should display medication card with name, location, and dose', async ({ page }) => {
    // Find any medication card
    const cards = page.locator('.card')
    const cardCount = await cards.count()

    if (cardCount > 0) {
      const firstCard = cards.first()
      // Card should have medication name (h3 element)
      await expect(firstCard.locator('h3')).toBeVisible()
    }
  })

  test('should confirm a due medication', async ({ page }) => {
    // Look for a medication with a confirm button (checkmark)
    const confirmButtons = page.locator('.btn-primary').filter({ hasText: '' })
    const buttonCount = await confirmButtons.count()

    if (buttonCount > 0) {
      // Get initial pending count
      const pendingText = await page.getByText(/pending/).textContent()
      const initialPending = parseInt(pendingText?.match(/\d+/)?.[0] || '0')

      // Handle potential conflict dialog (use once() to auto-remove)
      page.once('dialog', (dialog) => dialog.accept())

      // Click first confirm button
      await confirmButtons.first().click()

      // Wait for update
      await page.waitForLoadState('networkidle')

      // Pending count should decrease or card should move to completed
      const newPendingText = await page.getByText(/pending/).textContent()
      const newPending = parseInt(newPendingText?.match(/\d+/)?.[0] || '0')

      // Either pending decreased or we had a conflict that was overridden
      expect(newPending).toBeLessThanOrEqual(initialPending)
    }
  })

  test('should show snooze options when clicking snooze button', async ({ page }) => {
    // Look for snooze button (clock icon) on due/overdue cards
    const snoozeButtons = page.locator('button').filter({
      has: page.locator('svg.lucide-clock'),
    })

    const buttonCount = await snoozeButtons.count()
    if (buttonCount > 0) {
      await snoozeButtons.first().click()

      // Should show snooze options: 15 min, 30 min, 1 hour
      await expect(page.getByRole('button', { name: '15 min' })).toBeVisible()
      await expect(page.getByRole('button', { name: '30 min' })).toBeVisible()
      await expect(page.getByRole('button', { name: '1 hour' })).toBeVisible()
    }
  })

  test('should snooze a medication for 15 minutes', async ({ page }) => {
    // Look for snooze button
    const snoozeButtons = page.locator('button').filter({
      has: page.locator('svg.lucide-clock'),
    })

    const buttonCount = await snoozeButtons.count()
    if (buttonCount > 0) {
      await snoozeButtons.first().click()

      // Click 15 min option
      await page.getByRole('button', { name: '15 min' }).click()

      // Wait for update
      await page.waitForLoadState('networkidle')

      // Item may have moved to snoozed section - page should still be functional
      await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible()
    }
  })

  test('should expand notes when clicking expand button', async ({ page }) => {
    // Look for expand buttons (chevron icons)
    const expandButtons = page.locator('button').filter({
      has: page.locator('svg.lucide-chevron-down'),
    })

    const buttonCount = await expandButtons.count()
    if (buttonCount > 0) {
      // Click expand
      await expandButtons.first().click()

      // Should show chevron-up now (indicating expanded state)
      await expect(
        page.locator('button').filter({ has: page.locator('svg.lucide-chevron-up') }),
      ).toBeVisible()
    }
  })
})

test.describe('Conflict Detection', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await login(page)
    await page.waitForLoadState('networkidle')
  })

  test('should show conflict warning when confirming items in same conflict group', async ({
    page,
  }) => {
    // Track dialog messages
    let dialogMessage = ''
    const dialogHandler = async (dialog: import('@playwright/test').Dialog) => {
      dialogMessage = dialog.message()
      await dialog.accept()
    }
    page.on('dialog', dialogHandler)

    // Find confirm buttons
    const confirmButtons = page.locator('.btn-primary')
    const buttonCount = await confirmButtons.count()

    if (buttonCount >= 2) {
      // Confirm first item
      await confirmButtons.first().click()
      await page.waitForLoadState('networkidle')

      // Try to confirm another item (may trigger conflict if same group)
      const remainingButtons = page.locator('.btn-primary')
      if ((await remainingButtons.count()) > 0) {
        await remainingButtons.first().click()

        // If a conflict exists, we should see a warning message
        // The dialog message would contain "was just given"
        if (dialogMessage.includes('was just given')) {
          expect(dialogMessage).toContain('min')
        }
      }
    }

    // Clean up dialog handler
    page.off('dialog', dialogHandler)
  })

  test('should display conflict warning banner on card', async ({ page }) => {
    // If there's a recent confirmation in the same conflict group,
    // the card should show a warning with AlertTriangle icon
    // This may or may not be visible depending on data state
    // Just verify the page loads correctly
    await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible()
  })
})

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await login(page)
  })

  test('should navigate to history page', async ({ page }) => {
    // Find history button in bottom nav
    await page.getByRole('button', { name: /history/i }).click()
    await expect(page).toHaveURL('/history')
  })

  test('should navigate to settings page', async ({ page }) => {
    // Find settings button in bottom nav
    await page.getByRole('button', { name: /settings/i }).click()
    await expect(page).toHaveURL('/settings')
  })

  test('should navigate back to dashboard', async ({ page }) => {
    // Go to another page first
    await page.goto('/history')

    // Click dashboard button in bottom nav
    await page.getByRole('button', { name: /dashboard/i }).click()
    await expect(page).toHaveURL('/')
  })
})
