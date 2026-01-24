import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

// Mock the instances store
const mockInstancesStore = {
  instancesByStatus: {
    overdue: [] as Array<{ id: string }>,
    due: [] as Array<{ id: string }>,
    upcoming: [] as Array<{ id: string }>,
    snoozed: [] as Array<{ id: string }>,
    confirmed: [] as Array<{ id: string }>,
  },
}

vi.mock('@/stores/instances', () => ({
  useInstancesStore: vi.fn(() => mockInstancesStore),
}))

// Mock navigator.setAppBadge
const mockSetAppBadge = vi.fn().mockResolvedValue(undefined)
const mockClearAppBadge = vi.fn().mockResolvedValue(undefined)

describe('useBadge composable', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()

    // Reset mock store
    mockInstancesStore.instancesByStatus = {
      overdue: [],
      due: [],
      upcoming: [],
      snoozed: [],
      confirmed: [],
    }

    // Mock Badge API
    Object.defineProperty(navigator, 'setAppBadge', {
      value: mockSetAppBadge,
      writable: true,
      configurable: true,
    })
    Object.defineProperty(navigator, 'clearAppBadge', {
      value: mockClearAppBadge,
      writable: true,
      configurable: true,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('badge count calculation', () => {
    it('counts due + overdue items only', async () => {
      const { useBadge } = await import('../useBadge')
      const { updateFromStore, lastCount } = useBadge()

      mockInstancesStore.instancesByStatus.overdue = [{ id: '1' }, { id: '2' }]
      mockInstancesStore.instancesByStatus.due = [{ id: '3' }]
      mockInstancesStore.instancesByStatus.upcoming = [{ id: '4' }, { id: '5' }]
      mockInstancesStore.instancesByStatus.snoozed = [{ id: '6' }]
      mockInstancesStore.instancesByStatus.confirmed = [{ id: '7' }]

      await updateFromStore()

      // Should only count overdue (2) + due (1) = 3
      expect(lastCount.value).toBe(3)
    })

    it('excludes upcoming (future) items', async () => {
      const { useBadge } = await import('../useBadge')
      const { updateFromStore, lastCount } = useBadge()

      mockInstancesStore.instancesByStatus.overdue = []
      mockInstancesStore.instancesByStatus.due = []
      mockInstancesStore.instancesByStatus.upcoming = [{ id: '1' }, { id: '2' }, { id: '3' }]

      await updateFromStore()

      expect(lastCount.value).toBe(0)
    })

    it('excludes snoozed items', async () => {
      const { useBadge } = await import('../useBadge')
      const { updateFromStore, lastCount } = useBadge()

      mockInstancesStore.instancesByStatus.overdue = [{ id: '1' }]
      mockInstancesStore.instancesByStatus.due = []
      mockInstancesStore.instancesByStatus.snoozed = [{ id: '2' }, { id: '3' }]

      await updateFromStore()

      // Should only count overdue (1), not snoozed (2)
      expect(lastCount.value).toBe(1)
    })

    it('excludes confirmed items', async () => {
      const { useBadge } = await import('../useBadge')
      const { updateFromStore, lastCount } = useBadge()

      mockInstancesStore.instancesByStatus.overdue = []
      mockInstancesStore.instancesByStatus.due = [{ id: '1' }]
      mockInstancesStore.instancesByStatus.confirmed = [{ id: '2' }, { id: '3' }, { id: '4' }]

      await updateFromStore()

      expect(lastCount.value).toBe(1)
    })

    it('returns zero when no due or overdue items', async () => {
      const { useBadge } = await import('../useBadge')
      const { updateFromStore, lastCount } = useBadge()

      mockInstancesStore.instancesByStatus.overdue = []
      mockInstancesStore.instancesByStatus.due = []
      mockInstancesStore.instancesByStatus.upcoming = [{ id: '1' }]

      await updateFromStore()

      expect(lastCount.value).toBe(0)
    })

    it('handles empty store state', async () => {
      const { useBadge } = await import('../useBadge')
      const { updateFromStore, lastCount } = useBadge()

      await updateFromStore()

      expect(lastCount.value).toBe(0)
    })
  })

  describe('Badge API integration', () => {
    it('calls setAppBadge with count when count > 0', async () => {
      const { useBadge } = await import('../useBadge')
      const { setBadge } = useBadge()

      await setBadge(5)

      expect(mockSetAppBadge).toHaveBeenCalledWith(5)
    })

    it('calls clearAppBadge when count is 0', async () => {
      const { useBadge } = await import('../useBadge')
      const { setBadge } = useBadge()

      await setBadge(0)

      expect(mockClearAppBadge).toHaveBeenCalled()
    })

    it('clearBadge calls setBadge with 0', async () => {
      const { useBadge } = await import('../useBadge')
      const { clearBadge } = useBadge()

      await clearBadge()

      expect(mockClearAppBadge).toHaveBeenCalled()
    })
  })

  describe('edge cases', () => {
    it('handles large counts correctly', async () => {
      const { useBadge } = await import('../useBadge')
      const { updateFromStore, lastCount } = useBadge()

      // Create 100 overdue and 100 due items
      mockInstancesStore.instancesByStatus.overdue = Array(100).fill(null).map((_, i) => ({ id: `o-${i}` }))
      mockInstancesStore.instancesByStatus.due = Array(100).fill(null).map((_, i) => ({ id: `d-${i}` }))

      await updateFromStore()

      expect(lastCount.value).toBe(200)
    })

    it('updates count when items move between categories', async () => {
      const { useBadge } = await import('../useBadge')
      const { updateFromStore, lastCount } = useBadge()

      // Initial state: 2 overdue
      mockInstancesStore.instancesByStatus.overdue = [{ id: '1' }, { id: '2' }]
      mockInstancesStore.instancesByStatus.due = []
      await updateFromStore()
      expect(lastCount.value).toBe(2)

      // Move one to confirmed
      mockInstancesStore.instancesByStatus.overdue = [{ id: '1' }]
      mockInstancesStore.instancesByStatus.confirmed = [{ id: '2' }]
      await updateFromStore()
      expect(lastCount.value).toBe(1)

      // Move one to snoozed
      mockInstancesStore.instancesByStatus.overdue = []
      mockInstancesStore.instancesByStatus.snoozed = [{ id: '1' }]
      await updateFromStore()
      expect(lastCount.value).toBe(0)
    })
  })
})
