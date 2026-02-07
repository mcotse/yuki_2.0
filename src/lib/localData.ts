/**
 * Local data storage for development/testing when Firebase is not enabled.
 * Uses localStorage for persistence.
 */

import type { ItemWithSchedules, DailyInstance } from '@/types'

const STORAGE_KEYS = {
  items: 'yuki-local-items',
  instances: 'yuki-local-instances',
}

// Sample items for local testing - Updated 2026-01-24
const SAMPLE_ITEMS: ItemWithSchedules[] = [
  // === LEFT EYE MEDICATIONS ===
  {
    id: 'ofloxacin',
    pet_id: 'yuki',
    type: 'medication',
    category: 'leftEye',
    name: 'Ofloxacin 0.3%',
    dose: '1 drop',
    location: 'LEFT eye',
    notes: null,
    frequency: '4x_daily',
    active: true,
    start_date: '2026-01-12',
    end_date: null,
    conflict_group: 'leftEye',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    schedules: [
      { id: 'sch-oflox-1', item_id: 'ofloxacin', time_slot: 'morning', scheduled_time: '08:00', created_at: new Date().toISOString() },
      { id: 'sch-oflox-2', item_id: 'ofloxacin', time_slot: 'midday', scheduled_time: '12:00', created_at: new Date().toISOString() },
      { id: 'sch-oflox-3', item_id: 'ofloxacin', time_slot: 'afternoon', scheduled_time: '14:00', created_at: new Date().toISOString() },
      { id: 'sch-oflox-4', item_id: 'ofloxacin', time_slot: 'evening', scheduled_time: '17:00', created_at: new Date().toISOString() },
      { id: 'sch-oflox-5', item_id: 'ofloxacin', time_slot: 'night', scheduled_time: '21:00', created_at: new Date().toISOString() },
    ],
  },
  {
    id: 'atropine',
    pet_id: 'yuki',
    type: 'medication',
    category: 'leftEye',
    name: 'Atropine 1%',
    dose: '1 drop',
    location: 'LEFT eye',
    notes: '⚠️ May cause drooling',
    frequency: '2x_daily',
    active: true,
    start_date: '2026-01-12',
    end_date: null,
    conflict_group: 'leftEye',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    schedules: [
      { id: 'sch-atrop-1', item_id: 'atropine', time_slot: 'morning', scheduled_time: '08:00', created_at: new Date().toISOString() },
      { id: 'sch-atrop-2', item_id: 'atropine', time_slot: 'evening', scheduled_time: '20:00', created_at: new Date().toISOString() },
    ],
  },
  {
    id: 'amniotic',
    pet_id: 'yuki',
    type: 'medication',
    category: 'leftEye',
    name: 'Amniotic eye drops',
    dose: '1 drop',
    location: 'LEFT eye',
    notes: '❄️ Refrigerated',
    frequency: '2x_daily',
    active: true,
    start_date: '2026-01-12',
    end_date: null,
    conflict_group: 'leftEye',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    schedules: [
      { id: 'sch-amnio-1', item_id: 'amniotic', time_slot: 'morning', scheduled_time: '08:00', created_at: new Date().toISOString() },
      { id: 'sch-amnio-2', item_id: 'amniotic', time_slot: 'evening', scheduled_time: '20:00', created_at: new Date().toISOString() },
    ],
  },
  {
    id: 'plasma',
    pet_id: 'yuki',
    type: 'medication',
    category: 'leftEye',
    name: 'Homologous plasma',
    dose: '1 drop',
    location: 'LEFT eye',
    notes: '❄️ Refrigerated',
    frequency: '4x_daily',
    active: false,
    start_date: '2026-01-12',
    end_date: '2026-01-19',
    conflict_group: 'leftEye',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    schedules: [
      { id: 'sch-plasma-1', item_id: 'plasma', time_slot: 'morning', scheduled_time: '08:00', created_at: new Date().toISOString() },
      { id: 'sch-plasma-2', item_id: 'plasma', time_slot: 'midday', scheduled_time: '12:00', created_at: new Date().toISOString() },
      { id: 'sch-plasma-3', item_id: 'plasma', time_slot: 'evening', scheduled_time: '17:00', created_at: new Date().toISOString() },
      { id: 'sch-plasma-4', item_id: 'plasma', time_slot: 'night', scheduled_time: '21:00', created_at: new Date().toISOString() },
    ],
  },

  // === RIGHT EYE MEDICATIONS ===
  {
    id: 'prednisolone-eye',
    pet_id: 'yuki',
    type: 'medication',
    category: 'rightEye',
    name: 'Prednisolone acetate 1%',
    dose: '1 drop',
    location: 'RIGHT eye',
    notes: '🛑 If squinting, STOP & call vet (650-551-1115)',
    frequency: '2x_daily',
    active: true,
    start_date: '2026-01-12',
    end_date: null,
    conflict_group: 'rightEye',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    schedules: [
      { id: 'sch-pred-eye-1', item_id: 'prednisolone-eye', time_slot: 'morning', scheduled_time: '08:00', created_at: new Date().toISOString() },
      { id: 'sch-pred-eye-2', item_id: 'prednisolone-eye', time_slot: 'evening', scheduled_time: '20:00', created_at: new Date().toISOString() },
    ],
  },
  {
    id: 'tacrolimus-cyclosporine',
    pet_id: 'yuki',
    type: 'medication',
    category: 'rightEye',
    name: 'Tacrolimus 0.03% + Cyclosporine 2%',
    dose: '1 drop',
    location: 'RIGHT eye',
    notes: '🧤 Wash hands after. 🔁 Lifelong med',
    frequency: '2x_daily',
    active: true,
    start_date: '2026-01-12',
    end_date: null,
    conflict_group: 'rightEye',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    schedules: [
      { id: 'sch-tacro-1', item_id: 'tacrolimus-cyclosporine', time_slot: 'morning', scheduled_time: '08:00', created_at: new Date().toISOString() },
      { id: 'sch-tacro-2', item_id: 'tacrolimus-cyclosporine', time_slot: 'evening', scheduled_time: '20:00', created_at: new Date().toISOString() },
    ],
  },

  // === ORAL MEDICATIONS ===
  {
    id: 'prednisolone-oral',
    pet_id: 'yuki',
    type: 'medication',
    category: 'oral',
    name: 'Prednisolone 5mg tablet',
    dose: '¼ tablet',
    location: 'ORAL',
    notes: '⚠️ Do NOT stop abruptly. May increase hunger/thirst/urination',
    frequency: '1x_daily',
    active: true,
    start_date: '2026-01-15',
    end_date: null,
    conflict_group: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    schedules: [
      { id: 'sch-pred-oral-1', item_id: 'prednisolone-oral', time_slot: 'morning', scheduled_time: '08:00', created_at: new Date().toISOString() },
    ],
  },
  {
    id: 'amoxicillin',
    pet_id: 'yuki',
    type: 'medication',
    category: 'oral',
    name: 'Amoxicillin/Clavulanate liquid',
    dose: '1 mL',
    location: 'ORAL',
    notes: '🍽️ Give with food. ❄️ Refrigerate',
    frequency: '2x_daily',
    active: false,
    start_date: '2026-01-13',
    end_date: '2026-01-19',
    conflict_group: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    schedules: [
      { id: 'sch-amox-1', item_id: 'amoxicillin', time_slot: 'morning', scheduled_time: '08:00', created_at: new Date().toISOString() },
      { id: 'sch-amox-2', item_id: 'amoxicillin', time_slot: 'evening', scheduled_time: '20:00', created_at: new Date().toISOString() },
    ],
  },
  {
    id: 'gabapentin',
    pet_id: 'yuki',
    type: 'medication',
    category: 'oral',
    name: 'Gabapentin 50mg',
    dose: '1 tablet',
    location: 'ORAL',
    notes: '💊 For pain. May cause sedation',
    frequency: '2x_daily',
    active: false,
    start_date: '2026-01-12',
    end_date: '2026-01-22',
    conflict_group: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    schedules: [
      { id: 'sch-gaba-1', item_id: 'gabapentin', time_slot: 'morning', scheduled_time: '08:00', created_at: new Date().toISOString() },
      { id: 'sch-gaba-2', item_id: 'gabapentin', time_slot: 'evening', scheduled_time: '20:00', created_at: new Date().toISOString() },
    ],
  },

  // === FOOD ===
  {
    id: 'breakfast',
    pet_id: 'yuki',
    type: 'food',
    category: 'food',
    name: 'Breakfast',
    dose: null,
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
      { id: 'sch-bfast-1', item_id: 'breakfast', time_slot: 'morning', scheduled_time: '07:30', created_at: new Date().toISOString() },
    ],
  },
  {
    id: 'dinner',
    pet_id: 'yuki',
    type: 'food',
    category: 'food',
    name: 'Dinner',
    dose: null,
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
      { id: 'sch-dinner-1', item_id: 'dinner', time_slot: 'evening', scheduled_time: '18:00', created_at: new Date().toISOString() },
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

  deleteInstance(date: string, id: string): boolean {
    const instances = this.getInstancesForDate(date)
    const index = instances.findIndex(i => i.id === id)
    if (index === -1) return false

    instances.splice(index, 1)
    this.saveInstancesForDate(date, instances)
    return true
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
