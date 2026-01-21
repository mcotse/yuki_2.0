import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import QuickLogCard from '../QuickLogCard.vue'

// Mock the instances store
const mockCreateQuickLog = vi.fn()
vi.mock('@/stores/instances', () => ({
  useInstancesStore: vi.fn(() => ({
    createQuickLog: mockCreateQuickLog,
    isLoading: false,
  })),
}))

// Default mock implementation returns success
beforeAll(() => {
  mockCreateQuickLog.mockResolvedValue({ success: true })
})

describe('QuickLogCard', () => {
  let wrapper: VueWrapper

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    wrapper = mount(QuickLogCard)
  })

  describe('initial state', () => {
    it('renders the quick log card with collapsed state', () => {
      expect(wrapper.find('[data-testid="quick-log-card"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="quick-log-trigger"]').exists()).toBe(true)
    })

    it('shows "Quick Log" text and plus icon', () => {
      const trigger = wrapper.find('[data-testid="quick-log-trigger"]')
      expect(trigger.text()).toContain('Quick Log')
    })

    it('category options are hidden by default', () => {
      expect(wrapper.find('[data-testid="quick-log-options"]').exists()).toBe(false)
    })
  })

  describe('expanding/collapsing', () => {
    it('expands when trigger is clicked', async () => {
      await wrapper.find('[data-testid="quick-log-trigger"]').trigger('click')
      expect(wrapper.find('[data-testid="quick-log-options"]').exists()).toBe(true)
    })

    it('shows category chips when expanded', async () => {
      await wrapper.find('[data-testid="quick-log-trigger"]').trigger('click')

      expect(wrapper.find('[data-testid="category-snack"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="category-behavior"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="category-symptom"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="category-other"]').exists()).toBe(true)
    })

    it('collapses when trigger is clicked again', async () => {
      await wrapper.find('[data-testid="quick-log-trigger"]').trigger('click')
      expect(wrapper.find('[data-testid="quick-log-options"]').exists()).toBe(true)

      await wrapper.find('[data-testid="quick-log-trigger"]').trigger('click')
      expect(wrapper.find('[data-testid="quick-log-options"]').exists()).toBe(false)
    })
  })

  describe('category selection', () => {
    beforeEach(async () => {
      await wrapper.find('[data-testid="quick-log-trigger"]').trigger('click')
    })

    it('shows note input when category is selected', async () => {
      await wrapper.find('[data-testid="category-snack"]').trigger('click')
      expect(wrapper.find('[data-testid="quick-log-input"]').exists()).toBe(true)
    })

    it('highlights selected category', async () => {
      await wrapper.find('[data-testid="category-snack"]').trigger('click')
      expect(wrapper.find('[data-testid="category-snack"]').classes()).toContain('selected')
    })

    it('shows confirm button after category selection', async () => {
      await wrapper.find('[data-testid="category-snack"]').trigger('click')
      expect(wrapper.find('[data-testid="quick-log-submit"]').exists()).toBe(true)
    })

    it('can switch between categories', async () => {
      await wrapper.find('[data-testid="category-snack"]').trigger('click')
      expect(wrapper.find('[data-testid="category-snack"]').classes()).toContain('selected')

      await wrapper.find('[data-testid="category-behavior"]').trigger('click')
      expect(wrapper.find('[data-testid="category-snack"]').classes()).not.toContain('selected')
      expect(wrapper.find('[data-testid="category-behavior"]').classes()).toContain('selected')
    })
  })

  describe('submitting quick log', () => {
    beforeEach(async () => {
      mockCreateQuickLog.mockResolvedValue({ success: true })
      await wrapper.find('[data-testid="quick-log-trigger"]').trigger('click')
      await wrapper.find('[data-testid="category-snack"]').trigger('click')
    })

    it('calls createQuickLog with category when submitted', async () => {
      await wrapper.find('[data-testid="quick-log-submit"]').trigger('click')

      expect(mockCreateQuickLog).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'snack',
        })
      )
    })

    it('includes note when provided', async () => {
      const input = wrapper.find('[data-testid="quick-log-input"]')
      await input.setValue('Gave treats after eye drops')

      await wrapper.find('[data-testid="quick-log-submit"]').trigger('click')

      expect(mockCreateQuickLog).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'snack',
          note: 'Gave treats after eye drops',
        })
      )
    })

    it('resets form after successful submission', async () => {
      vi.useFakeTimers()
      await wrapper.find('[data-testid="quick-log-submit"]').trigger('click')

      // Wait for async operation
      await wrapper.vm.$nextTick()

      // Fast-forward past the success animation delay (800ms)
      vi.advanceTimersByTime(900)
      await wrapper.vm.$nextTick()

      // Should collapse and reset
      expect(wrapper.find('[data-testid="quick-log-options"]').exists()).toBe(false)
      vi.useRealTimers()
    })

    it('shows success feedback after submission', async () => {
      await wrapper.find('[data-testid="quick-log-submit"]').trigger('click')
      await wrapper.vm.$nextTick()

      // Success animation or message should appear briefly
      expect(wrapper.emitted('logged')).toBeTruthy()
    })
  })

  describe('keyboard interactions', () => {
    it('allows Enter to submit when category selected and focused on input', async () => {
      await wrapper.find('[data-testid="quick-log-trigger"]').trigger('click')
      await wrapper.find('[data-testid="category-snack"]').trigger('click')

      const input = wrapper.find('[data-testid="quick-log-input"]')
      await input.setValue('Test note')
      await input.trigger('keydown', { key: 'Enter' })
      await wrapper.vm.$nextTick()

      expect(mockCreateQuickLog).toHaveBeenCalled()
    })

    it('allows Escape to collapse the card', async () => {
      await wrapper.find('[data-testid="quick-log-trigger"]').trigger('click')
      await wrapper.vm.$nextTick()
      expect(wrapper.find('[data-testid="quick-log-options"]').exists()).toBe(true)

      await wrapper.find('[data-testid="quick-log-card"]').trigger('keydown', { key: 'Escape' })
      await wrapper.vm.$nextTick()
      expect(wrapper.find('[data-testid="quick-log-options"]').exists()).toBe(false)
    })
  })

  describe('category labels and icons', () => {
    beforeEach(async () => {
      await wrapper.find('[data-testid="quick-log-trigger"]').trigger('click')
    })

    it('snack category has correct label', () => {
      expect(wrapper.find('[data-testid="category-snack"]').text()).toContain('Snack')
    })

    it('behavior category has correct label', () => {
      expect(wrapper.find('[data-testid="category-behavior"]').text()).toContain('Behavior')
    })

    it('symptom category has correct label', () => {
      expect(wrapper.find('[data-testid="category-symptom"]').text()).toContain('Symptom')
    })

    it('other category has correct label', () => {
      expect(wrapper.find('[data-testid="category-other"]').text()).toContain('Other')
    })
  })
})
