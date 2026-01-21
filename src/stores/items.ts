import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type { Item, ItemSchedule, ItemWithSchedules, ItemCategory, ItemType } from '@/types'
import type { Database } from '@/types/database'

type ItemInsert = Database['public']['Tables']['items']['Insert']
type ItemUpdate = Database['public']['Tables']['items']['Update']

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

export const useItemsStore = defineStore('items', () => {
  // State
  const items = ref<ItemWithSchedules[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const lastFetched = ref<Date | null>(null)

  // Getters
  const activeItems = computed(() => items.value.filter((item) => item.active))

  const itemsByCategory = computed(() => {
    const grouped: Record<ItemCategory, ItemWithSchedules[]> = {
      leftEye: [],
      rightEye: [],
      oral: [],
      food: [],
    }

    for (const item of activeItems.value) {
      const category = item.category as ItemCategory
      if (category && grouped[category]) {
        grouped[category].push(item)
      }
    }

    return grouped
  })

  const itemsByType = computed(() => {
    const grouped: Record<ItemType, ItemWithSchedules[]> = {
      medication: [],
      food: [],
      supplement: [],
    }

    for (const item of activeItems.value) {
      grouped[item.type].push(item)
    }

    return grouped
  })

  const medications = computed(() => itemsByType.value.medication)
  const foodItems = computed(() => [...itemsByType.value.food, ...itemsByType.value.supplement])

  const leftEyeMeds = computed(() => itemsByCategory.value.leftEye)
  const rightEyeMeds = computed(() => itemsByCategory.value.rightEye)
  const oralMeds = computed(() => itemsByCategory.value.oral)

  // Actions
  async function fetchItems(): Promise<void> {
    isLoading.value = true
    error.value = null

    try {
      // Fetch all items with schedules from REST API
      const response = await fetch(`${API_BASE}/items`)
      if (!response.ok) throw new Error('Failed to fetch items')

      const itemsData = (await response.json()) as ItemWithSchedules[]
      items.value = itemsData
      lastFetched.value = new Date()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch items'
      console.error('Error fetching items:', e)
    } finally {
      isLoading.value = false
    }
  }

  function getItemById(id: string): ItemWithSchedules | undefined {
    return items.value.find((item) => item.id === id)
  }

  function getItemsByConflictGroup(group: string): ItemWithSchedules[] {
    return activeItems.value.filter((item) => item.conflict_group === group)
  }

  async function createItem(
    item: ItemInsert,
    schedules?: Array<{ time_slot: string; scheduled_time: string }>,
  ): Promise<ItemWithSchedules | null> {
    try {
      const response = await fetch(`${API_BASE}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...item, schedules }),
      })

      if (!response.ok) throw new Error('Failed to create item')

      const newItem = (await response.json()) as ItemWithSchedules

      // Refetch to get the complete item with schedules
      await fetchItems()

      return items.value.find((i) => i.id === newItem.id) || null
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to create item'
      console.error('Error creating item:', e)
      return null
    }
  }

  async function updateItem(id: string, updates: ItemUpdate): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE}/items/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })

      if (!response.ok) throw new Error('Failed to update item')

      // Update local state
      const index = items.value.findIndex((item) => item.id === id)
      if (index !== -1) {
        items.value[index] = { ...items.value[index], ...updates } as ItemWithSchedules
      }

      return true
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to update item'
      console.error('Error updating item:', e)
      return false
    }
  }

  async function deactivateItem(id: string): Promise<boolean> {
    return updateItem(id, { active: false })
  }

  async function reactivateItem(id: string): Promise<boolean> {
    return updateItem(id, { active: true })
  }

  // Clear store state
  function $reset() {
    items.value = []
    isLoading.value = false
    error.value = null
    lastFetched.value = null
  }

  return {
    // State
    items,
    isLoading,
    error,
    lastFetched,

    // Getters
    activeItems,
    itemsByCategory,
    itemsByType,
    medications,
    foodItems,
    leftEyeMeds,
    rightEyeMeds,
    oralMeds,

    // Actions
    fetchItems,
    getItemById,
    getItemsByConflictGroup,
    createItem,
    updateItem,
    deactivateItem,
    reactivateItem,
    $reset,
  }
})
