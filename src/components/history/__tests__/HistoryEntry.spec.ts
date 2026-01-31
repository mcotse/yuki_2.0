import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import HistoryEntry from '../HistoryEntry.vue'
import type { HistoryEntry as HistoryEntryType } from '@/stores/history'
import type { Item, DailyInstanceWithItem } from '@/types'

// Mock the auth store
vi.mock('@/stores/auth', () => ({
  useAuthStore: vi.fn(() => ({
    isAdmin: false,
    currentUser: null,
  })),
}))

const createMockItem = (overrides?: Partial<Item>): Item => ({
  id: 'item-1',
  pet_id: null,
  type: 'medication',
  category: 'leftEye',
  name: 'Eye Drops Test',
  dose: '1 drop',
  location: 'RIGHT eye',
  notes: null,
  frequency: '2x_daily',
  active: true,
  start_date: null,
  end_date: null,
  conflict_group: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
})

const createMockInstance = (overrides?: Partial<DailyInstanceWithItem>): DailyInstanceWithItem => ({
  id: 'inst-1',
  item_id: 'item-1',
  schedule_id: null,
  date: '2024-01-15',
  scheduled_time: '2024-01-15T08:00:00Z',
  status: 'confirmed',
  confirmed_at: '2024-01-15T08:30:00Z',
  confirmed_by: 'user-123',
  snooze_until: null,
  notes: null,
  is_adhoc: false,
  created_at: '2024-01-15T00:00:00Z',
  updated_at: '2024-01-15T00:00:00Z',
  item: createMockItem(),
  ...overrides,
})

const createMockEntry = (overrides?: Partial<HistoryEntryType>): HistoryEntryType => ({
  instance: createMockInstance(),
  confirmedAt: new Date('2024-01-15T08:30:00Z'),
  confirmedByName: 'Matthew',
  ...overrides,
})

describe('HistoryEntry', () => {
  let wrapper: VueWrapper

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  describe('collapsed state', () => {
    beforeEach(() => {
      wrapper = mount(HistoryEntry, {
        props: {
          entry: createMockEntry(),
        },
      })
    })

    it('renders the medication name', () => {
      expect(wrapper.find('h3').text()).toBe('Eye Drops Test')
    })

    it('renders the dose', () => {
      expect(wrapper.text()).toContain('1 drop')
    })

    it('renders the confirmed time', () => {
      // Time is formatted by formatTime utility
      expect(wrapper.find('.lucide-clock').exists()).toBe(true)
    })

    it('does NOT show confirmed by name in collapsed state', () => {
      // The confirmed-by data-testid should not exist when collapsed
      expect(wrapper.find('[data-testid="confirmed-by"]').exists()).toBe(false)
    })

    it('shows expand button', () => {
      expect(wrapper.find('.lucide-chevron-down').exists()).toBe(true)
    })
  })

  describe('expanded state', () => {
    beforeEach(async () => {
      wrapper = mount(HistoryEntry, {
        props: {
          entry: createMockEntry(),
        },
      })
      // Click to expand
      await wrapper.find('.lucide-chevron-down').trigger('click')
    })

    it('shows chevron up when expanded', () => {
      expect(wrapper.find('.lucide-chevron-up').exists()).toBe(true)
    })

    it('shows scheduled time in expanded details', () => {
      expect(wrapper.text()).toContain('Scheduled')
    })

    it('shows confirmed time in expanded details', () => {
      expect(wrapper.text()).toContain('Confirmed')
    })

    it('shows location in expanded details', () => {
      expect(wrapper.text()).toContain('Location')
      expect(wrapper.text()).toContain('RIGHT eye')
    })

    it('shows confirmed by name in expanded details after location', () => {
      const confirmedBy = wrapper.find('[data-testid="confirmed-by"]')
      expect(confirmedBy.exists()).toBe(true)
      expect(confirmedBy.text()).toContain('Confirmed by')
      expect(confirmedBy.text()).toContain('Matthew')
    })

    it('confirmed by appears after location in DOM order', () => {
      const html = wrapper.html()
      const locationIndex = html.indexOf('Location')
      const confirmedByIndex = html.indexOf('Confirmed by')
      expect(confirmedByIndex).toBeGreaterThan(locationIndex)
    })
  })

  describe('confirmed by visibility', () => {
    it('does not show confirmed by when confirmedByName is null', async () => {
      wrapper = mount(HistoryEntry, {
        props: {
          entry: createMockEntry({ confirmedByName: null }),
        },
      })
      // Expand
      await wrapper.find('.lucide-chevron-down').trigger('click')

      expect(wrapper.find('[data-testid="confirmed-by"]').exists()).toBe(false)
    })

    it('shows confirmed by when confirmedByName is set', async () => {
      wrapper = mount(HistoryEntry, {
        props: {
          entry: createMockEntry({ confirmedByName: 'Caretaker' }),
        },
      })
      // Expand
      await wrapper.find('.lucide-chevron-down').trigger('click')

      const confirmedBy = wrapper.find('[data-testid="confirmed-by"]')
      expect(confirmedBy.exists()).toBe(true)
      expect(confirmedBy.text()).toContain('Caretaker')
    })
  })

  describe('location badge', () => {
    it('shows R badge for RIGHT eye', () => {
      wrapper = mount(HistoryEntry, {
        props: {
          entry: createMockEntry({
            instance: createMockInstance({
              item: createMockItem({ location: 'RIGHT eye' }),
            }),
          }),
        },
      })
      expect(wrapper.find('.bg-secondary').text()).toBe('R')
    })

    it('shows L badge for LEFT eye', () => {
      wrapper = mount(HistoryEntry, {
        props: {
          entry: createMockEntry({
            instance: createMockInstance({
              item: createMockItem({ location: 'LEFT eye' }),
            }),
          }),
        },
      })
      expect(wrapper.find('.bg-accent').text()).toBe('L')
    })

    it('shows O badge for ORAL', () => {
      wrapper = mount(HistoryEntry, {
        props: {
          entry: createMockEntry({
            instance: createMockInstance({
              item: createMockItem({ location: 'ORAL' }),
            }),
          }),
        },
      })
      expect(wrapper.find('.bg-tertiary').text()).toBe('O')
    })

    it('shows check icon when no location', () => {
      wrapper = mount(HistoryEntry, {
        props: {
          entry: createMockEntry({
            instance: createMockInstance({
              item: createMockItem({ location: null }),
            }),
          }),
        },
      })
      expect(wrapper.find('.lucide-check').exists()).toBe(true)
    })
  })
})
