import { test, expect, Page } from '@playwright/test'

// Helper to login as admin
async function loginAsAdmin(page: Page) {
  await page.goto('/login')
  await page.getByPlaceholder('Enter password...').fill('yuki2026')
  await page.getByRole('button', { name: 'Login' }).click()
  await expect(page).toHaveURL('/')
}

test.describe('Card Shadow Clipping', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await loginAsAdmin(page)
    await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible()
    await page.waitForLoadState('networkidle')
  })

  test('clipped containers should have sufficient internal padding for shadows', async ({ page }) => {
    const firstCard = page.locator('.card').first()
    await expect(firstCard).toBeVisible({ timeout: 10000 })

    // Check that containers with overflow:hidden have sufficient padding
    const clippingIssues = await page.evaluate(() => {
      const cards = document.querySelectorAll('.card')
      const issues: string[] = []

      // Get the shadow offset from the first card
      const firstCard = cards[0]
      const cardStyle = window.getComputedStyle(firstCard)
      const shadowMatch = cardStyle.boxShadow.match(/(\d+)px\s+(\d+)px/)
      const shadowOffset = shadowMatch ? Math.max(parseInt(shadowMatch[1]), parseInt(shadowMatch[2])) : 8

      cards.forEach((card, index) => {
        let element = card.parentElement

        while (element && element !== document.body) {
          const style = window.getComputedStyle(element)

          // If this element has overflow:hidden, check it has sufficient padding
          if (style.overflow === 'hidden' || style.overflowX === 'hidden' || style.overflowY === 'hidden') {
            const paddingTop = parseInt(style.paddingTop) || 0
            const paddingRight = parseInt(style.paddingRight) || 0
            const paddingBottom = parseInt(style.paddingBottom) || 0
            const paddingLeft = parseInt(style.paddingLeft) || 0

            const minPadding = Math.min(paddingTop, paddingRight, paddingBottom, paddingLeft)

            if (minPadding < shadowOffset) {
              const className = element.className.split(' ').slice(0, 2).join(' ')
              issues.push(`Card ${index}: ${element.tagName}.${className} has overflow:hidden but only ${minPadding}px padding (need ${shadowOffset}px)`)
            }
          }
          element = element.parentElement
        }
      })

      return { issues, shadowOffset }
    })

    console.log('Shadow offset:', clippingIssues.shadowOffset)
    console.log('Clipping issues:', clippingIssues.issues)

    // All clipped containers should have sufficient padding
    expect(clippingIssues.issues, 'Found containers with insufficient padding for shadows').toHaveLength(0)
  })

  test('cards should have sufficient padding space for shadows', async ({ page }) => {
    const firstCard = page.locator('.card').first()
    await expect(firstCard).toBeVisible({ timeout: 10000 })

    // Check that card wrapper has enough padding for shadows
    const paddingCheck = await page.evaluate(() => {
      const card = document.querySelector('.card')
      if (!card) return { error: 'No card found' }

      // Get the card's computed shadow
      const cardStyle = window.getComputedStyle(card)
      const boxShadow = cardStyle.boxShadow

      // Parse shadow offset (simplified - looking for the offset values)
      // Box shadow format: offset-x offset-y blur spread color
      // Our shadow is like "8px 8px 0px 0px #E2E8F0"
      const shadowMatch = boxShadow.match(/(\d+)px\s+(\d+)px/)
      const shadowOffset = shadowMatch ? Math.max(parseInt(shadowMatch[1]), parseInt(shadowMatch[2])) : 0

      // Find the card-list-wrapper or immediate parent
      const wrapper = card.closest('.card-list-wrapper') || card.parentElement
      if (!wrapper) return { error: 'No wrapper found', shadowOffset }

      const wrapperStyle = window.getComputedStyle(wrapper)
      const paddingRight = parseInt(wrapperStyle.paddingRight) || 0
      const paddingBottom = parseInt(wrapperStyle.paddingBottom) || 0

      return {
        shadowOffset,
        paddingRight,
        paddingBottom,
        hasSufficientPadding: paddingRight >= shadowOffset && paddingBottom >= shadowOffset,
      }
    })

    console.log('Padding check:', paddingCheck)

    // The wrapper padding should be >= shadow offset to prevent clipping
    expect(paddingCheck.hasSufficientPadding,
      `Insufficient padding for shadows. Shadow offset: ${paddingCheck.shadowOffset}px, Padding: ${paddingCheck.paddingRight}px`
    ).toBe(true)
  })

  test('card hover transform should not cause clipping', async ({ page }) => {
    const firstCard = page.locator('.card').first()
    await expect(firstCard).toBeVisible({ timeout: 10000 })

    // Get card position before hover
    const beforeBox = await firstCard.boundingBox()

    // Hover and wait for animation
    await firstCard.hover()
    await page.waitForTimeout(400)

    // Get card position during hover
    const afterBox = await firstCard.boundingBox()

    // Take screenshot for visual inspection
    await page.screenshot({ path: 'test-results/card-hover-clipping.png', fullPage: true })

    // The card should move up (translateY negative) on hover
    expect(afterBox).not.toBeNull()
    expect(beforeBox).not.toBeNull()

    if (beforeBox && afterBox) {
      // Card should be higher (smaller Y) on hover
      expect(afterBox.y).toBeLessThan(beforeBox.y)

      // Check that the card isn't at the edge of its container (would indicate clipping)
      const containerCheck = await page.evaluate(() => {
        const card = document.querySelector('.card:hover') || document.querySelector('.card')
        if (!card) return null

        const cardRect = card.getBoundingClientRect()
        const parent = card.parentElement
        if (!parent) return null

        const parentRect = parent.getBoundingClientRect()

        return {
          cardTop: cardRect.top,
          parentTop: parentRect.top,
          spaceAbove: cardRect.top - parentRect.top,
        }
      })

      console.log('Container check:', containerCheck)

      // There should be space above the card for the hover lift effect
      if (containerCheck) {
        expect(containerCheck.spaceAbove, 'Card is touching top of container - may be clipped').toBeGreaterThan(0)
      }
    }
  })
})
