/**
 * Playwright Global Setup
 * Runs before all tests to reset the database with known fixtures
 */
import { request } from '@playwright/test'

const API_BASE = 'http://localhost:3000'

async function globalSetup() {
  console.log('[Global Setup] Resetting database with test fixtures...')

  const apiContext = await request.newContext({
    baseURL: API_BASE,
  })

  try {
    // Reset database with test fixtures
    const response = await apiContext.post('/api/test-fixtures/reset')

    if (!response.ok()) {
      const error = await response.text()
      throw new Error(`Failed to reset test fixtures: ${error}`)
    }

    const result = await response.json()
    console.log('[Global Setup] Database reset complete:', result)
  } catch (error) {
    console.error('[Global Setup] Failed to reset fixtures:', error)
    // Don't throw - tests might still work with existing data
  } finally {
    await apiContext.dispose()
  }
}

export default globalSetup
