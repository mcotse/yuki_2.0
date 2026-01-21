/**
 * Application Types
 * Re-exports database types and adds app-specific interfaces
 */

// Re-export all database types
export * from './database'

import type {
  User,
  Item,
  ItemSchedule,
  DailyInstance,
  ConfirmationHistory,
} from './database'

// ============================================
// Auth Types
// ============================================

export interface AuthUser {
  id: string
  username: string
  displayName: string
  role: 'admin' | 'user'
}

export interface AuthState {
  user: AuthUser | null
  isAuthenticated: boolean
  sessionExpiresAt: Date | null
}

export interface LoginCredentials {
  password: string
}

// ============================================
// Item/Medication Types
// ============================================

export type ItemType = 'medication' | 'food' | 'supplement'

export type ItemCategory = 'leftEye' | 'rightEye' | 'oral' | 'food'

export type ItemLocation = 'LEFT eye' | 'RIGHT eye' | 'ORAL' | null

export type ItemFrequency =
  | '1x_daily'
  | '2x_daily'
  | '4x_daily'
  | '12h'
  | 'as_needed'

export interface ItemWithSchedules extends Item {
  schedules: ItemSchedule[]
}

// ============================================
// Daily Instance Types
// ============================================

export type InstanceStatus = 'pending' | 'confirmed' | 'snoozed' | 'expired'

export interface DailyInstanceWithItem extends DailyInstance {
  item: Item
}

export interface InstancesByStatus {
  overdue: DailyInstanceWithItem[]
  due: DailyInstanceWithItem[]
  upcoming: DailyInstanceWithItem[]
  snoozed: DailyInstanceWithItem[]
  confirmed: DailyInstanceWithItem[]
}

// ============================================
// Confirmation Types
// ============================================

export interface ConfirmationInput {
  instanceId: string
  notes?: string
}

export interface ConfirmationResult {
  success: boolean
  history: ConfirmationHistory | null
  error?: string
}

// ============================================
// Conflict Types
// ============================================

export interface ConflictCheck {
  hasConflict: boolean
  conflictingItemName?: string
  remainingMinutes?: number
  canOverride: boolean
}

// ============================================
// Snooze Types
// ============================================

export type SnoozeInterval = 15 | 30 | 60 // minutes

export interface SnoozeInput {
  instanceId: string
  minutes: SnoozeInterval
}

// ============================================
// History Types
// ============================================

export interface HistoryEntry extends ConfirmationHistory {
  instance: DailyInstance
  item: Item
  confirmedByUser: User | null
}

export interface HistoryEditInput {
  historyId: string
  confirmedAt?: Date
  confirmedBy?: string
}

// ============================================
// Offline Queue Types
// ============================================

export type OfflineActionType = 'confirm' | 'snooze' | 'edit' | 'create'

export interface OfflineAction {
  id: string
  type: OfflineActionType
  payload: Record<string, unknown>
  timestamp: Date
  synced: boolean
}

// ============================================
// UI State Types
// ============================================

export interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'warning' | 'info'
  duration?: number
}

export interface ModalState {
  isOpen: boolean
  component: string | null
  props?: Record<string, unknown>
}

// ============================================
// Quick Add Types
// ============================================

export interface QuickAddInput {
  name: string
  scheduledTime: Date
  notes?: string
}

// ============================================
// Settings Types
// ============================================

export interface AppSettings {
  notificationsEnabled: boolean
  notificationAdvanceMinutes: number
}

// ============================================
// Date/Time Utilities
// ============================================

export interface TimeSlot {
  id: string
  name: string // 'morning', 'midday', 'evening', 'night'
  time: string // '08:00'
  displayTime: string // '8:00 AM'
}

// ============================================
// API Response Types
// ============================================

export interface ApiResponse<T> {
  data: T | null
  error: string | null
  success: boolean
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}
