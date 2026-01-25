/**
 * Daily Instance Generator
 * Generates instances for items based on their schedules
 */

import { api } from '@/lib/api'
import { db } from '@/lib/firebase'
import {
  collection,
  getDocs,
  addDoc,
  query,
  where,
  serverTimestamp,
  type DocumentData,
} from 'firebase/firestore'
import { COLLECTIONS } from '@/types/database'
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

  // Use Firestore directly when Firebase is configured
  if (db) {
    return generateInstancesWithFirestore(date, activeItems)
  }

  // Fall back to REST API for Oracle backend compatibility
  return generateInstancesWithApi(date, activeItems)
}

/**
 * Generate instances using Firestore directly
 */
async function generateInstancesWithFirestore(
  date: string,
  activeItems: ItemWithSchedules[],
): Promise<DailyInstance[]> {
  const instancesRef = collection(db!, COLLECTIONS.DAILY_INSTANCES)

  // Query existing instances for this date
  const q = query(instancesRef, where('date', '==', date))
  const snapshot = await getDocs(q)

  // Build set of existing item_id:schedule_id combinations
  const existingSet = new Set<string>()
  snapshot.docs.forEach((doc) => {
    const data = doc.data() as DocumentData
    const key = `${data.item_id}:${data.schedule_id ?? 'null'}`
    existingSet.add(key)
  })

  // Build instances to create
  const instancesToCreate: Array<{
    item_id: string
    schedule_id: string
    date: string
    scheduled_time: string
    status: 'pending'
    is_adhoc: false
    confirmed_at: null
    confirmed_by: null
    snooze_until: null
    notes: null
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

      // Build full ISO timestamp by combining date + schedule time
      // schedule.scheduled_time is in "HH:MM" format
      const scheduledTime = `${date}T${schedule.scheduled_time}:00`

      instancesToCreate.push({
        item_id: item.id,
        schedule_id: schedule.id,
        date,
        scheduled_time: scheduledTime,
        status: 'pending',
        is_adhoc: false,
        confirmed_at: null,
        confirmed_by: null,
        snooze_until: null,
        notes: null,
      })
    }
  }

  if (instancesToCreate.length === 0) {
    return []
  }

  // Create instances in Firestore
  const newInstances: DailyInstance[] = []
  for (const instance of instancesToCreate) {
    try {
      const docRef = await addDoc(instancesRef, {
        ...instance,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      })

      newInstances.push({
        id: docRef.id,
        ...instance,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
    } catch (err) {
      console.error('Error creating instance in Firestore:', err)
    }
  }

  return newInstances
}

/**
 * Generate instances using REST API (for Oracle backend)
 */
async function generateInstancesWithApi(
  date: string,
  activeItems: ItemWithSchedules[],
): Promise<DailyInstance[]> {
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
