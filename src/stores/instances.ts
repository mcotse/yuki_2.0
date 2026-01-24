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
import { useItemsStore } from './items'
import { useAuthStore } from './auth'
import { notificationService } from '@/services/notificationService'
import type {
  DailyInstance,
  DailyInstanceWithItem,
  InstancesByStatus,
  SnoozeInterval,
  ConflictCheck,
  Item,
} from '@/types'
import { COLLECTIONS } from '@/types/database'

// Conflict spacing in minutes (from spec)
const CONFLICT_SPACING_MINUTES = 5

export const useInstancesStore = defineStore('instances', () => {
  // State
  const instances = ref<DailyInstanceWithItem[]>([])
  const selectedDate = ref<string>(formatDate(new Date()))
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const lastFetched = ref<Date | null>(null)

  // Stores
  const itemsStore = useItemsStore()
  const authStore = useAuthStore()

  // Helper to convert Firestore doc to DailyInstance
  function docToInstance(docData: DocumentData, id: string): DailyInstance {
    return {
      id,
      item_id: docData.item_id || '',
      schedule_id: docData.schedule_id || null,
      date: docData.date || '',
      scheduled_time: docData.scheduled_time || '',
      status: docData.status || 'pending',
      confirmed_at: docData.confirmed_at || null,
      confirmed_by: docData.confirmed_by || null,
      snooze_until: docData.snooze_until || null,
      notes: docData.notes || null,
      is_adhoc: docData.is_adhoc || false,
      created_at: docData.created_at?.toDate?.()?.toISOString() || new Date().toISOString(),
      updated_at: docData.updated_at?.toDate?.()?.toISOString() || new Date().toISOString(),
    }
  }

  // Getters
  const instancesByStatus = computed<InstancesByStatus>(() => {
    const now = new Date()
    const result: InstancesByStatus = {
      overdue: [],
      due: [],
      upcoming: [],
      snoozed: [],
      confirmed: [],
    }

    for (const instance of instances.value) {
      if (instance.status === 'confirmed') {
        result.confirmed.push(instance)
        continue
      }

      if (instance.status === 'snoozed') {
        // Check if snooze has expired
        if (instance.snooze_until && new Date(instance.snooze_until) <= now) {
          result.due.push(instance)
        } else {
          result.snoozed.push(instance)
        }
        continue
      }

      if (instance.status === 'expired') {
        result.overdue.push(instance)
        continue
      }

      // Pending - check if due or upcoming
      const scheduledTime = new Date(instance.scheduled_time)
      const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000)

      if (scheduledTime < thirtyMinutesAgo) {
        result.overdue.push(instance)
      } else if (scheduledTime <= now) {
        result.due.push(instance)
      } else {
        result.upcoming.push(instance)
      }
    }

    // Sort each category by scheduled time
    const sortByTime = (a: DailyInstanceWithItem, b: DailyInstanceWithItem) =>
      new Date(a.scheduled_time).getTime() - new Date(b.scheduled_time).getTime()

    result.overdue.sort(sortByTime)
    result.due.sort(sortByTime)
    result.upcoming.sort(sortByTime)
    result.snoozed.sort(sortByTime)
    result.confirmed.sort(sortByTime)

    return result
  })

  const pendingCount = computed(
    () =>
      instancesByStatus.value.overdue.length +
      instancesByStatus.value.due.length +
      instancesByStatus.value.snoozed.length,
  )

  const confirmedCount = computed(() => instancesByStatus.value.confirmed.length)

  // Actions
  async function fetchInstancesForDate(date: string): Promise<void> {
    if (!db) {
      error.value = 'Firebase not configured'
      return
    }

    isLoading.value = true
    error.value = null
    selectedDate.value = date

    try {
      // Always fetch items fresh to ensure we have the latest data
      await itemsStore.fetchItems()

      // Fetch instances for the date from Firestore
      const instancesRef = collection(db, COLLECTIONS.DAILY_INSTANCES)
      const q = query(
        instancesRef,
        where('date', '==', date),
        orderBy('scheduled_time'),
      )
      const snapshot = await getDocs(q)

      const instanceRows = snapshot.docs.map((doc) => docToInstance(doc.data(), doc.id))

      // Join with items, creating display-friendly items for quick logs
      const joined: DailyInstanceWithItem[] = []
      for (const instance of instanceRows) {
        const item = itemsStore.getItemById(instance.item_id)
        if (item) {
          // Check if this is a quick log entry (has [category] in notes)
          if (instance.is_adhoc && instance.notes?.startsWith('[')) {
            const displayItem = createQuickLogDisplayItem(instance.notes, item)
            joined.push({ ...instance, item: displayItem })
          } else {
            joined.push({ ...instance, item })
          }
        }
      }
      instances.value = joined

      // Schedule notifications for pending instances
      notificationService.scheduleAllNotifications(joined)

      lastFetched.value = new Date()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch instances'
      console.error('Error fetching instances:', e)
    } finally {
      isLoading.value = false
    }
  }

  async function refreshInstances(): Promise<void> {
    await fetchInstancesForDate(selectedDate.value)
  }

  function checkConflict(instance: DailyInstanceWithItem): ConflictCheck {
    const conflictGroup = instance.item.conflict_group
    if (!conflictGroup) {
      return { hasConflict: false, canOverride: true }
    }

    const now = new Date()
    const conflictThreshold = CONFLICT_SPACING_MINUTES * 60 * 1000

    // Find recently confirmed items in the same conflict group
    const recentConfirmed = instances.value.filter((i) => {
      if (i.id === instance.id) return false
      if (i.item.conflict_group !== conflictGroup) return false
      if (i.status !== 'confirmed' || !i.confirmed_at) return false

      const confirmedTime = new Date(i.confirmed_at)
      const timeSince = now.getTime() - confirmedTime.getTime()
      return timeSince < conflictThreshold
    })

    if (recentConfirmed.length === 0) {
      return { hasConflict: false, canOverride: true }
    }

    // Find the most recent confirmation
    const mostRecent = recentConfirmed.reduce((latest, i) => {
      const iTime = new Date(i.confirmed_at!).getTime()
      const latestTime = new Date(latest.confirmed_at!).getTime()
      return iTime > latestTime ? i : latest
    })

    const confirmedTime = new Date(mostRecent.confirmed_at!)
    const timeSince = now.getTime() - confirmedTime.getTime()

    // Guard against invalid dates (NaN)
    if (isNaN(timeSince)) {
      return { hasConflict: false, canOverride: true }
    }

    const remainingMs = Math.max(0, conflictThreshold - timeSince)
    const remainingMinutes = Math.ceil(remainingMs / 60000)

    // Only show conflict if there's actually time remaining
    if (remainingMinutes <= 0) {
      return { hasConflict: false, canOverride: true }
    }

    return {
      hasConflict: true,
      conflictingItemName: mostRecent.item.name,
      remainingMinutes: Math.max(1, Math.min(remainingMinutes, CONFLICT_SPACING_MINUTES)),
      canOverride: true, // Always allow override as per spec
    }
  }

  async function confirmInstance(
    instanceId: string,
    notes?: string,
    overrideConflict = false,
  ): Promise<boolean> {
    if (!db) {
      error.value = 'Firebase not configured'
      return false
    }

    const instance = instances.value.find((i) => i.id === instanceId)
    if (!instance) {
      error.value = 'Instance not found'
      return false
    }

    // Check conflict unless overriding
    if (!overrideConflict) {
      const conflict = checkConflict(instance)
      if (conflict.hasConflict) {
        error.value = `Wait ${conflict.remainingMinutes} min - ${conflict.conflictingItemName} was just given`
        return false
      }
    }

    try {
      const now = new Date().toISOString()
      const userId = authStore.currentUser?.id ?? null

      const instanceRef = doc(db, COLLECTIONS.DAILY_INSTANCES, instanceId)
      await updateDoc(instanceRef, {
        status: 'confirmed',
        confirmed_at: now,
        confirmed_by: userId,
        notes: notes ?? null,
        updated_at: serverTimestamp(),
      })

      // Cancel any scheduled notification for this instance
      notificationService.cancelNotification(instanceId)

      // Update local state
      const index = instances.value.findIndex((i) => i.id === instanceId)
      if (index !== -1) {
        const existing = instances.value[index]!
        instances.value[index] = {
          ...existing,
          status: 'confirmed',
          confirmed_at: now,
          confirmed_by: userId,
          notes: notes ?? null,
        }
      }

      return true
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to confirm'
      console.error('Error confirming instance:', e)
      return false
    }
  }

  async function snoozeInstance(instanceId: string, minutes: SnoozeInterval): Promise<boolean> {
    if (!db) {
      error.value = 'Firebase not configured'
      return false
    }

    try {
      const snoozeUntil = new Date(Date.now() + minutes * 60 * 1000).toISOString()

      const instanceRef = doc(db, COLLECTIONS.DAILY_INSTANCES, instanceId)
      await updateDoc(instanceRef, {
        status: 'snoozed',
        snooze_until: snoozeUntil,
        updated_at: serverTimestamp(),
      })

      // Update local state
      const index = instances.value.findIndex((i) => i.id === instanceId)
      if (index !== -1) {
        const existing = instances.value[index]!
        const snoozedInstance = {
          ...existing,
          scheduled_time: snoozeUntil, // Use snooze time for notification
          status: 'snoozed' as const,
          snooze_until: snoozeUntil,
        }
        instances.value[index] = snoozedInstance

        // Reschedule notification to the snooze time
        notificationService.scheduleNotification(snoozedInstance)
      }

      return true
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to snooze'
      console.error('Error snoozing instance:', e)
      return false
    }
  }

  async function undoConfirmation(instanceId: string): Promise<boolean> {
    if (!db) {
      error.value = 'Firebase not configured'
      return false
    }

    const instance = instances.value.find((i) => i.id === instanceId)
    if (!instance) {
      error.value = 'Instance not found'
      return false
    }

    if (instance.status !== 'confirmed') {
      error.value = 'Instance is not confirmed'
      return false
    }

    try {
      const now = new Date()
      const undoNote = `[Undone at ${now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}]`
      const existingNotes = instance.notes ? `${instance.notes} ` : ''

      const instanceRef = doc(db, COLLECTIONS.DAILY_INSTANCES, instanceId)
      await updateDoc(instanceRef, {
        status: 'pending',
        confirmed_at: null,
        confirmed_by: null,
        notes: existingNotes + undoNote,
        updated_at: serverTimestamp(),
      })

      // Update local state
      const index = instances.value.findIndex((i) => i.id === instanceId)
      if (index !== -1) {
        const existing = instances.value[index]!
        instances.value[index] = {
          ...existing,
          status: 'pending',
          confirmed_at: null,
          confirmed_by: null,
          snooze_until: null,
          notes: existingNotes + undoNote,
        }
      }

      return true
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to undo'
      console.error('Error undoing confirmation:', e)
      return false
    }
  }

  async function createAdHocInstance(
    itemId: string,
    scheduledTime: Date,
    notes?: string,
  ): Promise<DailyInstanceWithItem | null> {
    if (!db) {
      error.value = 'Firebase not configured'
      return null
    }

    try {
      const item = itemsStore.getItemById(itemId)
      if (!item) {
        error.value = 'Item not found'
        return null
      }

      const instanceData = {
        item_id: itemId,
        schedule_id: null,
        date: formatDate(scheduledTime),
        scheduled_time: scheduledTime.toISOString(),
        status: 'pending',
        confirmed_at: null,
        confirmed_by: null,
        snooze_until: null,
        is_adhoc: true,
        notes: notes ?? null,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      }

      const instancesRef = collection(db, COLLECTIONS.DAILY_INSTANCES)
      const docRef = await addDoc(instancesRef, instanceData)

      const fullInstance: DailyInstanceWithItem = {
        id: docRef.id,
        ...instanceData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        item,
      }

      // Add to local state if same date
      if (formatDate(scheduledTime) === selectedDate.value) {
        instances.value.push(fullInstance)
      }

      return fullInstance
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to create instance'
      console.error('Error creating ad-hoc instance:', e)
      return null
    }
  }

  /**
   * Create a quick log entry - creates an ad-hoc instance and immediately confirms it.
   * Used for logging ad-hoc events like snacks, behaviors, symptoms, etc.
   * Note: Does not set global error state to avoid disrupting the dashboard UI.
   */
  async function createQuickLog(input: {
    category: string
    note?: string
  }): Promise<{ success: boolean; error?: string }> {
    if (!db) {
      return { success: false, error: 'Firebase not configured' }
    }

    const now = new Date()
    const userId = authStore.currentUser?.id ?? null

    try {
      // First, ensure we have a Quick Log placeholder item
      const itemId = await ensureQuickLogItem()
      if (!itemId) {
        console.error('[Quick Log] Could not get quick log item')
        return { success: false, error: 'Could not create quick log item' }
      }

      // Create a confirmed ad-hoc instance
      const instanceData = {
        item_id: itemId,
        schedule_id: null,
        date: formatDate(now),
        scheduled_time: now.toISOString(),
        status: 'confirmed',
        confirmed_at: now.toISOString(),
        confirmed_by: userId,
        snooze_until: null,
        is_adhoc: true,
        notes: input.note
          ? `[${input.category}] ${input.note}`
          : `[${input.category}]`,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      }

      const instancesRef = collection(db, COLLECTIONS.DAILY_INSTANCES)
      await addDoc(instancesRef, instanceData)

      // Refresh instances to show the new entry
      await refreshInstances()

      return { success: true }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Failed to create quick log'
      console.error('[Quick Log] Error:', e)
      return { success: false, error: errorMessage }
    }
  }

  // Cache for quick log item ID
  let quickLogItemId: string | null = null

  /**
   * Ensure a Quick Log placeholder item exists in the database.
   * Returns the item ID.
   */
  async function ensureQuickLogItem(): Promise<string | null> {
    if (quickLogItemId) return quickLogItemId

    try {
      // Ensure items are loaded
      if (itemsStore.items.length === 0) {
        await itemsStore.fetchItems()
      }

      // Check if Quick Log item already exists by name
      const existingItem = itemsStore.items.find(
        (item) => item.name === 'Quick Log'
      )

      if (existingItem) {
        quickLogItemId = existingItem.id
        console.log('[Quick Log] Found existing item:', quickLogItemId)
        return quickLogItemId
      }

      console.log('[Quick Log] Creating new item, items count:', itemsStore.items.length)

      // Create a new Quick Log item
      const newItem = await itemsStore.createItem({
        name: 'Quick Log',
        type: 'supplement',
        category: 'oral',
        dose: null,
        location: null,
        frequency: 'as_needed',
        notes: 'Placeholder item for quick log entries',
        active: true,
      })

      if (newItem) {
        quickLogItemId = newItem.id
        console.log('[Quick Log] Created new item:', quickLogItemId)
        return quickLogItemId
      }

      console.error('[Quick Log] Failed to create item')
      return null
    } catch (e) {
      console.error('[Quick Log] Error ensuring quick log item:', e)
      return null
    }
  }

  // Clear store state
  function $reset() {
    instances.value = []
    selectedDate.value = formatDate(new Date())
    isLoading.value = false
    error.value = null
    lastFetched.value = null
  }

  return {
    // State
    instances,
    selectedDate,
    isLoading,
    error,
    lastFetched,

    // Getters
    instancesByStatus,
    pendingCount,
    confirmedCount,

    // Actions
    fetchInstancesForDate,
    refreshInstances,
    checkConflict,
    confirmInstance,
    undoConfirmation,
    snoozeInstance,
    createAdHocInstance,
    createQuickLog,
    $reset,
  }
})

// Helper function
function formatDate(date: Date): string {
  const iso = date.toISOString()
  return iso.substring(0, 10)
}

// Quick log category mapping
const QUICK_LOG_CATEGORIES: Record<string, { name: string; type: 'food' | 'supplement' | 'medication'; category: string }> = {
  snack: { name: 'Snack', type: 'food', category: 'food' },
  behavior: { name: 'Behavior', type: 'supplement', category: 'oral' },
  symptom: { name: 'Symptom', type: 'medication', category: 'oral' },
  other: { name: 'Quick Log', type: 'supplement', category: 'oral' },
}

// Create a display-friendly item for quick log entries
function createQuickLogDisplayItem(notes: string | null, baseItem: Item): Item {
  // Parse category from notes format: "[category] optional note"
  const categoryMatch = notes?.match(/^\[(\w+)\]/)
  const categoryKey = categoryMatch ? categoryMatch[1].toLowerCase() : 'other'
  const categoryInfo = QUICK_LOG_CATEGORIES[categoryKey] || QUICK_LOG_CATEGORIES.other

  // Extract the note text after the category tag
  const noteText = notes?.replace(/^\[\w+\]\s*/, '') || ''

  // Create a display-friendly item with the category name and note
  return {
    ...baseItem,
    name: noteText || categoryInfo.name,
    type: categoryInfo.type,
    category: categoryInfo.category,
    notes: noteText || null,
  }
}
