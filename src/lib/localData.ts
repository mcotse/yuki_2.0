/**
 * Local data storage for development/testing when Firebase is not enabled.
 * Uses localStorage for persistence.
 */

import type { ItemWithSchedules, DailyInstance } from '@/types'

const STORAGE_KEYS = {
  items: 'yuki-local-items',
  instances: 'yuki-local-instances',
}

// Sample items for local testing
const SAMPLE_ITEMS: ItemWithSchedules[] = [
  {
    id: 'local-item-1',
    pet_id: 'yuki',
    type: 'medication',
    category: 'leftEye',
    name: 'Optimmune (Left)',
    dose: '1 drop',
    location: 'LEFT eye',
    notes: 'Apply to left eye',
    frequency: '2x_daily',
    active: true,
    start_date: null,
    end_date: null,
    conflict_group: 'eye_drops',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    schedules: [
      { id: 'sch-1a', item_id: 'local-item-1', time_slot: 'morning', scheduled_time: '08:00', created_at: new Date().toISOString() },
      { id: 'sch-1b', item_id: 'local-item-1', time_slot: 'evening', scheduled_time: '20:00', created_at: new Date().toISOString() },
    ],
  },
  {
    id: 'local-item-2',
    pet_id: 'yuki',
    type: 'medication',
    category: 'rightEye',
    name: 'Optimmune (Right)',
    dose: '1 drop',
    location: 'RIGHT eye',
    notes: 'Apply to right eye',
    frequency: '2x_daily',
    active: true,
    start_date: null,
    end_date: null,
    conflict_group: 'eye_drops',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    schedules: [
      { id: 'sch-2a', item_id: 'local-item-2', time_slot: 'morning', scheduled_time: '08:00', created_at: new Date().toISOString() },
      { id: 'sch-2b', item_id: 'local-item-2', time_slot: 'evening', scheduled_time: '20:00', created_at: new Date().toISOString() },
    ],
  },
  {
    id: 'local-item-3',
    pet_id: 'yuki',
    type: 'medication',
    category: 'leftEye',
    name: 'Neo-Poly-Dex (Left)',
    dose: '1 drop',
    location: 'LEFT eye',
    notes: null,
    frequency: '3x_daily',
    active: true,
    start_date: null,
    end_date: null,
    conflict_group: 'eye_drops',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    schedules: [
      { id: 'sch-3a', item_id: 'local-item-3', time_slot: 'morning', scheduled_time: '08:00', created_at: new Date().toISOString() },
      { id: 'sch-3b', item_id: 'local-item-3', time_slot: 'afternoon', scheduled_time: '14:00', created_at: new Date().toISOString() },
      { id: 'sch-3c', item_id: 'local-item-3', time_slot: 'evening', scheduled_time: '20:00', created_at: new Date().toISOString() },
    ],
  },
  {
    id: 'local-item-4',
    pet_id: 'yuki',
    type: 'medication',
    category: 'oral',
    name: 'Gabapentin',
    dose: '100mg',
    location: 'ORAL',
    notes: 'Give with food',
    frequency: '2x_daily',
    active: true,
    start_date: null,
    end_date: null,
    conflict_group: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    schedules: [
      { id: 'sch-4a', item_id: 'local-item-4', time_slot: 'morning', scheduled_time: '08:00', created_at: new Date().toISOString() },
      { id: 'sch-4b', item_id: 'local-item-4', time_slot: 'evening', scheduled_time: '20:00', created_at: new Date().toISOString() },
    ],
  },
  {
    id: 'local-item-5',
    pet_id: 'yuki',
    type: 'food',
    category: 'food',
    name: 'Breakfast',
    dose: '1/2 cup',
    location: null,
    notes: 'Wet food mixed with dry',
    frequency: '1x_daily',
    active: true,
    start_date: null,
    end_date: null,
    conflict_group: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    schedules: [
      { id: 'sch-5a', item_id: 'local-item-5', time_slot: 'morning', scheduled_time: '07:30', created_at: new Date().toISOString() },
    ],
  },
  {
    id: 'local-item-6',
    pet_id: 'yuki',
    type: 'food',
    category: 'food',
    name: 'Dinner',
    dose: '1/2 cup',
    location: null,
    notes: null,
    frequency: '1x_daily',
    active: true,
    start_date: null,
    end_date: null,
    conflict_group: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    schedules: [
      { id: 'sch-6a', item_id: 'local-item-6', time_slot: 'evening', scheduled_time: '18:00', created_at: new Date().toISOString() },
    ],
  },
  {
    id: 'local-item-7',
    pet_id: 'yuki',
    type: 'supplement',
    category: 'oral',
    name: 'Fish Oil',
    dose: '1 pump',
    location: 'ORAL',
    notes: 'Mix with food',
    frequency: '1x_daily',
    active: true,
    start_date: null,
    end_date: null,
    conflict_group: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    schedules: [
      { id: 'sch-7a', item_id: 'local-item-7', time_slot: 'morning', scheduled_time: '07:30', created_at: new Date().toISOString() },
    ],
  },
]

// Generate instances for a given date
function generateInstancesForDate(date: string, items: ItemWithSchedules[]): DailyInstance[] {
  const instances: DailyInstance[] = []

  for (const item of items) {
    if (!item.active) continue

    for (const schedule of item.schedules) {
      const [hours, minutes] = schedule.scheduled_time.split(':').map(Number)
      const scheduledTime = new Date(date)
      scheduledTime.setHours(hours || 0, minutes || 0, 0, 0)

      instances.push({
        id: `inst-${date}-${item.id}-${schedule.id}`,
        item_id: item.id,
        schedule_id: schedule.id,
        date,
        scheduled_time: scheduledTime.toISOString(),
        status: 'pending',
        confirmed_at: null,
        confirmed_by: null,
        snooze_until: null,
        notes: null,
        is_adhoc: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
    }
  }

  return instances
}

export const localData = {
  // Items
  getItems(): ItemWithSchedules[] {
    const stored = localStorage.getItem(STORAGE_KEYS.items)
    if (stored) {
      try {
        return JSON.parse(stored)
      } catch {
        // Invalid data, return samples
      }
    }
    // Initialize with sample data
    localStorage.setItem(STORAGE_KEYS.items, JSON.stringify(SAMPLE_ITEMS))
    return SAMPLE_ITEMS
  },

  saveItems(items: ItemWithSchedules[]): void {
    localStorage.setItem(STORAGE_KEYS.items, JSON.stringify(items))
  },

  updateItem(id: string, updates: Partial<ItemWithSchedules>): ItemWithSchedules | null {
    const items = this.getItems()
    const index = items.findIndex(i => i.id === id)
    if (index === -1) return null

    const existingItem = items[index]
    if (!existingItem) return null

    items[index] = { ...existingItem, ...updates, updated_at: new Date().toISOString() }
    this.saveItems(items)
    return items[index]!
  },

  createItem(item: Omit<ItemWithSchedules, 'id' | 'created_at' | 'updated_at'>): ItemWithSchedules {
    const items = this.getItems()
    const newItem: ItemWithSchedules = {
      ...item,
      id: `local-item-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    items.push(newItem)
    this.saveItems(items)
    return newItem
  },

  // Instances
  getInstancesForDate(date: string): DailyInstance[] {
    const key = `${STORAGE_KEYS.instances}-${date}`
    const stored = localStorage.getItem(key)
    if (stored) {
      try {
        return JSON.parse(stored)
      } catch {
        // Invalid data
      }
    }
    // Generate instances from items
    const items = this.getItems()
    const instances = generateInstancesForDate(date, items)
    localStorage.setItem(key, JSON.stringify(instances))
    return instances
  },

  saveInstancesForDate(date: string, instances: DailyInstance[]): void {
    const key = `${STORAGE_KEYS.instances}-${date}`
    localStorage.setItem(key, JSON.stringify(instances))
  },

  updateInstance(date: string, id: string, updates: Partial<DailyInstance>): DailyInstance | null {
    const instances = this.getInstancesForDate(date)
    const index = instances.findIndex(i => i.id === id)
    if (index === -1) return null

    const existingInstance = instances[index]
    if (!existingInstance) return null

    instances[index] = { ...existingInstance, ...updates, updated_at: new Date().toISOString() }
    this.saveInstancesForDate(date, instances)
    return instances[index]!
  },

  createInstance(instance: Omit<DailyInstance, 'id' | 'created_at' | 'updated_at'>): DailyInstance {
    const instances = this.getInstancesForDate(instance.date)
    const newInstance: DailyInstance = {
      ...instance,
      id: `inst-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    instances.push(newInstance)
    this.saveInstancesForDate(instance.date, instances)
    return newInstance
  },

  // Get confirmed instances for history
  getConfirmedInstancesForDate(date: string): DailyInstance[] {
    return this.getInstancesForDate(date).filter(i => i.status === 'confirmed')
  },

  // Reset all local data
  reset(): void {
    // Clear all instance data
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i)
      if (key?.startsWith(STORAGE_KEYS.instances) || key === STORAGE_KEYS.items) {
        localStorage.removeItem(key)
      }
    }
  },
}
