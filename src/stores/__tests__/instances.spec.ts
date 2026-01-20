import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useInstancesStore } from '../instances'

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
      if (id === 'item-2') {
        return {
          id: 'item-2',
          name: 'Eye Drops B',
          type: 'medication',
          category: 'rightEye',
          dose: '1 drop',
          location: 'RIGHT eye',
          conflict_group: 'eye_drops',
          active: true,
          schedules: [],
        }
      }
      return undefined
    }),
  })),
}))

// Mock auth store
vi.mock('../auth', () => ({
  useAuthStore: vi.fn(() => ({
    currentUser: { id: 'user-1', username: 'test', displayName: 'Test', role: 'admin' },
  })),
}))

// Mock Supabase client
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
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

const mockItem = {
  id: 'item-1',
  name: 'Eye Drops A',
  type: 'medication' as const,
  category: 'leftEye',
  dose: '1 drop',
  location: 'LEFT eye',
  conflict_group: 'eye_drops',
  active: true,
  pet_id: null,
  notes: null,
  frequency: '2x_daily',
  start_date: null,
  end_date: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

const createMockInstance = (overrides = {}) => ({
  id: 'instance-1',
  item_id: 'item-1',
  schedule_id: null,
  date: '2024-01-15',
  scheduled_time: '2024-01-15T08:00:00Z',
  status: 'pending' as const,
  confirmed_at: null,
  confirmed_by: null,
  snooze_until: null,
  notes: null,
  is_adhoc: false,
  created_at: '2024-01-15T00:00:00Z',
  updated_at: '2024-01-15T00:00:00Z',
  item: mockItem,
  ...overrides,
})

describe('instances store', () => {
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
    it('starts with empty instances array', () => {
      const store = useInstancesStore()
      expect(store.instances).toEqual([])
      expect(store.isLoading).toBe(false)
      expect(store.error).toBeNull()
    })

    it('selectedDate defaults to today', () => {
      const store = useInstancesStore()
      expect(store.selectedDate).toBe('2024-01-15')
    })
  })

  describe('instancesByStatus', () => {
    it('categorizes pending instances as due when scheduled time passed within 30 min', () => {
      const store = useInstancesStore()
      store.instances = [
        createMockInstance({
          id: 'inst-1',
          scheduled_time: '2024-01-15T09:45:00Z', // 15 minutes ago (within 30 min window)
          status: 'pending',
        }),
      ]

      expect(store.instancesByStatus.due).toHaveLength(1)
    })

    it('categorizes pending instances as overdue when > 30 min past', () => {
      const store = useInstancesStore()
      store.instances = [
        createMockInstance({
          id: 'inst-1',
          scheduled_time: '2024-01-15T09:00:00Z', // 1 hour ago
          status: 'pending',
        }),
      ]

      expect(store.instancesByStatus.overdue).toHaveLength(1)
    })

    it('categorizes pending instances as upcoming when in future', () => {
      const store = useInstancesStore()
      store.instances = [
        createMockInstance({
          id: 'inst-1',
          scheduled_time: '2024-01-15T12:00:00Z', // 2 hours from now
          status: 'pending',
        }),
      ]

      expect(store.instancesByStatus.upcoming).toHaveLength(1)
    })

    it('categorizes confirmed instances correctly', () => {
      const store = useInstancesStore()
      store.instances = [
        createMockInstance({
          id: 'inst-1',
          status: 'confirmed',
          confirmed_at: '2024-01-15T08:30:00Z',
        }),
      ]

      expect(store.instancesByStatus.confirmed).toHaveLength(1)
    })

    it('categorizes snoozed instances correctly', () => {
      const store = useInstancesStore()
      store.instances = [
        createMockInstance({
          id: 'inst-1',
          status: 'snoozed',
          snooze_until: '2024-01-15T11:00:00Z',
        }),
      ]

      expect(store.instancesByStatus.snoozed).toHaveLength(1)
    })

    it('moves expired snooze to due', () => {
      const store = useInstancesStore()
      store.instances = [
        createMockInstance({
          id: 'inst-1',
          status: 'snoozed',
          snooze_until: '2024-01-15T09:00:00Z', // Already expired
        }),
      ]

      expect(store.instancesByStatus.due).toHaveLength(1)
      expect(store.instancesByStatus.snoozed).toHaveLength(0)
    })

    it('categorizes expired status correctly', () => {
      const store = useInstancesStore()
      store.instances = [
        createMockInstance({
          id: 'inst-1',
          status: 'expired',
        }),
      ]

      expect(store.instancesByStatus.overdue).toHaveLength(1)
    })
  })

  describe('pendingCount', () => {
    it('counts overdue, due, and snoozed instances', () => {
      const store = useInstancesStore()
      store.instances = [
        createMockInstance({ id: 'inst-1', scheduled_time: '2024-01-15T09:00:00Z', status: 'pending' }),
        createMockInstance({ id: 'inst-2', scheduled_time: '2024-01-15T12:00:00Z', status: 'pending' }),
        createMockInstance({ id: 'inst-3', status: 'confirmed' }),
      ]

      // inst-1 is overdue (> 30 min past), inst-2 is upcoming
      expect(store.pendingCount).toBe(1) // Only overdue counts
    })
  })

  describe('confirmedCount', () => {
    it('counts only confirmed instances', () => {
      const store = useInstancesStore()
      store.instances = [
        createMockInstance({ id: 'inst-1', status: 'pending' }),
        createMockInstance({ id: 'inst-2', status: 'confirmed', confirmed_at: '2024-01-15T08:00:00Z' }),
        createMockInstance({ id: 'inst-3', status: 'confirmed', confirmed_at: '2024-01-15T09:00:00Z' }),
      ]

      expect(store.confirmedCount).toBe(2)
    })
  })

  describe('checkConflict', () => {
    it('returns no conflict for items without conflict group', () => {
      const store = useInstancesStore()
      const instanceWithoutGroup = createMockInstance({
        item: { ...mockItem, conflict_group: null },
      })

      const result = store.checkConflict(instanceWithoutGroup)
      expect(result.hasConflict).toBe(false)
    })

    it('returns no conflict when no recent confirmations in group', () => {
      const store = useInstancesStore()
      store.instances = [createMockInstance()]

      const result = store.checkConflict(store.instances[0]!)
      expect(result.hasConflict).toBe(false)
    })

    it('returns conflict when item in same group confirmed recently', () => {
      const store = useInstancesStore()
      const confirmedInstance = createMockInstance({
        id: 'inst-confirmed',
        item_id: 'item-2',
        status: 'confirmed',
        confirmed_at: new Date().toISOString(), // Just now
        item: {
          ...mockItem,
          id: 'item-2',
          name: 'Eye Drops B',
        },
      })

      const pendingInstance = createMockInstance({
        id: 'inst-pending',
        status: 'pending',
      })

      store.instances = [confirmedInstance, pendingInstance]

      const result = store.checkConflict(pendingInstance)
      expect(result.hasConflict).toBe(true)
      expect(result.conflictingItemName).toBe('Eye Drops B')
      expect(result.remainingSeconds).toBeGreaterThan(0)
    })
  })

  describe('$reset', () => {
    it('resets store to initial state', () => {
      const store = useInstancesStore()
      store.instances = [createMockInstance()]
      store.isLoading = true
      store.error = 'test error'

      store.$reset()

      expect(store.instances).toEqual([])
      expect(store.isLoading).toBe(false)
      expect(store.error).toBeNull()
    })
  })
})
