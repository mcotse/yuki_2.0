import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useItemsStore } from '../items'
import type { ItemWithSchedules } from '@/types'

// Mock Supabase client
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => Promise.resolve({ data: [], error: null })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null })),
      })),
    })),
  },
}))

const mockItems: ItemWithSchedules[] = [
  {
    id: 'item-1',
    pet_id: 'pet-1',
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
    schedules: [],
  },
  {
    id: 'item-2',
    pet_id: 'pet-1',
    type: 'medication',
    category: 'rightEye',
    name: 'Eye Drops B',
    dose: '1 drop',
    location: 'RIGHT eye',
    notes: null,
    frequency: '2x_daily',
    active: true,
    start_date: null,
    end_date: null,
    conflict_group: 'eye_drops',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    schedules: [],
  },
  {
    id: 'item-3',
    pet_id: 'pet-1',
    type: 'medication',
    category: 'oral',
    name: 'Oral Med',
    dose: '1 tablet',
    location: 'ORAL',
    notes: null,
    frequency: '1x_daily',
    active: false,
    start_date: null,
    end_date: null,
    conflict_group: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    schedules: [],
  },
]

describe('items store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  describe('initial state', () => {
    it('starts with empty items array', () => {
      const store = useItemsStore()
      expect(store.items).toEqual([])
      expect(store.isLoading).toBe(false)
      expect(store.error).toBeNull()
    })
  })

  describe('getters', () => {
    it('activeItems filters out inactive items', async () => {
      const store = useItemsStore()
      store.items = mockItems

      expect(store.activeItems).toHaveLength(2)
      expect(store.activeItems.every((i) => i.active)).toBe(true)
    })

    it('itemsByCategory groups items by category', () => {
      const store = useItemsStore()
      store.items = mockItems

      expect(store.itemsByCategory.leftEye).toHaveLength(1)
      expect(store.itemsByCategory.rightEye).toHaveLength(1)
      expect(store.itemsByCategory.oral).toHaveLength(0) // inactive
    })

    it('itemsByType groups items by type', () => {
      const store = useItemsStore()
      store.items = mockItems

      expect(store.itemsByType.medication).toHaveLength(2)
      expect(store.itemsByType.food).toHaveLength(0)
      expect(store.itemsByType.supplement).toHaveLength(0)
    })

    it('medications returns only medication type', () => {
      const store = useItemsStore()
      store.items = mockItems

      expect(store.medications).toHaveLength(2)
    })

    it('leftEyeMeds returns leftEye category items', () => {
      const store = useItemsStore()
      store.items = mockItems

      expect(store.leftEyeMeds).toHaveLength(1)
      expect(store.leftEyeMeds[0]?.name).toBe('Eye Drops A')
    })

    it('rightEyeMeds returns rightEye category items', () => {
      const store = useItemsStore()
      store.items = mockItems

      expect(store.rightEyeMeds).toHaveLength(1)
      expect(store.rightEyeMeds[0]?.name).toBe('Eye Drops B')
    })
  })

  describe('getItemById', () => {
    it('returns item by id', () => {
      const store = useItemsStore()
      store.items = mockItems

      const item = store.getItemById('item-1')
      expect(item?.name).toBe('Eye Drops A')
    })

    it('returns undefined for non-existent id', () => {
      const store = useItemsStore()
      store.items = mockItems

      const item = store.getItemById('non-existent')
      expect(item).toBeUndefined()
    })
  })

  describe('getItemsByConflictGroup', () => {
    it('returns items in same conflict group', () => {
      const store = useItemsStore()
      store.items = mockItems

      const conflictItems = store.getItemsByConflictGroup('eye_drops')
      expect(conflictItems).toHaveLength(2)
    })

    it('returns empty array for non-existent group', () => {
      const store = useItemsStore()
      store.items = mockItems

      const conflictItems = store.getItemsByConflictGroup('non_existent')
      expect(conflictItems).toHaveLength(0)
    })
  })

  describe('$reset', () => {
    it('resets store to initial state', () => {
      const store = useItemsStore()
      store.items = mockItems
      store.isLoading = true
      store.error = 'test error'

      store.$reset()

      expect(store.items).toEqual([])
      expect(store.isLoading).toBe(false)
      expect(store.error).toBeNull()
    })
  })

  describe('deactivateItem', () => {
    it('sets item active to false', async () => {
      const store = useItemsStore()
      store.items = [...mockItems]

      // Mock fetch
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      })

      const result = await store.deactivateItem('item-1')

      expect(result).toBe(true)
      expect(store.items.find(i => i.id === 'item-1')?.active).toBe(false)
    })
  })

  describe('reactivateItem', () => {
    it('sets item active to true', async () => {
      const store = useItemsStore()
      store.items = [...mockItems]

      // Mock fetch
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      })

      const result = await store.reactivateItem('item-3')

      expect(result).toBe(true)
      expect(store.items.find(i => i.id === 'item-3')?.active).toBe(true)
    })
  })

  describe('updateItem', () => {
    it('updates item properties', async () => {
      const store = useItemsStore()
      store.items = [...mockItems]

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      })

      const result = await store.updateItem('item-1', {
        name: 'Updated Name',
        dose: '2 drops',
      })

      expect(result).toBe(true)
      const updatedItem = store.items.find(i => i.id === 'item-1')
      expect(updatedItem?.name).toBe('Updated Name')
      expect(updatedItem?.dose).toBe('2 drops')
    })

    it('returns false on API error', async () => {
      const store = useItemsStore()
      store.items = [...mockItems]

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
      })

      const result = await store.updateItem('item-1', { name: 'Test' })

      expect(result).toBe(false)
      expect(store.error).toBe('Failed to update item')
    })
  })

  describe('fetchItems', () => {
    it('fetches items from API and updates store', async () => {
      const store = useItemsStore()

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockItems),
      })

      await store.fetchItems()

      expect(store.items).toEqual(mockItems)
      expect(store.isLoading).toBe(false)
      expect(store.lastFetched).not.toBeNull()
    })

    it('sets error on API failure', async () => {
      const store = useItemsStore()

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
      })

      await store.fetchItems()

      expect(store.error).toBe('Failed to fetch items')
      expect(store.isLoading).toBe(false)
    })
  })
})
