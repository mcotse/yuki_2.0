import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { useItemsStore } from './items'
import type { DailyInstanceWithItem, DailyInstance } from '@/types'
import { formatLocalDate } from '@/utils/date'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

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

      // Fetch instances for the date (filter confirmed ones)
      const response = await fetch(`${API_BASE}/instances?date=${date}`)
      if (!response.ok) throw new Error('Failed to fetch instances')

      const allInstances = (await response.json()) as DailyInstance[]
      const instanceRows = allInstances.filter(i => i.status === 'confirmed')

      // Build history entries
      const historyEntries: HistoryEntry[] = []
      for (const instance of instanceRows) {
        const item = itemsStore.getItemById(instance.item_id)
        if (item) {
          historyEntries.push({
            instance: { ...instance, item },
            confirmedAt: new Date(instance.confirmed_at!),
            confirmedByName: null, // TODO: fetch user names if needed
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
      const response = await fetch(`${API_BASE}/instances/${instanceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })

      if (!response.ok) throw new Error('Failed to update confirmation')

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

      const response = await fetch(`${API_BASE}/instances/${instanceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'pending',
          confirmed_at: null,
          confirmed_by: null,
          notes: existingNotes + undoNote,
        }),
      })

      if (!response.ok) throw new Error('Failed to undo confirmation')

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
