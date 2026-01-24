/**
 * Daily Instance Generator
 * Generates instances for items based on their schedules
 */

import { api } from '@/lib/api'
import type { ItemWithSchedules, DailyInstance } from '@/types'
import { formatLocalDate } from '@/utils/date'

interface ExistingInstance {
  item_id: string
  schedule_id: string | null
}

/**
 * Generate daily instances for a given date
 * Only creates instances that don't already exist
 */
export async function generateInstancesForDate(
  date: string,
  items: ItemWithSchedules[],
): Promise<DailyInstance[]> {
  // Filter to active items with schedules
  const activeItems = items.filter((item) => item.active && item.schedules.length > 0)

  if (activeItems.length === 0) {
    return []
  }

  // Check for existing instances on this date
  const { data: existingData, error: fetchError } = await api
    .from<ExistingInstance>('instances')
    .select('item_id,schedule_id')
    .eq('date', date)

  if (fetchError) {
    console.error('Error checking existing instances:', fetchError)
    throw fetchError
  }

  // Create a set of existing item_id + schedule_id combinations
  const existingSet = new Set(
    ((existingData ?? []) as ExistingInstance[]).map(
      (e) => `${e.item_id}:${e.schedule_id ?? 'null'}`,
    ),
  )

  // Build instances to create
  const instancesToCreate: Array<{
    item_id: string
    schedule_id: string
    date: string
    scheduled_time: string
    status: 'pending'
    is_adhoc: false
  }> = []

  for (const item of activeItems) {
    // Check if item is within its active date range
    if (item.start_date) {
      const startDate = item.start_date.split('T')[0] ?? ''
      if (startDate > date) continue // Not started yet
    }

    if (item.end_date) {
      const endDate = item.end_date.split('T')[0] ?? ''
      if (endDate < date) continue // Already ended
    }

    for (const schedule of item.schedules) {
      const key = `${item.id}:${schedule.id}`
      if (existingSet.has(key)) continue // Already exists

      instancesToCreate.push({
        item_id: item.id,
        schedule_id: schedule.id,
        date,
        // Send just the time portion (HH:MM) - server combines with date
        scheduled_time: schedule.scheduled_time,
        status: 'pending',
        is_adhoc: false,
      })
    }
  }

  if (instancesToCreate.length === 0) {
    return []
  }

  // Insert new instances one by one (API doesn't support bulk insert)
  const newInstances: DailyInstance[] = []
  for (const instance of instancesToCreate) {
    const { data, error: insertError } = await api
      .from<DailyInstance>('instances')
      .insert(instance)

    if (insertError) {
      console.error('Error creating instance:', insertError)
      continue
    }

    if (data) {
      newInstances.push(data)
    }
  }

  return newInstances
}

/**
 * Generate instances for today if they don't exist
 */
export async function ensureTodayInstances(items: ItemWithSchedules[]): Promise<void> {
  const today = formatLocalDate(new Date())
  await generateInstancesForDate(today, items)
}

/**
 * Expire overdue pending instances
 * Called periodically to mark items as expired if past cutoff
 */
export async function expireOverdueInstances(_date: string, _cutoffMinutes: number = 30): Promise<number> {
  void _cutoffMinutes // Suppress unused parameter warning
  // TODO: Implement with new API - needs backend endpoint for bulk update
  // For now, this is handled by the instances store
  return 0
}
