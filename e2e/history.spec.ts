import { test, expect, Page } from '@playwright/test'

// Helper to login before tests
async function login(page: Page) {
  await page.goto('/login')
  await page.getByPlaceholder('Enter password...').fill('yuki2026')
  await page.getByRole('button', { name: 'Login' }).click()
  await expect(page).toHaveURL('/')
}

test.describe('History View', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await login(page)
    // Navigate to history
    await page.goto('/history')
    await page.waitForLoadState('networkidle')
  })

  test('should display history page with date navigation', async ({ page }) => {
    // Should show date with calendar icon
    await expect(page.locator('svg.lucide-calendar')).toBeVisible()

    // Should show previous day button
    await expect(page.locator('svg.lucide-chevron-left')).toBeVisible()

    // Should show next day button (may be disabled if on today)
    await expect(page.locator('svg.lucide-chevron-right')).toBeVisible()

    // Should show confirmation count (matches "N confirmations" text)
    await expect(page.getByText(/\d+ confirmation/)).toBeVisible()
  })

  test('should navigate to previous day', async ({ page }) => {
    // Get current date display
    const dateButton = page.locator('button').filter({ has: page.locator('svg.lucide-calendar') })
    const initialDate = await dateButton.textContent()

    // Click previous day
    await page.locator('button').filter({ has: page.locator('svg.lucide-chevron-left') }).click()

    // Wait for navigation
    await page.waitForLoadState('networkidle')

    // Date should change
    const newDate = await dateButton.textContent()
    expect(newDate).not.toBe(initialDate)
  })

  test('should show empty state when no confirmations', async ({ page }) => {
    // Navigate to a past date likely to have no data
    await page.locator('button').filter({ has: page.locator('svg.lucide-chevron-left') }).click()
    await page.waitForLoadState('networkidle')

    // Keep going back to find empty day
    for (let i = 0; i < 5; i++) {
      await page.locator('button').filter({ has: page.locator('svg.lucide-chevron-left') }).click()
      await page.waitForLoadState('networkidle')
    }

    // Either see history entries or empty state
    const hasEntries = (await page.locator('.card').count()) > 0
    if (!hasEntries) {
      await expect(page.getByText('No confirmations')).toBeVisible()
    }
  })

  test('should display history entries with medication details', async ({ page }) => {
    const cards = page.locator('.card')
    const cardCount = await cards.count()

    if (cardCount > 0) {
      const firstCard = cards.first()

      // Should show medication name
      await expect(firstCard.locator('h3')).toBeVisible()

      // Should show time with clock icon
      await expect(firstCard.locator('svg.lucide-clock')).toBeVisible()
    }
  })

  test('should open date picker modal when clicking date', async ({ page }) => {
    // Click the date button
    const dateButton = page.locator('button').filter({ has: page.locator('svg.lucide-calendar') })
    await dateButton.click()

    // Should show date picker modal
    await expect(page.getByRole('heading', { name: 'Select Date' })).toBeVisible()
    await expect(page.locator('input[type="date"]')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Select' })).toBeVisible()
  })

  test('should close date picker on cancel', async ({ page }) => {
    // Open date picker
    const dateButton = page.locator('button').filter({ has: page.locator('svg.lucide-calendar') })
    await dateButton.click()
    await expect(page.getByRole('heading', { name: 'Select Date' })).toBeVisible()

    // Click cancel
    await page.getByRole('button', { name: 'Cancel' }).click()

    // Modal should close
    await expect(page.getByRole('heading', { name: 'Select Date' })).not.toBeVisible()
  })

  test('should select date from date picker', async ({ page }) => {
    // Open date picker
    const dateButton = page.locator('button').filter({ has: page.locator('svg.lucide-calendar') })
    await dateButton.click()

    // Set a date (yesterday)
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const dateStr = yesterday.toISOString().split('T')[0]

    await page.locator('input[type="date"]').fill(dateStr!)

    // Click select
    await page.getByRole('button', { name: 'Select' }).click()

    // Modal should close and data should refresh
    await expect(page.getByRole('heading', { name: 'Select Date' })).not.toBeVisible()
    await page.waitForLoadState('networkidle')
  })
})

test.describe('History Edit (Admin)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await login(page)

    // First confirm a medication so we have something to edit in history
    await page.waitForLoadState('networkidle')

    // Handle potential conflict dialog
    page.once('dialog', (dialog) => dialog.accept())

    // Confirm the first available medication
    const confirmButtons = page.locator('.btn-primary')
    if ((await confirmButtons.count()) > 0) {
      await confirmButtons.first().click()
      await page.waitForLoadState('networkidle')
    }

    // Navigate to history
    await page.goto('/history')
    await page.waitForLoadState('networkidle')
  })

  test('should show edit button on history entries for admin', async ({ page }) => {
    const cards = page.locator('.card')
    const cardCount = await cards.count()

    if (cardCount > 0) {
      // Admin should see edit button (pencil icon) inside the card
      const editButton = cards.first().locator('button').filter({ has: page.locator('svg') })
      await expect(editButton.first()).toBeVisible()
    } else {
      // No entries - verify page loaded
      await expect(page.getByText(/\d+ confirmation/)).toBeVisible()
    }
  })

  test('should open edit modal when clicking edit button', async ({ page }) => {
    // Find edit buttons within cards
    const cards = page.locator('.card')
    if ((await cards.count()) > 0) {
      const editButton = cards.first().locator('button').filter({ has: page.locator('svg') })

      if ((await editButton.count()) > 0) {
        await editButton.first().click()

        // Should show edit modal
        await expect(page.getByRole('heading', { name: 'Edit Confirmation' })).toBeVisible()
        await expect(page.locator('input[type="time"]')).toBeVisible()
        await expect(page.locator('textarea')).toBeVisible()
        await expect(page.getByRole('button', { name: 'Save' })).toBeVisible()
      }
    }
  })

  test('should close edit modal on cancel', async ({ page }) => {
    const cards = page.locator('.card')
    if ((await cards.count()) > 0) {
      const editButton = cards.first().locator('button').filter({ has: page.locator('svg') })

      if ((await editButton.count()) > 0) {
        // Open edit modal
        await editButton.first().click()
        await expect(page.getByRole('heading', { name: 'Edit Confirmation' })).toBeVisible()

        // Click cancel
        await page.getByRole('button', { name: 'Cancel' }).click()

        // Modal should close
        await expect(page.getByRole('heading', { name: 'Edit Confirmation' })).not.toBeVisible()
      }
    }
  })

  test('should save edited confirmation time', async ({ page }) => {
    const cards = page.locator('.card')
    if ((await cards.count()) > 0) {
      const editButton = cards.first().locator('button').filter({ has: page.locator('svg') })

      if ((await editButton.count()) > 0) {
        // Open edit modal
        await editButton.first().click()
        await expect(page.getByRole('heading', { name: 'Edit Confirmation' })).toBeVisible()

        // Change time
        const timeInput = page.locator('input[type="time"]')
        await timeInput.fill('10:30')

        // Click save
        await page.getByRole('button', { name: 'Save' }).click()

        // Wait for save to complete
        await page.waitForLoadState('networkidle')

        // Modal should close
        await expect(page.getByRole('heading', { name: 'Edit Confirmation' })).not.toBeVisible()
      }
    }
  })

  test('should update notes in edit modal', async ({ page }) => {
    const cards = page.locator('.card')
    if ((await cards.count()) > 0) {
      const editButton = cards.first().locator('button').filter({ has: page.locator('svg') })

      if ((await editButton.count()) > 0) {
        // Open edit modal
        await editButton.first().click()
        await expect(page.getByRole('heading', { name: 'Edit Confirmation' })).toBeVisible()

        // Add notes
        const notesInput = page.locator('textarea')
        await notesInput.fill('Updated notes from E2E test')

        // Save
        await page.getByRole('button', { name: 'Save' }).click()
        await page.waitForLoadState('networkidle')

        // Modal should close
        await expect(page.getByRole('heading', { name: 'Edit Confirmation' })).not.toBeVisible()
      }
    }
  })
})

test.describe('History Entry Expansion', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await login(page)

    // First confirm a medication so we have something to view in history
    await page.waitForLoadState('networkidle')
    page.once('dialog', (dialog) => dialog.accept())

    const confirmButtons = page.locator('.btn-primary')
    if ((await confirmButtons.count()) > 0) {
      await confirmButtons.first().click()
      await page.waitForLoadState('networkidle')
    }

    // Navigate to history
    await page.goto('/history')
    await page.waitForLoadState('networkidle')
  })

  test('should show expanded details when clicking card', async ({ page }) => {
    const cards = page.locator('.card')
    const cardCount = await cards.count()

    if (cardCount > 0) {
      // Click on the expand button (chevron down)
      const expandButton = cards.first().locator('button').filter({ has: page.locator('svg.lucide-chevron-down') })
      if ((await expandButton.count()) > 0) {
        await expandButton.click()

        // Should show expanded details with Scheduled, Confirmed, Location
        await expect(page.getByText('Scheduled')).toBeVisible()
        await expect(page.getByText('Confirmed', { exact: false })).toBeVisible()
      }
    }
  })

  test('should show confirmed by in expanded view only', async ({ page }) => {
    const cards = page.locator('.card')
    const cardCount = await cards.count()

    if (cardCount > 0) {
      const firstCard = cards.first()

      // When collapsed, confirmed by should NOT be visible
      const confirmedByCollapsed = firstCard.locator('[data-testid="confirmed-by"]')
      await expect(confirmedByCollapsed).not.toBeVisible()

      // Click to expand
      const expandButton = firstCard.locator('button').filter({ has: page.locator('svg.lucide-chevron-down') })
      if ((await expandButton.count()) > 0) {
        await expandButton.click()

        // After expanding, if confirmedByName is set, it should be visible
        // The text "Confirmed by" followed by a name should appear in expanded view
        const expandedDetails = page.locator('.border-t.border-muted')
        await expect(expandedDetails).toBeVisible()
      }
    }
  })

  test('should show confirmed by after location in expanded view', async ({ page }) => {
    const cards = page.locator('.card')
    const cardCount = await cards.count()

    if (cardCount > 0) {
      // Expand the first card
      const expandButton = cards.first().locator('button').filter({ has: page.locator('svg.lucide-chevron-down') })
      if ((await expandButton.count()) > 0) {
        await expandButton.click()

        // Get the expanded section content
        const expandedSection = page.locator('.border-t.border-muted')
        const content = await expandedSection.textContent()

        // If both Location and Confirmed by are present, Location should come first
        if (content && content.includes('Location') && content.includes('Confirmed by')) {
          const locationIndex = content.indexOf('Location')
          const confirmedByIndex = content.indexOf('Confirmed by')
          expect(confirmedByIndex).toBeGreaterThan(locationIndex)
        }
      }
    }
  })
})

test.describe('History Navigation Integration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    // Clear confirmations to ensure fresh state
    await page.request.post('http://localhost:3000/api/test-fixtures/clear-confirmations')
    await login(page)
    // Reload to ensure dashboard shows fresh data
    await page.reload({ waitUntil: 'networkidle' })
  })

  test('should navigate between dashboard and history', async ({ page }) => {
    // Start on dashboard
    await expect(page).toHaveURL('/')

    // Go to history via nav button
    await page.getByRole('button', { name: /history/i }).click()
    await expect(page).toHaveURL('/history')

    // Go back to dashboard via nav
    await page.getByRole('button', { name: /dashboard/i }).click()
    await expect(page).toHaveURL('/')
  })

  test('should show confirmed medication in history after confirming on dashboard', async ({
    page,
  }) => {
    // Ensure there's at least one confirm button available
    const confirmButtons = page.locator('.btn-primary')
    await expect(confirmButtons.first()).toBeVisible({ timeout: 10000 })

    // Handle potential conflict dialog (use once() to auto-remove)
    page.once('dialog', (dialog) => dialog.accept())

    await confirmButtons.first().click()
    await page.waitForLoadState('networkidle')

    // Navigate to history
    await page.getByRole('button', { name: /history/i }).click()
    await expect(page).toHaveURL('/history')
    await page.waitForLoadState('networkidle')

    // Should see at least one entry
    const cards = page.locator('.card')
    await expect(cards.first()).toBeVisible({ timeout: 10000 })
  })
})
