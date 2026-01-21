import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing session
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
  })

  test('should show login page when not authenticated', async ({ page }) => {
    await page.goto('/')

    // Should redirect to login
    await expect(page).toHaveURL('/login')
    await expect(page.getByRole('heading', { name: 'Yuki Care' })).toBeVisible()
    await expect(page.getByPlaceholder('Enter password...')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Login' })).toBeVisible()
  })

  test('should show error for invalid password', async ({ page }) => {
    await page.goto('/login')

    // Enter wrong password
    await page.getByPlaceholder('Enter password...').fill('wrongpassword')
    await page.getByRole('button', { name: 'Login' }).click()

    // Should show error
    await expect(page.getByText('Invalid password')).toBeVisible()
    // Should remain on login page
    await expect(page).toHaveURL('/login')
  })

  test('should login successfully with correct password', async ({ page }) => {
    await page.goto('/login')

    // Enter correct password
    await page.getByPlaceholder('Enter password...').fill('yuki2026')
    await page.getByRole('button', { name: 'Login' }).click()

    // Should redirect to dashboard
    await expect(page).toHaveURL('/')
    await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible()
  })

  test('should persist session across page reloads', async ({ page }) => {
    // Login first
    await page.goto('/login')
    await page.getByPlaceholder('Enter password...').fill('yuki2026')
    await page.getByRole('button', { name: 'Login' }).click()
    await expect(page).toHaveURL('/')

    // Reload page
    await page.reload()

    // Should still be on dashboard (session persisted)
    await expect(page).toHaveURL('/')
    await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible()
  })

  test('should logout successfully', async ({ page }) => {
    // Login first
    await page.goto('/login')
    await page.getByPlaceholder('Enter password...').fill('yuki2026')
    await page.getByRole('button', { name: 'Login' }).click()
    await expect(page).toHaveURL('/')

    // Navigate to settings and logout
    await page.goto('/settings')
    await page.getByRole('button', { name: 'Log Out' }).click()

    // Should redirect to login
    await expect(page).toHaveURL('/login')
  })
})
