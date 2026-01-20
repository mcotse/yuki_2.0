import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { supabase } from '@/lib/supabase'
import type { Item, ItemSchedule, ItemWithSchedules, ItemCategory, ItemType } from '@/types'
import type { Database } from '@/types/database'

type ItemInsert = Database['public']['Tables']['items']['Insert']
type ItemUpdate = Database['public']['Tables']['items']['Update']

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
      // Fetch all items
      const { data: itemsData, error: itemsError } = await supabase
        .from('items')
        .select('*')
        .order('name')

      if (itemsError) throw itemsError

      // Fetch all schedules
      const { data: schedulesData, error: schedulesError } = await supabase
        .from('item_schedules')
        .select('*')

      if (schedulesError) throw schedulesError

      // Cast to proper types (workaround for Supabase type inference issues)
      const itemRows = (itemsData ?? []) as unknown as Item[]
      const scheduleRows = (schedulesData ?? []) as unknown as ItemSchedule[]

      // Group schedules by item_id
      const schedulesByItem = new Map<string, ItemSchedule[]>()
      for (const schedule of scheduleRows) {
        const existing = schedulesByItem.get(schedule.item_id) ?? []
        existing.push(schedule)
        schedulesByItem.set(schedule.item_id, existing)
      }

      // Combine items with their schedules
      items.value = itemRows.map((item) => ({
        ...item,
        schedules: schedulesByItem.get(item.id) ?? [],
      }))

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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: newItem, error: createError } = await (supabase as any)
        .from('items')
        .insert(item)
        .select()
        .single()

      if (createError) throw createError
      if (!newItem) throw new Error('No data returned from insert')

      let itemSchedules: ItemSchedule[] = []

      // Create schedules if provided
      if (schedules && schedules.length > 0) {
        const schedulesToInsert = schedules.map((s) => ({
          item_id: newItem.id,
          time_slot: s.time_slot,
          scheduled_time: s.scheduled_time,
        }))

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: scheduleData, error: scheduleError } = await (supabase as any)
          .from('item_schedules')
          .insert(schedulesToInsert)
          .select()

        if (scheduleError) throw scheduleError
        itemSchedules = scheduleData ?? []
      }

      const fullItem: ItemWithSchedules = {
        ...newItem,
        schedules: itemSchedules,
      }

      items.value.push(fullItem)
      return fullItem
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to create item'
      console.error('Error creating item:', e)
      return null
    }
  }

  async function updateItem(id: string, updates: ItemUpdate): Promise<boolean> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: updateError } = await (supabase as any)
        .from('items')
        .update(updates)
        .eq('id', id)

      if (updateError) throw updateError

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
