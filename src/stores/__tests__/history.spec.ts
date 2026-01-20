import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useHistoryStore, type HistoryEntry } from '../history'
import type { DailyInstanceWithItem, Item } from '@/types'

// Mock the items store
vi.mock('../items', () => ({
  useItemsStore: vi.fn(() => ({
    items: [],
    fetchItems: vi.fn(),
    getItemById: vi.fn((id: string) => {
      if (id === 'item-1') {
        return {
          id: 'item-1',
          name: 'Eye Drops A',
          type: 'medication',
          category: 'leftEye',
          dose: '1 drop',
          location: 'LEFT eye',
          conflict_group: 'eye_drops',
          active: true,
          schedules: [],
        }
      }
      return undefined
    }),
  })),
}))

// Mock Supabase client
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === 'daily_instances') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn(() => Promise.resolve({ data: [], error: null })),
              })),
            })),
          })),
          update: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ error: null })),
          })),
        }
      }
      if (table === 'users') {
        return {
          select: vi.fn(() => ({
            in: vi.fn(() => Promise.resolve({ data: [], error: null })),
          })),
        }
      }
      return {}
    }),
  },
}))

const createMockItem = (): Item => ({
  id: 'item-1',
  pet_id: null,
  type: 'medication',
  category: 'leftEye',
  name: 'Eye Drops A',
  dose: '1 drop',
  location: 'LEFT eye',
  notes: null,
  frequency: '2x_daily',
  active: true,
  start_date: null,
  end_date: null,
  conflict_group: 'eye_drops',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
})

const createMockInstance = (id: string): DailyInstanceWithItem => ({
  id,
  item_id: 'item-1',
  schedule_id: null,
  date: '2024-01-15',
  scheduled_time: '2024-01-15T08:00:00Z',
  status: 'confirmed',
  confirmed_at: '2024-01-15T08:30:00Z',
  confirmed_by: null,
  snooze_until: null,
  notes: null,
  is_adhoc: false,
  created_at: '2024-01-15T00:00:00Z',
  updated_at: '2024-01-15T00:00:00Z',
  item: createMockItem(),
})

const createMockHistoryEntry = (id: string, confirmedAt: Date): HistoryEntry => ({
  instance: createMockInstance(id),
  confirmedAt,
  confirmedByName: null,
})

describe('history store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-15T10:00:00Z'))
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('initial state', () => {
    it('starts with empty entries array', () => {
      const store = useHistoryStore()
      expect(store.entries).toEqual([])
      expect(store.isLoading).toBe(false)
      expect(store.error).toBeNull()
    })

    it('selectedDate defaults to today', () => {
      const store = useHistoryStore()
      expect(store.selectedDate).toBe('2024-01-15')
    })
  })

  describe('entriesByTime', () => {
    it('sorts entries by confirmed time descending', () => {
      const store = useHistoryStore()
      store.entries = [
        createMockHistoryEntry('inst-1', new Date('2024-01-15T08:00:00Z')),
        createMockHistoryEntry('inst-2', new Date('2024-01-15T10:00:00Z')),
        createMockHistoryEntry('inst-3', new Date('2024-01-15T09:00:00Z')),
      ]

      const sorted = store.entriesByTime
      expect(sorted[0]?.instance.id).toBe('inst-2') // Latest first
      expect(sorted[1]?.instance.id).toBe('inst-3')
      expect(sorted[2]?.instance.id).toBe('inst-1')
    })
  })

  describe('totalEntries', () => {
    it('returns count of entries', () => {
      const store = useHistoryStore()
      store.entries = [
        createMockHistoryEntry('inst-1', new Date()),
        createMockHistoryEntry('inst-2', new Date()),
      ]

      expect(store.totalEntries).toBe(2)
    })

    it('returns 0 for empty entries', () => {
      const store = useHistoryStore()
      expect(store.totalEntries).toBe(0)
    })
  })

  describe('$reset', () => {
    it('resets store to initial state', () => {
      const store = useHistoryStore()
      store.entries = [createMockHistoryEntry('inst-1', new Date())]
      store.selectedDate = '2024-01-01'
      store.isLoading = true
      store.error = 'test error'

      store.$reset()

      expect(store.entries).toEqual([])
      expect(store.selectedDate).toBe('2024-01-15') // Today
      expect(store.isLoading).toBe(false)
      expect(store.error).toBeNull()
    })
  })
})
