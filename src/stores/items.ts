import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import {
  collection,
  getDocs,
  doc,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  type DocumentData,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Item, ItemSchedule, ItemWithSchedules, ItemCategory, ItemType, ItemInput } from '@/types'
import { COLLECTIONS } from '@/types/database'

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

  // Helper to convert Firestore doc to ItemWithSchedules
  function docToItem(docData: DocumentData, id: string): ItemWithSchedules {
    return {
      id,
      pet_id: docData.pet_id || null,
      type: docData.type || 'medication',
      category: docData.category || null,
      name: docData.name || '',
      dose: docData.dose || null,
      location: docData.location || null,
      notes: docData.notes || null,
      frequency: docData.frequency || '1x_daily',
      active: docData.active !== false,
      start_date: docData.start_date || null,
      end_date: docData.end_date || null,
      conflict_group: docData.conflict_group || null,
      created_at: docData.created_at?.toDate?.()?.toISOString() || new Date().toISOString(),
      updated_at: docData.updated_at?.toDate?.()?.toISOString() || new Date().toISOString(),
      schedules: (docData.schedules || []).map((s: DocumentData, idx: number) => ({
        id: s.id || `${id}-schedule-${idx}`,
        item_id: id,
        time_slot: s.time_slot || '',
        scheduled_time: s.scheduled_time || '',
        created_at: s.created_at?.toDate?.()?.toISOString() || new Date().toISOString(),
      })) as ItemSchedule[],
    }
  }

  // Actions
  async function fetchItems(): Promise<void> {
    if (!db) {
      error.value = 'Firebase not configured'
      return
    }

    isLoading.value = true
    error.value = null

    try {
      const itemsRef = collection(db, COLLECTIONS.ITEMS)
      const q = query(itemsRef, orderBy('name'))
      const snapshot = await getDocs(q)

      items.value = snapshot.docs.map((doc) => docToItem(doc.data(), doc.id))
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
    itemData: Partial<ItemInput>,
    schedules?: Array<{ time_slot: string; scheduled_time: string }>,
  ): Promise<ItemWithSchedules | null> {
    if (!db) {
      error.value = 'Firebase not configured'
      return null
    }

    try {
      const itemsRef = collection(db, COLLECTIONS.ITEMS)

      const newItemData = {
        pet_id: itemData.pet_id || null,
        type: itemData.type || 'medication',
        category: itemData.category || null,
        name: itemData.name || '',
        dose: itemData.dose || null,
        location: itemData.location || null,
        notes: itemData.notes || null,
        frequency: itemData.frequency || '1x_daily',
        active: itemData.active !== false,
        start_date: itemData.start_date || null,
        end_date: itemData.end_date || null,
        conflict_group: itemData.conflict_group || null,
        schedules: schedules || [],
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      }

      const docRef = await addDoc(itemsRef, newItemData)

      // Create local item with ID
      const newItem: ItemWithSchedules = {
        id: docRef.id,
        ...newItemData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        schedules: (schedules || []).map((s, idx) => ({
          id: `${docRef.id}-schedule-${idx}`,
          item_id: docRef.id,
          time_slot: s.time_slot,
          scheduled_time: s.scheduled_time,
          created_at: new Date().toISOString(),
        })),
      }

      items.value.push(newItem)
      return newItem
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to create item'
      console.error('Error creating item:', e)
      return null
    }
  }

  async function updateItem(id: string, updates: Partial<Item>): Promise<boolean> {
    if (!db) {
      error.value = 'Firebase not configured'
      return false
    }

    try {
      const itemRef = doc(db, COLLECTIONS.ITEMS, id)
      await updateDoc(itemRef, {
        ...updates,
        updated_at: serverTimestamp(),
      })

      // Update local state
      const index = items.value.findIndex((item) => item.id === id)
      const existingItem = items.value[index]
      if (index !== -1 && existingItem) {
        items.value[index] = {
          ...existingItem,
          ...updates,
          id: existingItem.id, // Preserve required fields
          schedules: existingItem.schedules,
          updated_at: new Date().toISOString(),
        }
      }

      return true
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to update item'
      console.error('Error updating item:', e)
      return false
    }
  }

  async function updateItemSchedules(
    id: string,
    schedules: Array<{ time_slot: string; scheduled_time: string }>,
  ): Promise<boolean> {
    if (!db) {
      error.value = 'Firebase not configured'
      return false
    }

    try {
      const itemRef = doc(db, COLLECTIONS.ITEMS, id)
      await updateDoc(itemRef, {
        schedules,
        updated_at: serverTimestamp(),
      })

      // Update local state
      const index = items.value.findIndex((item) => item.id === id)
      const existingItem = items.value[index]
      if (index !== -1 && existingItem) {
        items.value[index] = {
          ...existingItem,
          schedules: schedules.map((s, idx): ItemSchedule => ({
            id: `${id}-schedule-${idx}`,
            item_id: id,
            time_slot: s.time_slot,
            scheduled_time: s.scheduled_time,
            created_at: new Date().toISOString(),
          })),
          updated_at: new Date().toISOString(),
        }
      }

      return true
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to update schedules'
      console.error('Error updating schedules:', e)
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
    updateItemSchedules,
    deactivateItem,
    reactivateItem,
    $reset,
  }
})
