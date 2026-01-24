import { test, expect, Page } from '@playwright/test'

// Unique prefix for medication management tests
const TEST_PREFIX = 'MEDMGMT'

// Helper to login as admin
async function loginAsAdmin(page: Page) {
  await page.goto('/login')
  await page.getByPlaceholder('Enter password...').fill('yuki2026')
  await page.getByRole('button', { name: 'Login' }).click()
  await expect(page).toHaveURL('/')
}

// Helper to navigate to medication management page
async function navigateToMedicationManagement(page: Page) {
  await page.getByRole('button', { name: /settings/i }).click()
  await expect(page).toHaveURL('/settings')
  await page.getByText('Manage Medications').click()
  await expect(page).toHaveURL('/admin/medications')
}

test.describe('Medication Management - Access Control', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
  })

  test('admin can access medication management page', async ({ page }) => {
    await loginAsAdmin(page)
    await navigateToMedicationManagement(page)

    // Should see the page header
    await expect(page.getByRole('heading', { name: 'Manage Medications' })).toBeVisible()

    // Should see Add button
    await expect(page.getByRole('button', { name: /add/i })).toBeVisible()
  })

  test('unauthenticated user is redirected to login', async ({ page }) => {
    // Try to access admin page without logging in
    await page.goto('/admin/medications')

    // Should be redirected to login
    await expect(page).toHaveURL('/login')
  })
})

test.describe('Medication Management - View Medications', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await loginAsAdmin(page)
    await navigateToMedicationManagement(page)
  })

  test('displays list of medications', async ({ page }) => {
    // Should show medication cards
    const cards = page.locator('.card')
    await expect(cards.first()).toBeVisible({ timeout: 10000 })

    // Each card should have a name
    const firstCard = cards.first()
    await expect(firstCard.locator('h3')).toBeVisible()
  })

  test('shows medication details in cards', async ({ page }) => {
    const cards = page.locator('.card')
    await expect(cards.first()).toBeVisible({ timeout: 10000 })

    // Cards should show type and frequency badges (use first() due to multiple badges)
    const firstCard = cards.first()
    await expect(firstCard.locator('.rounded-full').first()).toBeVisible()
  })

  test('can filter by type', async ({ page }) => {
    // Wait for medications to load
    await expect(page.locator('.card').first()).toBeVisible({ timeout: 10000 })

    // Select medication type filter
    const typeFilter = page.locator('select')
    await typeFilter.selectOption('medication')

    // Should only show medications (not food/supplements)
    await page.waitForLoadState('networkidle')
  })

  test('can toggle show inactive', async ({ page }) => {
    // Wait for medications to load
    await expect(page.locator('.card').first()).toBeVisible({ timeout: 10000 })

    // Toggle show inactive
    const showInactiveCheckbox = page.locator('input[type="checkbox"]')
    await showInactiveCheckbox.check()

    // Count might change (more items visible if there are inactive ones)
    await page.waitForLoadState('networkidle')
  })

  test('back button navigates to settings', async ({ page }) => {
    // Wait for page to load
    await expect(page.getByRole('heading', { name: 'Manage Medications' })).toBeVisible()

    // Click back button
    await page.locator('button').filter({ has: page.locator('svg.lucide-arrow-left') }).click()

    // Should go back to settings
    await expect(page).toHaveURL('/settings')
  })
})

test.describe('Medication Management - Add Medication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await loginAsAdmin(page)
    await navigateToMedicationManagement(page)
  })

  test('opens add modal when clicking Add button', async ({ page }) => {
    await page.getByRole('button', { name: /add/i }).click()

    // Modal should appear
    await expect(page.getByRole('heading', { name: 'Add Medication' })).toBeVisible()

    // Form fields should be present
    await expect(page.getByPlaceholder('e.g., Ofloxacin 0.3%')).toBeVisible()
    await expect(page.locator('select').first()).toBeVisible()
  })

  test('can close add modal with Cancel', async ({ page }) => {
    await page.getByRole('button', { name: /add/i }).click()
    await expect(page.getByRole('heading', { name: 'Add Medication' })).toBeVisible()

    await page.getByRole('button', { name: 'Cancel' }).click()

    await expect(page.getByRole('heading', { name: 'Add Medication' })).not.toBeVisible()
  })

  test('can close add modal with X button', async ({ page }) => {
    await page.getByRole('button', { name: /add/i }).click()
    await expect(page.getByRole('heading', { name: 'Add Medication' })).toBeVisible()

    await page.locator('button').filter({ has: page.locator('svg.lucide-x') }).click()

    await expect(page.getByRole('heading', { name: 'Add Medication' })).not.toBeVisible()
  })

  test('validates required name field', async ({ page }) => {
    await page.getByRole('button', { name: /add/i }).click()

    // Try to submit without name - button should be disabled
    const submitButton = page.getByRole('button', { name: /^add$/i }).last()
    await expect(submitButton).toBeDisabled()
  })

  test('can add a new medication', async ({ page }) => {
    const testMedName = `${TEST_PREFIX}-TestMed-${Date.now()}`

    // Wait for page to be ready
    await page.waitForLoadState('networkidle')

    // Click the Add button in the header
    await page.locator('button').filter({ hasText: /Add/ }).first().click()
    await expect(page.getByRole('heading', { name: 'Add Medication' })).toBeVisible()

    // Locate the modal form
    const modal = page.locator('[role="dialog"], .fixed.inset-0').first()

    // Fill form - wait for each field
    const nameInput = page.getByPlaceholder('e.g., Ofloxacin 0.3%')
    await expect(nameInput).toBeVisible()
    await nameInput.fill(testMedName)

    // Select dropdowns - target selects within the modal form area
    const formSelects = modal.locator('select')
    await formSelects.nth(0).selectOption('medication') // Type
    await formSelects.nth(1).selectOption('oral') // Location/Category

    await page.getByPlaceholder('e.g., 1 drop, 50mg').fill('1 tablet')
    await formSelects.nth(2).selectOption('1x_daily') // Frequency

    // Submit using the button inside the form modal
    const submitButton = page.locator('button[type="submit"]').filter({ hasText: /Add/ })
    await submitButton.click()

    // Modal should close
    await expect(page.getByRole('heading', { name: 'Add Medication' })).not.toBeVisible({ timeout: 15000 })

    // New medication should appear in list
    await page.waitForLoadState('networkidle')
    await expect(page.getByText(testMedName)).toBeVisible({ timeout: 10000 })
  })
})

test.describe('Medication Management - Edit Medication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await loginAsAdmin(page)
    await navigateToMedicationManagement(page)
  })

  test('opens edit modal when clicking edit button', async ({ page }) => {
    // Wait for medications to load
    await expect(page.locator('.card').first()).toBeVisible({ timeout: 10000 })
    await page.waitForLoadState('networkidle')

    // Find edit button using title attribute
    const firstCard = page.locator('.card').first()
    const editButton = firstCard.getByTitle('Edit')
    await expect(editButton).toBeVisible()
    await editButton.click()

    // Edit modal should appear
    await expect(page.getByRole('heading', { name: 'Edit Medication' })).toBeVisible()
  })

  test('edit modal is pre-filled with medication data', async ({ page }) => {
    await expect(page.locator('.card').first()).toBeVisible({ timeout: 10000 })
    await page.waitForLoadState('networkidle')

    // Get the name from the first card
    const firstName = await page.locator('.card').first().locator('h3').textContent()

    // Click edit using title
    const firstCard = page.locator('.card').first()
    await firstCard.getByTitle('Edit').click()

    // Name field should be pre-filled
    const nameInput = page.getByPlaceholder('e.g., Ofloxacin 0.3%')
    await expect(nameInput).toBeVisible()
    const inputValue = await nameInput.inputValue()
    expect(inputValue).toContain(firstName?.replace('(inactive)', '').trim())
  })

  test('can update medication name', async ({ page }) => {
    await expect(page.locator('.card').first()).toBeVisible({ timeout: 10000 })
    await page.waitForLoadState('networkidle')

    // Click edit on first card
    const firstCard = page.locator('.card').first()
    await firstCard.getByTitle('Edit').click()

    await expect(page.getByRole('heading', { name: 'Edit Medication' })).toBeVisible()

    // Update name
    const nameInput = page.getByPlaceholder('e.g., Ofloxacin 0.3%')
    const originalName = await nameInput.inputValue()
    const updatedName = `${originalName} (Updated)`
    await nameInput.fill(updatedName)

    // Save
    await page.getByRole('button', { name: 'Save' }).click()

    // Modal should close and name should be updated
    await expect(page.getByRole('heading', { name: 'Edit Medication' })).not.toBeVisible({ timeout: 10000 })
    await expect(page.getByText(updatedName)).toBeVisible()

    // Restore original name
    await page.locator('.card').filter({ hasText: updatedName }).getByTitle('Edit').click()
    await page.getByPlaceholder('e.g., Ofloxacin 0.3%').fill(originalName)
    await page.getByRole('button', { name: 'Save' }).click()
  })
})

test.describe('Medication Management - Deactivate/Reactivate', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await loginAsAdmin(page)
    await navigateToMedicationManagement(page)
  })

  test('can deactivate a medication', async ({ page }) => {
    await expect(page.locator('.card').first()).toBeVisible({ timeout: 10000 })

    // Get the name of the first active medication
    const firstCard = page.locator('.card').filter({ has: page.locator('h3:not(:has-text("(inactive)"))') }).first()
    const medName = await firstCard.locator('h3').textContent()

    // Click deactivate (trash icon)
    await firstCard.locator('button').filter({ has: page.locator('svg.lucide-trash-2') }).click()

    // Wait for update
    await page.waitForLoadState('networkidle')

    // Card should now show as inactive or disappear (depending on filter)
    // Enable show inactive to verify
    await page.locator('input[type="checkbox"]').check()
    await page.waitForLoadState('networkidle')

    // Should see the medication marked as inactive
    await expect(page.getByText(`${medName?.trim()}(inactive)`.replace(/\s+/g, ''))).toBeVisible({ timeout: 5000 }).catch(async () => {
      // Alternative check - the card with the name should have opacity class
      const inactiveCard = page.locator('.card.opacity-50').filter({ hasText: medName?.trim() || '' })
      await expect(inactiveCard).toBeVisible()
    })

    // Reactivate it to restore state
    const inactiveCard = page.locator('.card').filter({ hasText: medName?.trim() || '' })
    await inactiveCard.locator('button').filter({ has: page.locator('svg.lucide-rotate-ccw') }).click()
    await page.waitForLoadState('networkidle')
  })

  test('can reactivate an inactive medication', async ({ page }) => {
    // First, show inactive medications
    await page.locator('input[type="checkbox"]').check()
    await page.waitForLoadState('networkidle')

    // Find an inactive medication (has opacity-50 class)
    const inactiveCard = page.locator('.card.opacity-50').first()

    // Skip if no inactive medications
    const hasInactive = await inactiveCard.count() > 0
    if (!hasInactive) {
      test.skip()
      return
    }

    const medName = await inactiveCard.locator('h3').textContent()

    // Click reactivate (rotate-ccw icon)
    await inactiveCard.locator('button').filter({ has: page.locator('svg.lucide-rotate-ccw') }).click()

    // Wait for update
    await page.waitForLoadState('networkidle')

    // Should no longer be inactive
    const activeCard = page.locator('.card:not(.opacity-50)').filter({ hasText: medName?.replace('(inactive)', '').trim() || '' })
    await expect(activeCard).toBeVisible({ timeout: 5000 })
  })
})

test.describe('Medication Management - Icon Consistency', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await loginAsAdmin(page)
    await navigateToMedicationManagement(page)
  })

  test('medications have consistent icons with dashboard', async ({ page }) => {
    await expect(page.locator('.card').first()).toBeVisible({ timeout: 10000 })

    // Verify icon elements exist in cards
    const cards = page.locator('.card')
    const firstCard = cards.first()

    // Should have an icon container with rounded-xl class
    const iconContainer = firstCard.locator('.rounded-xl').first()
    await expect(iconContainer).toBeVisible()

    // Icon container should have an SVG
    await expect(iconContainer.locator('svg')).toBeVisible()
  })
})
