import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import {
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  type DocumentData,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { localData } from '@/lib/localData'
import { useItemsStore } from './items'
import type { DailyInstanceWithItem, DailyInstance } from '@/types'
import { formatLocalDate } from '@/utils/date'
import { COLLECTIONS } from '@/types/database'

export interface HistoryEntry {
  instance: DailyInstanceWithItem
  confirmedAt: Date
  confirmedByName: string | null
}

export const useHistoryStore = defineStore('history', () => {
  // State
  const entries = ref<HistoryEntry[]>([])
  const selectedDate = ref<string>(formatLocalDate(new Date()))
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Stores
  const itemsStore = useItemsStore()

  // Helper to convert Firestore doc to DailyInstance
  // Local users for development/testing when Firebase is not configured
  const LOCAL_USERS: Record<string, string> = {
    'local-admin-uuid': 'Matthew',
    'local-user-uuid': 'Caretaker',
  }

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

  // Helper to fetch user display names from Firestore
  async function fetchUserDisplayNames(userIds: string[]): Promise<Map<string, string>> {
    const userNames = new Map<string, string>()

    // Nothing to look up
    if (userIds.length === 0) return userNames

    // Use local users for development when Firebase is not configured
    if (!db) {
      for (const userId of userIds) {
        const localName = LOCAL_USERS[userId]
        if (localName) {
          userNames.set(userId, localName)
        }
      }
      return userNames
    }

    // Capture db in local variable for type narrowing
    const firestore = db

    // Fetch each user document
    const uniqueIds = [...new Set(userIds)]
    await Promise.all(
      uniqueIds.map(async (userId) => {
        try {
          const userDoc = await getDoc(doc(firestore, COLLECTIONS.USERS, userId))
          if (userDoc.exists()) {
            const data = userDoc.data()
            userNames.set(userId, data.display_name || data.username || 'Unknown')
          }
        } catch (e) {
          console.error(`Error fetching user ${userId}:`, e)
        }
      })
    )

    return userNames
  }

  // Getters
  const entriesByTime = computed(() => {
    return [...entries.value].sort(
      (a, b) => b.confirmedAt.getTime() - a.confirmedAt.getTime()
    )
  })

  const totalEntries = computed(() => entries.value.length)

  // Actions
  async function fetchHistoryForDate(date: string): Promise<void> {
    isLoading.value = true
    error.value = null
    selectedDate.value = date

    try {
      // Always fetch items fresh to ensure we have the latest
      await itemsStore.fetchItems()

      // Use local data if Firebase is not configured
      if (!db) {
        const instanceRows = localData.getConfirmedInstancesForDate(date)

        // Collect user IDs to look up
        const userIds = instanceRows
          .map((i) => i.confirmed_by)
          .filter((id): id is string => id !== null)
        const userNames = await fetchUserDisplayNames(userIds)

        // Build history entries
        const historyEntries: HistoryEntry[] = []
        for (const instance of instanceRows) {
          const item = itemsStore.getItemById(instance.item_id)
          if (item) {
            historyEntries.push({
              instance: { ...instance, item },
              confirmedAt: new Date(instance.confirmed_at!),
              confirmedByName: instance.confirmed_by ? userNames.get(instance.confirmed_by) || null : null,
            })
          }
        }

        entries.value = historyEntries
        return
      }

      // Fetch confirmed instances for the date from Firestore
      const instancesRef = collection(db, COLLECTIONS.DAILY_INSTANCES)
      const q = query(
        instancesRef,
        where('date', '==', date),
        where('status', '==', 'confirmed'),
        orderBy('confirmed_at', 'desc'),
      )
      const snapshot = await getDocs(q)

      const instanceRows = snapshot.docs.map((docSnap) => docToInstance(docSnap.data(), docSnap.id))

      // Collect user IDs to look up
      const userIds = instanceRows
        .map((i) => i.confirmed_by)
        .filter((id): id is string => id !== null)
      const userNames = await fetchUserDisplayNames(userIds)

      // Build history entries
      const historyEntries: HistoryEntry[] = []
      for (const instance of instanceRows) {
        const item = itemsStore.getItemById(instance.item_id)
        if (item) {
          historyEntries.push({
            instance: { ...instance, item },
            confirmedAt: new Date(instance.confirmed_at!),
            confirmedByName: instance.confirmed_by ? userNames.get(instance.confirmed_by) || null : null,
          })
        }
      }

      entries.value = historyEntries
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch history'
      console.error('Error fetching history:', e)
    } finally {
      isLoading.value = false
    }
  }

  async function updateConfirmation(
    instanceId: string,
    updates: { confirmed_at?: string; confirmed_by?: string | null; notes?: string | null }
  ): Promise<boolean> {
    try {
      // Use local data if Firebase is not configured
      if (!db) {
        localData.updateInstance(selectedDate.value, instanceId, updates)
        await fetchHistoryForDate(selectedDate.value)
        return true
      }

      const instanceRef = doc(db, COLLECTIONS.DAILY_INSTANCES, instanceId)
      await updateDoc(instanceRef, {
        ...updates,
        updated_at: serverTimestamp(),
      })

      // Refresh the list
      await fetchHistoryForDate(selectedDate.value)
      return true
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to update'
      console.error('Error updating confirmation:', e)
      return false
    }
  }

  async function undoConfirmation(instanceId: string): Promise<boolean> {
    const entry = entries.value.find((e) => e.instance.id === instanceId)
    if (!entry) {
      error.value = 'Entry not found'
      return false
    }

    try {
      const now = new Date()
      const undoNote = `[Undone at ${now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}]`
      const existingNotes = entry.instance.notes ? `${entry.instance.notes} ` : ''

      // Use local data if Firebase is not configured
      if (!db) {
        localData.updateInstance(selectedDate.value, instanceId, {
          status: 'pending',
          confirmed_at: null,
          confirmed_by: null,
          notes: existingNotes + undoNote,
        })

        entries.value = entries.value.filter((e) => e.instance.id !== instanceId)
        return true
      }

      const instanceRef = doc(db, COLLECTIONS.DAILY_INSTANCES, instanceId)
      await updateDoc(instanceRef, {
        status: 'pending',
        confirmed_at: null,
        confirmed_by: null,
        notes: existingNotes + undoNote,
        updated_at: serverTimestamp(),
      })

      // Remove from local state (it's no longer confirmed)
      entries.value = entries.value.filter((e) => e.instance.id !== instanceId)
      return true
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to undo'
      console.error('Error undoing confirmation:', e)
      return false
    }
  }

  function $reset() {
    entries.value = []
    selectedDate.value = formatLocalDate(new Date())
    isLoading.value = false
    error.value = null
  }

  return {
    // State
    entries,
    selectedDate,
    isLoading,
    error,

    // Getters
    entriesByTime,
    totalEntries,

    // Actions
    fetchHistoryForDate,
    updateConfirmation,
    undoConfirmation,
    $reset,
  }
})
