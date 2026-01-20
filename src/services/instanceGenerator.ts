/**
 * Daily Instance Generator
 * Generates instances for items based on their schedules
 */

import { supabase } from '@/lib/supabase'
import type { ItemWithSchedules, DailyInstance } from '@/types'
import { combineDateAndTime, formatLocalDate } from '@/utils/date'

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
  const { data: existingData, error: fetchError } = await supabase
    .from('daily_instances')
    .select('item_id, schedule_id')
    .eq('date', date)

  if (fetchError) {
    console.error('Error checking existing instances:', fetchError)
    throw fetchError
  }

  // Create a set of existing item_id + schedule_id combinations
  const existingSet = new Set(
    ((existingData ?? []) as Array<{ item_id: string; schedule_id: string | null }>).map(
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

      // Combine date and schedule time to get full timestamp
      const scheduledTime = combineDateAndTime(date, schedule.scheduled_time)

      instancesToCreate.push({
        item_id: item.id,
        schedule_id: schedule.id,
        date,
        scheduled_time: scheduledTime.toISOString(),
        status: 'pending',
        is_adhoc: false,
      })
    }
  }

  if (instancesToCreate.length === 0) {
    return []
  }

  // Insert new instances
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: newInstances, error: insertError } = await (supabase as any)
    .from('daily_instances')
    .insert(instancesToCreate)
    .select()

  if (insertError) {
    console.error('Error creating instances:', insertError)
    throw insertError
  }

  return (newInstances ?? []) as DailyInstance[]
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
export async function expireOverdueInstances(date: string, cutoffMinutes = 30): Promise<number> {
  const cutoffTime = new Date()
  cutoffTime.setMinutes(cutoffTime.getMinutes() - cutoffMinutes)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('daily_instances')
    .update({ status: 'expired' })
    .eq('date', date)
    .eq('status', 'pending')
    .lt('scheduled_time', cutoffTime.toISOString())
    .select('id')

  if (error) {
    console.error('Error expiring instances:', error)
    return 0
  }

  return (data ?? []).length
}
