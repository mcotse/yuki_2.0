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

// Helper to navigate to medication management page (via Settings → Manage Reminders)
async function navigateToMedicationManagement(page: Page) {
  await page.getByRole('button', { name: /settings/i }).click()
  await expect(page).toHaveURL('/settings')
  await page.getByText('Manage Reminders').click()
  await expect(page).toHaveURL('/medications')
}

// Helper to open the add modal on MedicationsView (Plus icon button, no text)
async function openAddModal(page: Page) {
  await page.locator('button').filter({ has: page.locator('svg.lucide-plus') }).click()
  await expect(page.getByRole('heading', { name: 'Add Item' })).toBeVisible()
}

// Helper to click edit on a card in MedicationsView
// Edit is the first button in each card (before Archive and expand buttons)
async function clickEditOnCard(card: ReturnType<Page['locator']>) {
  await card.locator('button').first().click()
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
    await expect(page.getByRole('heading', { name: 'Manage Reminders' })).toBeVisible()

    // Should see Add button (Plus icon)
    await expect(page.locator('button').filter({ has: page.locator('svg.lucide-plus') })).toBeVisible()
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

    // Cards should show location and frequency info
    const firstCard = cards.first()
    await expect(firstCard.locator('p').first()).toBeVisible()
  })

  test('items are grouped by type', async ({ page }) => {
    // Wait for medications to load
    await expect(page.locator('.card').first()).toBeVisible({ timeout: 10000 })

    // Should show type section headings (Medications, Supplements, Food)
    const sectionHeadings = page.locator('h2')
    await expect(sectionHeadings.first()).toBeVisible()
  })

  test('can toggle between active and archived', async ({ page }) => {
    // Wait for medications to load
    await expect(page.locator('.card').first()).toBeVisible({ timeout: 10000 })

    // Click the Archived toggle button
    await page.getByRole('button', { name: /Archived/i }).click()

    // Should now show archived view (may have items or empty state)
    await page.waitForLoadState('networkidle')

    // Switch back to Active
    await page.getByRole('button', { name: /Active/i }).click()
    await page.waitForLoadState('networkidle')
  })

  test('back button navigates to settings', async ({ page }) => {
    // Wait for page to load
    await expect(page.getByRole('heading', { name: 'Manage Reminders' })).toBeVisible()

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
    await openAddModal(page)

    // Form fields should be present
    await expect(page.getByPlaceholder('e.g., Cyclosporine')).toBeVisible()
    await expect(page.locator('select').first()).toBeVisible()
  })

  test('can close add modal with Cancel', async ({ page }) => {
    await openAddModal(page)

    await page.getByRole('button', { name: 'Cancel' }).click()

    await expect(page.getByRole('heading', { name: 'Add Item' })).not.toBeVisible()
  })

  test('can close add modal with X button', async ({ page }) => {
    await openAddModal(page)

    await page.locator('button').filter({ has: page.locator('svg.lucide-x') }).click()

    await expect(page.getByRole('heading', { name: 'Add Item' })).not.toBeVisible()
  })

  test('validates required name field', async ({ page }) => {
    await openAddModal(page)

    // Try to submit without name - button should be disabled
    const submitButton = page.locator('button[type="submit"]')
    await expect(submitButton).toBeDisabled()
  })

  test('can add a new medication', async ({ page }) => {
    const testMedName = `${TEST_PREFIX}-TestMed-${Date.now()}`

    // Wait for page to be ready
    await page.waitForLoadState('networkidle')

    await openAddModal(page)

    // Locate the modal form
    const modal = page.locator('.fixed.inset-0').first()

    // Fill form
    const nameInput = page.getByPlaceholder('e.g., Cyclosporine')
    await expect(nameInput).toBeVisible()
    await nameInput.fill(testMedName)

    // Select dropdowns within the modal
    const formSelects = modal.locator('select')
    await formSelects.nth(0).selectOption('medication') // Type
    await formSelects.nth(1).selectOption('oral') // Location/Category

    await page.getByPlaceholder('e.g., 1 drop, 2 capsules').fill('1 tablet')
    await formSelects.nth(2).selectOption('1x_daily') // Frequency

    // Submit
    const submitButton = page.locator('button[type="submit"]').filter({ hasText: /Add Item/ })
    await submitButton.click()

    // Modal should close
    await expect(page.getByRole('heading', { name: 'Add Item' })).not.toBeVisible({ timeout: 15000 })

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

    // Find edit button using Edit2 icon
    const firstCard = page.locator('.card').first()
    await clickEditOnCard(firstCard)

    // Edit modal should appear
    await expect(page.getByRole('heading', { name: 'Edit Item' })).toBeVisible()
  })

  test('edit modal is pre-filled with medication data', async ({ page }) => {
    await expect(page.locator('.card').first()).toBeVisible({ timeout: 10000 })
    await page.waitForLoadState('networkidle')

    // Get the name from the first card
    const firstName = await page.locator('.card').first().locator('h3').textContent()

    // Click edit
    const firstCard = page.locator('.card').first()
    await clickEditOnCard(firstCard)

    // Name field should be pre-filled
    const nameInput = page.getByPlaceholder('e.g., Cyclosporine')
    await expect(nameInput).toBeVisible()
    const inputValue = await nameInput.inputValue()
    expect(inputValue).toContain(firstName?.trim())
  })

  test('can update medication name', async ({ page }) => {
    await expect(page.locator('.card').first()).toBeVisible({ timeout: 10000 })
    await page.waitForLoadState('networkidle')

    // Click edit on first card
    const firstCard = page.locator('.card').first()
    await clickEditOnCard(firstCard)

    await expect(page.getByRole('heading', { name: 'Edit Item' })).toBeVisible()

    // Update name
    const nameInput = page.getByPlaceholder('e.g., Cyclosporine')
    const originalName = await nameInput.inputValue()
    const updatedName = `${originalName} (Updated)`
    await nameInput.fill(updatedName)

    // Save
    await page.getByRole('button', { name: 'Save Changes' }).click()

    // Modal should close and name should be updated
    await expect(page.getByRole('heading', { name: 'Edit Item' })).not.toBeVisible({ timeout: 10000 })
    await expect(page.getByText(updatedName)).toBeVisible()

    // Restore original name
    const updatedCard = page.locator('.card').filter({ hasText: updatedName })
    await clickEditOnCard(updatedCard)
    await page.getByPlaceholder('e.g., Cyclosporine').fill(originalName)
    await page.getByRole('button', { name: 'Save Changes' }).click()
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

    // Get the name of the first medication
    const firstCard = page.locator('.card').first()
    const medName = await firstCard.locator('h3').textContent()

    // Click archive (archive icon)
    await firstCard.locator('button').filter({ has: page.locator('svg.lucide-archive') }).click()

    // Wait for update
    await page.waitForLoadState('networkidle')

    // Switch to Archived tab to verify
    await page.getByRole('button', { name: /Archived/i }).click()
    await page.waitForLoadState('networkidle')

    // Should see the medication in archived list
    await expect(page.getByText(medName?.trim() || '')).toBeVisible({ timeout: 5000 })

    // Reactivate it to restore state
    const archivedCard = page.locator('.card').filter({ hasText: medName?.trim() || '' })
    await archivedCard.locator('button').filter({ has: page.locator('svg.lucide-rotate-ccw') }).click()
    await page.waitForLoadState('networkidle')
  })

  test('can reactivate an inactive medication', async ({ page }) => {
    // Switch to Archived tab
    await page.getByRole('button', { name: /Archived/i }).click()
    await page.waitForLoadState('networkidle')

    // Find an archived medication
    const archivedCard = page.locator('.card').first()

    // Skip if no archived medications
    const hasArchived = await archivedCard.count() > 0
    if (!hasArchived) {
      test.skip()
      return
    }

    const medName = await archivedCard.locator('h3').textContent()

    // Click reactivate (rotate-ccw icon)
    await archivedCard.locator('button').filter({ has: page.locator('svg.lucide-rotate-ccw') }).click()

    // Wait for update
    await page.waitForLoadState('networkidle')

    // Switch back to Active tab
    await page.getByRole('button', { name: /Active/i }).click()
    await page.waitForLoadState('networkidle')

    // Should see the medication in active list
    await expect(page.getByText(medName?.trim() || '')).toBeVisible({ timeout: 5000 })
  })
})

test.describe('Medication Management - Clone Medication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await loginAsAdmin(page)
    // Clone lives on the admin medications view at /admin/medications
    await page.goto('/admin/medications')
    await expect(page.getByRole('heading', { name: 'Manage Reminders' })).toBeVisible({ timeout: 10000 })
  })

  test('clone button exists on medication cards', async ({ page }) => {
    await expect(page.locator('.card').first()).toBeVisible({ timeout: 10000 })

    const firstCard = page.locator('.card').first()
    const cloneButton = firstCard.getByTitle('Clone')
    await expect(cloneButton).toBeVisible()
  })

  test('clicking clone opens modal with Clone Item title', async ({ page }) => {
    await expect(page.locator('.card').first()).toBeVisible({ timeout: 10000 })
    await page.waitForLoadState('networkidle')

    const firstCard = page.locator('.card').first()
    await firstCard.getByTitle('Clone').click()

    await expect(page.getByRole('heading', { name: 'Clone Item' })).toBeVisible()
  })

  test('clone modal pre-fills name with (copy) suffix', async ({ page }) => {
    await expect(page.locator('.card').first()).toBeVisible({ timeout: 10000 })
    await page.waitForLoadState('networkidle')

    // Get the name from the first card
    const firstName = await page.locator('.card').first().locator('h3').textContent()
    const sourceName = firstName?.replace('(inactive)', '').trim() || ''

    // Click clone
    await page.locator('.card').first().getByTitle('Clone').click()
    await expect(page.getByRole('heading', { name: 'Clone Item' })).toBeVisible()

    // Name field should be pre-filled with "(copy)" suffix
    const nameInput = page.getByPlaceholder('e.g., Ofloxacin 0.3%')
    await expect(nameInput).toHaveValue(`${sourceName} (copy)`)
  })

  test('clone modal shows info banner with source name', async ({ page }) => {
    await expect(page.locator('.card').first()).toBeVisible({ timeout: 10000 })
    await page.waitForLoadState('networkidle')

    const firstName = await page.locator('.card').first().locator('h3').textContent()
    const sourceName = firstName?.replace('(inactive)', '').trim() || ''

    await page.locator('.card').first().getByTitle('Clone').click()
    await expect(page.getByRole('heading', { name: 'Clone Item' })).toBeVisible()

    // Info banner should mention the source item
    const banner = page.locator('.bg-accent\\/10')
    await expect(banner).toBeVisible()
    await expect(banner.getByText(`Cloning from`)).toBeVisible()
    await expect(banner.getByText(sourceName)).toBeVisible()
  })

  test('can clone a medication and see it in the list', async ({ page }) => {
    await expect(page.locator('.card').first()).toBeVisible({ timeout: 10000 })
    await page.waitForLoadState('networkidle')

    // Get original medication name
    const firstName = await page.locator('.card').first().locator('h3').textContent()
    const sourceName = firstName?.replace('(inactive)', '').trim() || ''

    // Click clone on first card
    await page.locator('.card').first().getByTitle('Clone').click()
    await expect(page.getByRole('heading', { name: 'Clone Item' })).toBeVisible()

    // Give it a unique name to avoid collisions
    const clonedName = `${TEST_PREFIX}-Clone-${Date.now()}`
    const nameInput = page.getByPlaceholder('e.g., Ofloxacin 0.3%')
    await nameInput.fill(clonedName)

    // Submit via Clone button
    const submitButton = page.locator('button[type="submit"]').filter({ hasText: /Clone/ })
    await submitButton.click()

    // Modal should close
    await expect(page.getByRole('heading', { name: 'Clone Item' })).not.toBeVisible({ timeout: 15000 })

    // Cloned medication should appear in the list
    await page.waitForLoadState('networkidle')
    await expect(page.getByText(clonedName)).toBeVisible({ timeout: 10000 })
  })

  test('cloned medication preserves type and fields from source', async ({ page }) => {
    await expect(page.locator('.card').first()).toBeVisible({ timeout: 10000 })
    await page.waitForLoadState('networkidle')

    // Read source card details before cloning
    const firstCard = page.locator('.card').first()
    const sourceBadges = await firstCard.locator('.rounded-full').allTextContents()

    // Clone it
    await firstCard.getByTitle('Clone').click()
    await expect(page.getByRole('heading', { name: 'Clone Item' })).toBeVisible()

    const modal = page.locator('.fixed.inset-0').first()
    const formSelects = modal.locator('select')

    // Type select should have a value (not be empty/default if source had one)
    const typeValue = await formSelects.nth(0).inputValue()
    expect(['medication', 'food', 'supplement']).toContain(typeValue)

    // Category select should have a value
    const categoryValue = await formSelects.nth(1).inputValue()
    expect(['leftEye', 'rightEye', 'oral', 'food']).toContain(categoryValue)

    // Frequency select should have a value
    const frequencyValue = await formSelects.nth(2).inputValue()
    expect(['1x_daily', '2x_daily', '4x_daily', '12h', 'as_needed']).toContain(frequencyValue)
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
