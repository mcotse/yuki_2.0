import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

/**
 * Tests to ensure modal input fields use consistent styling.
 *
 * The visual issue: Modal inputs using `bg-background` (cream #FFFDF5) instead
 * of `bg-input` or `bg-card` (white #FFFFFF) creates excessive visual weight
 * where the input stands out too much against the white modal card.
 *
 * This test ensures all modal form inputs use proper styling:
 * - Background: bg-input or bg-card (white), NOT bg-background (cream)
 * - Padding: py-2 (compact), NOT py-3 (excessive)
 */
describe('HistoryView Modal Input Styling', () => {
  const historyViewPath = resolve(__dirname, '../HistoryView.vue')
  const historyViewContent = readFileSync(historyViewPath, 'utf-8')

  // Extract the template section from the Vue file
  const templateMatch = historyViewContent.match(/<template>([\s\S]*?)<\/template>/)
  const templateContent = templateMatch?.[1] ?? ''

  // Find all input, select, and textarea elements with their class attributes
  const inputRegex = /<(input|select|textarea)[^>]*class="([^"]*)"[^>]*>/g
  const inputMatches = [...templateContent.matchAll(inputRegex)]

  describe('modal inputs should use proper background color', () => {
    it('should NOT use bg-background on form inputs in modals', () => {
      const inputsWithBadBg = inputMatches.filter(([, , classes]) =>
        classes?.includes('bg-background'),
      )

      // If there are inputs with bg-background, list them for debugging
      if (inputsWithBadBg.length > 0) {
        const badInputs = inputsWithBadBg.map(([match]) => match).join('\n')
        expect.fail(`Found ${inputsWithBadBg.length} input(s) with bg-background:\n${badInputs}`)
      }

      expect(inputsWithBadBg.length).toBe(0)
    })

    it('should use bg-input or bg-card on form inputs', () => {
      // All inputs should have either bg-input or bg-card
      const inputsWithProperBg = inputMatches.filter(
        ([, , classes]) => classes?.includes('bg-input') || classes?.includes('bg-card'),
      )

      expect(inputsWithProperBg.length).toBe(inputMatches.length)
    })
  })

  describe('modal inputs should use compact padding', () => {
    it('should use py-2 instead of py-3 for vertical padding', () => {
      const inputsWithExcessivePadding = inputMatches.filter(([, , classes]) =>
        classes?.includes('py-3'),
      )

      if (inputsWithExcessivePadding.length > 0) {
        const padInputs = inputsWithExcessivePadding.map(([match]) => match).join('\n')
        expect.fail(`Found ${inputsWithExcessivePadding.length} input(s) with py-3:\n${padInputs}`)
      }

      expect(inputsWithExcessivePadding.length).toBe(0)
    })
  })
})
