-- Yuki Care Tracker - Initial Database Schema
-- Migration: 001_initial_schema.sql

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- Users Table
-- Simple auth with password mapped to identity
-- ============================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for login lookup
CREATE INDEX idx_users_username ON users(username);

-- ============================================
-- Pets Table
-- Multi-pet support (future-proofed)
-- ============================================
CREATE TABLE pets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  breed TEXT,
  weight_kg DECIMAL(5,2),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- Items Table
-- Medications, food, supplements
-- ============================================
CREATE TABLE items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pet_id UUID REFERENCES pets(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('medication', 'food', 'supplement')),
  category TEXT, -- 'leftEye', 'rightEye', 'oral', 'food'
  name TEXT NOT NULL,
  dose TEXT,
  location TEXT, -- 'LEFT eye', 'RIGHT eye', 'ORAL', null for food
  notes TEXT,
  frequency TEXT NOT NULL, -- '1x_daily', '2x_daily', '4x_daily', '12h', 'as_needed'
  active BOOLEAN NOT NULL DEFAULT true,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  conflict_group TEXT, -- items in same group need 5-min spacing
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_items_pet_id ON items(pet_id);
CREATE INDEX idx_items_active ON items(active);
CREATE INDEX idx_items_type ON items(type);
CREATE INDEX idx_items_conflict_group ON items(conflict_group);

-- ============================================
-- Item Schedules Table
-- Individual time slots for each item
-- ============================================
CREATE TABLE item_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  time_slot TEXT NOT NULL, -- 'morning', 'midday', 'evening', 'night'
  scheduled_time TIME NOT NULL, -- actual time like '08:00'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for schedule lookups
CREATE INDEX idx_item_schedules_item_id ON item_schedules(item_id);

-- ============================================
-- Daily Instances Table
-- Generated instances for each day
-- ============================================
CREATE TABLE daily_instances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  schedule_id UUID REFERENCES item_schedules(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  scheduled_time TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'snoozed', 'expired')),
  confirmed_at TIMESTAMPTZ,
  confirmed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  snooze_until TIMESTAMPTZ,
  notes TEXT,
  is_adhoc BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(item_id, schedule_id, date)
);

-- Indexes for common queries
CREATE INDEX idx_daily_instances_item_id ON daily_instances(item_id);
CREATE INDEX idx_daily_instances_date ON daily_instances(date);
CREATE INDEX idx_daily_instances_status ON daily_instances(status);
CREATE INDEX idx_daily_instances_date_status ON daily_instances(date, status);

-- ============================================
-- Confirmation History Table
-- Full version history for audit trail
-- ============================================
CREATE TABLE confirmation_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  instance_id UUID NOT NULL REFERENCES daily_instances(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  confirmed_at TIMESTAMPTZ NOT NULL,
  confirmed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  notes TEXT,
  edited_at TIMESTAMPTZ,
  edited_by UUID REFERENCES users(id) ON DELETE SET NULL,
  previous_values JSONB, -- stores before state for audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for history lookups
CREATE INDEX idx_confirmation_history_instance_id ON confirmation_history(instance_id);

-- ============================================
-- Conflict Groups Table
-- Define spacing requirements between medications
-- ============================================
CREATE TABLE conflict_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE, -- 'leftEye', 'rightEye'
  spacing_minutes INTEGER NOT NULL DEFAULT 5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- Functions
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for items table
CREATE TRIGGER update_items_updated_at
  BEFORE UPDATE ON items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for daily_instances table
CREATE TRIGGER update_daily_instances_updated_at
  BEFORE UPDATE ON daily_instances
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Row Level Security (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE pets ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE confirmation_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE conflict_groups ENABLE ROW LEVEL SECURITY;

-- For now, allow all authenticated users to read/write
-- More restrictive policies can be added later

-- Users: anyone can read, only admins can write
CREATE POLICY "Users are viewable by authenticated users" ON users
  FOR SELECT USING (true);

CREATE POLICY "Users are editable by admins" ON users
  FOR ALL USING (true); -- Simplified for now

-- Pets: all authenticated users
CREATE POLICY "Pets are viewable by all" ON pets
  FOR SELECT USING (true);

CREATE POLICY "Pets are editable by all" ON pets
  FOR ALL USING (true);

-- Items: all authenticated users
CREATE POLICY "Items are viewable by all" ON items
  FOR SELECT USING (true);

CREATE POLICY "Items are editable by all" ON items
  FOR ALL USING (true);

-- Item Schedules: all authenticated users
CREATE POLICY "Schedules are viewable by all" ON item_schedules
  FOR SELECT USING (true);

CREATE POLICY "Schedules are editable by all" ON item_schedules
  FOR ALL USING (true);

-- Daily Instances: all authenticated users
CREATE POLICY "Instances are viewable by all" ON daily_instances
  FOR SELECT USING (true);

CREATE POLICY "Instances are editable by all" ON daily_instances
  FOR ALL USING (true);

-- Confirmation History: all authenticated users
CREATE POLICY "History is viewable by all" ON confirmation_history
  FOR SELECT USING (true);

CREATE POLICY "History is editable by all" ON confirmation_history
  FOR ALL USING (true);

-- Conflict Groups: all authenticated users
CREATE POLICY "Groups are viewable by all" ON conflict_groups
  FOR SELECT USING (true);

CREATE POLICY "Groups are editable by all" ON conflict_groups
  FOR ALL USING (true);

-- ============================================
-- Insert default conflict groups
-- ============================================
INSERT INTO conflict_groups (name, spacing_minutes) VALUES
  ('leftEye', 5),
  ('rightEye', 5);
