/**
 * Firestore Database Types
 * Document types for Firebase Firestore collections
 */

import type { Timestamp } from 'firebase/firestore'

// ============================================
// Firestore Utility Types
// ============================================

/**
 * JSON-compatible type for flexible fields
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

/**
 * Firestore timestamp or ISO string (for offline/serialization)
 */
export type FirestoreDate = Timestamp | string

// ============================================
// Collection: users
// ============================================

export interface User {
  id: string
  username: string
  password_hash: string
  display_name: string
  role: 'admin' | 'user'
  created_at: FirestoreDate
}

export type UserInput = Omit<User, 'id' | 'created_at'> & {
  created_at?: FirestoreDate
}

// ============================================
// Collection: pets
// ============================================

export interface Pet {
  id: string
  name: string
  breed: string | null
  weight_kg: number | null
  notes: string | null
  created_at: FirestoreDate
}

export type PetInput = Omit<Pet, 'id' | 'created_at'> & {
  created_at?: FirestoreDate
}

// ============================================
// Collection: items (medications, food, supplements)
// ============================================

export interface Item {
  id: string
  pet_id: string | null
  type: 'medication' | 'food' | 'supplement'
  category: string | null
  name: string
  dose: string | null
  location: string | null
  notes: string | null
  frequency: string
  active: boolean
  start_date: string | null
  end_date: string | null
  conflict_group: string | null
  created_at: FirestoreDate
  updated_at: FirestoreDate
}

export type ItemInput = Omit<Item, 'id' | 'created_at' | 'updated_at'> & {
  created_at?: FirestoreDate
  updated_at?: FirestoreDate
}

// ============================================
// Collection: item_schedules
// ============================================

export interface ItemSchedule {
  id: string
  item_id: string
  time_slot: string
  scheduled_time: string
  created_at: FirestoreDate
}

export type ItemScheduleInput = Omit<ItemSchedule, 'id' | 'created_at'> & {
  created_at?: FirestoreDate
}

// ============================================
// Collection: daily_instances
// ============================================

export interface DailyInstance {
  id: string
  item_id: string
  schedule_id: string | null
  date: string
  scheduled_time: string
  status: 'pending' | 'confirmed' | 'snoozed' | 'expired'
  confirmed_at: string | null
  confirmed_by: string | null
  snooze_until: string | null
  notes: string | null
  is_adhoc: boolean
  created_at: FirestoreDate
  updated_at: FirestoreDate
}

export type DailyInstanceInput = Omit<DailyInstance, 'id' | 'created_at' | 'updated_at'> & {
  created_at?: FirestoreDate
  updated_at?: FirestoreDate
}

// ============================================
// Collection: confirmation_history
// ============================================

export interface ConfirmationHistory {
  id: string
  instance_id: string
  version: number
  confirmed_at: string
  confirmed_by: string | null
  notes: string | null
  edited_at: string | null
  edited_by: string | null
  previous_values: Json | null
  created_at: FirestoreDate
}

export type ConfirmationHistoryInput = Omit<ConfirmationHistory, 'id' | 'created_at' | 'version'> & {
  version?: number
  created_at?: FirestoreDate
}

// ============================================
// Collection: conflict_groups
// ============================================

export interface ConflictGroup {
  id: string
  name: string
  spacing_minutes: number
  created_at: FirestoreDate
}

export type ConflictGroupInput = Omit<ConflictGroup, 'id' | 'created_at'> & {
  created_at?: FirestoreDate
}

// ============================================
// Firestore Collection Names
// ============================================

export const COLLECTIONS = {
  USERS: 'users',
  PETS: 'pets',
  ITEMS: 'items',
  ITEM_SCHEDULES: 'item_schedules',
  DAILY_INSTANCES: 'daily_instances',
  CONFIRMATION_HISTORY: 'confirmation_history',
  CONFLICT_GROUPS: 'conflict_groups',
} as const

export type CollectionName = typeof COLLECTIONS[keyof typeof COLLECTIONS]
