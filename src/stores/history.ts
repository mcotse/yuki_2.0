import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { supabase } from '@/lib/supabase'
import { useItemsStore } from './items'
import type { DailyInstanceWithItem, DailyInstance } from '@/types'
import { formatLocalDate } from '@/utils/date'

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
      // Ensure items are loaded
      if (itemsStore.items.length === 0) {
        await itemsStore.fetchItems()
      }

      // Fetch confirmed instances for the date
      const { data: instancesData, error: fetchError } = await supabase
        .from('daily_instances')
        .select('*')
        .eq('date', date)
        .eq('status', 'confirmed')
        .order('confirmed_at', { ascending: false })

      if (fetchError) throw fetchError

      const instanceRows = (instancesData ?? []) as unknown as DailyInstance[]

      // Fetch user names for confirmed_by
      const userIds = [...new Set(instanceRows.map(i => i.confirmed_by).filter(Boolean))]
      const userMap = new Map<string, string>()

      if (userIds.length > 0) {
        const { data: usersData } = await supabase
          .from('users')
          .select('id, display_name')
          .in('id', userIds)

        if (usersData) {
          for (const user of usersData as Array<{ id: string; display_name: string }>) {
            userMap.set(user.id, user.display_name)
          }
        }
      }

      // Build history entries
      const historyEntries: HistoryEntry[] = []
      for (const instance of instanceRows) {
        const item = itemsStore.getItemById(instance.item_id)
        if (item) {
          historyEntries.push({
            instance: { ...instance, item },
            confirmedAt: new Date(instance.confirmed_at!),
            confirmedByName: instance.confirmed_by
              ? userMap.get(instance.confirmed_by) ?? null
              : null,
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: updateError } = await (supabase as any)
        .from('daily_instances')
        .update(updates)
        .eq('id', instanceId)

      if (updateError) throw updateError

      // Refresh the list
      await fetchHistoryForDate(selectedDate.value)
      return true
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to update'
      console.error('Error updating confirmation:', e)
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
    $reset,
  }
})
