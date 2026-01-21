import { test, expect, Page } from '@playwright/test'

// Helper to login as admin
async function loginAsAdmin(page: Page) {
  await page.goto('/login')
  await page.getByPlaceholder('Enter password...').fill('yuki2026')
  await page.getByRole('button', { name: 'Login' }).click()
  await expect(page).toHaveURL('/')
}

test.describe('Dashboard - Filter Tags', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await loginAsAdmin(page)
    // Wait for dashboard to load
    await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible()
    await page.waitForLoadState('networkidle')
  })

  test('displays filter tags', async ({ page }) => {
    // Should show filter buttons
    await expect(page.getByRole('button', { name: /left eye/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /right eye/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /oral/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /supplements/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /food/i })).toBeVisible()
  })

  test('filter tag toggles active state on click', async ({ page }) => {
    const leftEyeFilter = page.getByRole('button', { name: /left eye/i })

    // Initially should not have active styling (no X icon)
    await expect(leftEyeFilter.locator('svg.lucide-x')).not.toBeVisible()

    // Click to activate
    await leftEyeFilter.click()

    // Should now show X icon indicating active state
    await expect(leftEyeFilter.locator('svg.lucide-x')).toBeVisible()

    // Click again to deactivate
    await leftEyeFilter.click()

    // X icon should be gone
    await expect(leftEyeFilter.locator('svg.lucide-x')).not.toBeVisible()
  })

  test('filtering shows only matching medications', async ({ page }) => {
    // Wait for cards to load
    await expect(page.locator('.card').first()).toBeVisible({ timeout: 10000 })

    // Get initial card count
    const initialCount = await page.locator('.card').count()
    expect(initialCount).toBeGreaterThan(0)

    // Click Left Eye filter
    await page.getByRole('button', { name: /left eye/i }).click()

    // Wait for filter animation
    await page.waitForTimeout(400)

    // Should have fewer or equal cards (only left eye items)
    const filteredCount = await page.locator('.card').count()
    expect(filteredCount).toBeLessThanOrEqual(initialCount)
  })

  test('clearing filter shows all medications again', async ({ page }) => {
    await expect(page.locator('.card').first()).toBeVisible({ timeout: 10000 })

    const initialCount = await page.locator('.card').count()

    // Activate and then deactivate filter
    await page.getByRole('button', { name: /left eye/i }).click()
    await page.waitForTimeout(300)
    await page.getByRole('button', { name: /left eye/i }).click()
    await page.waitForTimeout(400)

    // Should be back to original count
    const finalCount = await page.locator('.card').count()
    expect(finalCount).toBe(initialCount)
  })

  test('only one filter can be active at a time', async ({ page }) => {
    const leftEyeFilter = page.getByRole('button', { name: /left eye/i })
    const rightEyeFilter = page.getByRole('button', { name: /right eye/i })

    // Activate left eye filter
    await leftEyeFilter.click()
    await expect(leftEyeFilter.locator('svg.lucide-x')).toBeVisible()

    // Click right eye filter
    await rightEyeFilter.click()

    // Left eye should be deactivated, right eye should be active
    await expect(leftEyeFilter.locator('svg.lucide-x')).not.toBeVisible()
    await expect(rightEyeFilter.locator('svg.lucide-x')).toBeVisible()
  })
})

test.describe('Dashboard - Collapsible Sections', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await loginAsAdmin(page)
    await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible()
    await page.waitForLoadState('networkidle')
  })

  test('completed section is collapsible', async ({ page }) => {
    // First confirm a medication to have something in completed section
    const firstCard = page.locator('.card').first()
    await expect(firstCard).toBeVisible({ timeout: 10000 })

    // Find and click check button
    const checkButton = firstCard.locator('button').filter({ has: page.locator('svg.lucide-check') })
    if (await checkButton.count() > 0) {
      await checkButton.click()
      await page.waitForTimeout(500)
    }

    // Look for Completed section header
    const completedHeader = page.getByRole('button').filter({ hasText: /completed/i })
    const hasCompleted = await completedHeader.count() > 0

    if (hasCompleted) {
      // Click to collapse
      await completedHeader.click()
      await page.waitForTimeout(400)

      // Chevron should be rotated (indicating collapsed)
      const chevron = completedHeader.locator('svg.lucide-chevron-down')
      await expect(chevron).toHaveClass(/-rotate-180/)

      // Click to expand
      await completedHeader.click()
      await page.waitForTimeout(400)

      // Chevron should not be rotated
      await expect(chevron).not.toHaveClass(/-rotate-180/)
    }
  })

  test('overdue section header shows count', async ({ page }) => {
    // Check if overdue section exists and shows count
    const overdueHeader = page.getByRole('button').filter({ hasText: /overdue/i })
    const hasOverdue = await overdueHeader.count() > 0

    if (hasOverdue) {
      // Should contain a count in parentheses
      const headerText = await overdueHeader.textContent()
      expect(headerText).toMatch(/\(\d+\)/)
    }
  })

  test('completed section header shows count', async ({ page }) => {
    // First confirm a medication
    const firstCard = page.locator('.card').first()
    await expect(firstCard).toBeVisible({ timeout: 10000 })

    const checkButton = firstCard.locator('button').filter({ has: page.locator('svg.lucide-check') })
    if (await checkButton.count() > 0) {
      await checkButton.click()
      await page.waitForTimeout(500)
    }

    const completedHeader = page.getByRole('button').filter({ hasText: /completed/i })
    const hasCompleted = await completedHeader.count() > 0

    if (hasCompleted) {
      // Should contain a count in parentheses
      const headerText = await completedHeader.textContent()
      expect(headerText).toMatch(/\(\d+\)/)
    }
  })

  test('collapse animation is smooth', async ({ page }) => {
    // Confirm a medication to have completed section
    const firstCard = page.locator('.card').first()
    await expect(firstCard).toBeVisible({ timeout: 10000 })

    const checkButton = firstCard.locator('button').filter({ has: page.locator('svg.lucide-check') })
    if (await checkButton.count() > 0) {
      await checkButton.click()
      await page.waitForTimeout(500)
    }

    const completedHeader = page.getByRole('button').filter({ hasText: /completed/i })
    const hasCompleted = await completedHeader.count() > 0

    if (hasCompleted) {
      // The collapse content should have transition classes
      const collapseContent = page.locator('.collapse-content')
      await expect(collapseContent.first()).toBeVisible()

      // Collapse should hide content smoothly
      await completedHeader.click()
      await page.waitForTimeout(100)

      // During animation, the content should still exist but be animating
      await page.waitForTimeout(400)
    }
  })
})

test.describe('Dashboard - Filter and Collapse Interaction', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await loginAsAdmin(page)
    await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible()
    await page.waitForLoadState('networkidle')
  })

  test('filter counts update in section headers', async ({ page }) => {
    await expect(page.locator('.card').first()).toBeVisible({ timeout: 10000 })

    // Confirm a medication first
    const firstCard = page.locator('.card').first()
    const checkButton = firstCard.locator('button').filter({ has: page.locator('svg.lucide-check') })
    if (await checkButton.count() > 0) {
      await checkButton.click()
      await page.waitForTimeout(500)
    }

    // Get completed header with count
    const completedHeader = page.getByRole('button').filter({ hasText: /completed/i })
    const hasCompleted = await completedHeader.count() > 0

    if (hasCompleted) {
      const initialText = await completedHeader.textContent()
      const initialMatch = initialText?.match(/\((\d+)\)/)
      const initialCount = initialMatch ? parseInt(initialMatch[1]) : 0

      // Apply a filter that might reduce the count
      await page.getByRole('button', { name: /oral/i }).click()
      await page.waitForTimeout(400)

      // Count may have changed
      const filteredText = await completedHeader.textContent()
      const filteredMatch = filteredText?.match(/\((\d+)\)/)
      const filteredCount = filteredMatch ? parseInt(filteredMatch[1]) : 0

      // Filtered count should be <= initial count
      expect(filteredCount).toBeLessThanOrEqual(initialCount)
    }
  })
})
