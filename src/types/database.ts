/**
 * Supabase Database Types
 * These types are generated from the Supabase schema
 * Run `npx supabase gen types typescript` to regenerate after schema changes
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          username: string
          password_hash: string
          display_name: string
          role: 'admin' | 'user'
          created_at: string
        }
        Insert: {
          id?: string
          username: string
          password_hash: string
          display_name: string
          role?: 'admin' | 'user'
          created_at?: string
        }
        Update: {
          id?: string
          username?: string
          password_hash?: string
          display_name?: string
          role?: 'admin' | 'user'
          created_at?: string
        }
      }
      pets: {
        Row: {
          id: string
          name: string
          breed: string | null
          weight_kg: number | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          breed?: string | null
          weight_kg?: number | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          breed?: string | null
          weight_kg?: number | null
          notes?: string | null
          created_at?: string
        }
      }
      items: {
        Row: {
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
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          pet_id?: string | null
          type: 'medication' | 'food' | 'supplement'
          category?: string | null
          name: string
          dose?: string | null
          location?: string | null
          notes?: string | null
          frequency: string
          active?: boolean
          start_date?: string | null
          end_date?: string | null
          conflict_group?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          pet_id?: string | null
          type?: 'medication' | 'food' | 'supplement'
          category?: string | null
          name?: string
          dose?: string | null
          location?: string | null
          notes?: string | null
          frequency?: string
          active?: boolean
          start_date?: string | null
          end_date?: string | null
          conflict_group?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      item_schedules: {
        Row: {
          id: string
          item_id: string
          time_slot: string
          scheduled_time: string
          created_at: string
        }
        Insert: {
          id?: string
          item_id: string
          time_slot: string
          scheduled_time: string
          created_at?: string
        }
        Update: {
          id?: string
          item_id?: string
          time_slot?: string
          scheduled_time?: string
          created_at?: string
        }
      }
      daily_instances: {
        Row: {
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
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          item_id: string
          schedule_id?: string | null
          date: string
          scheduled_time: string
          status?: 'pending' | 'confirmed' | 'snoozed' | 'expired'
          confirmed_at?: string | null
          confirmed_by?: string | null
          snooze_until?: string | null
          notes?: string | null
          is_adhoc?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          item_id?: string
          schedule_id?: string | null
          date?: string
          scheduled_time?: string
          status?: 'pending' | 'confirmed' | 'snoozed' | 'expired'
          confirmed_at?: string | null
          confirmed_by?: string | null
          snooze_until?: string | null
          notes?: string | null
          is_adhoc?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      confirmation_history: {
        Row: {
          id: string
          instance_id: string
          version: number
          confirmed_at: string
          confirmed_by: string | null
          notes: string | null
          edited_at: string | null
          edited_by: string | null
          previous_values: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          instance_id: string
          version?: number
          confirmed_at: string
          confirmed_by?: string | null
          notes?: string | null
          edited_at?: string | null
          edited_by?: string | null
          previous_values?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          instance_id?: string
          version?: number
          confirmed_at?: string
          confirmed_by?: string | null
          notes?: string | null
          edited_at?: string | null
          edited_by?: string | null
          previous_values?: Json | null
          created_at?: string
        }
      }
      conflict_groups: {
        Row: {
          id: string
          name: string
          spacing_minutes: number
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          spacing_minutes?: number
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          spacing_minutes?: number
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// Convenience type aliases
export type User = Database['public']['Tables']['users']['Row']
export type Pet = Database['public']['Tables']['pets']['Row']
export type Item = Database['public']['Tables']['items']['Row']
export type ItemSchedule = Database['public']['Tables']['item_schedules']['Row']
export type DailyInstance = Database['public']['Tables']['daily_instances']['Row']
export type ConfirmationHistory = Database['public']['Tables']['confirmation_history']['Row']
export type ConflictGroup = Database['public']['Tables']['conflict_groups']['Row']
