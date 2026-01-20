-- Yuki Care Tracker - Seed Data
-- Migration: 002_seed_data.sql
-- Contains initial medications, users, and pet data from SPEC

-- ============================================
-- Insert default user (Matthew as admin)
-- Password: yuki2026 (hashed with bcrypt)
-- Note: In production, use proper password hashing
-- ============================================
INSERT INTO users (username, password_hash, display_name, role) VALUES
  ('matthew', '$2b$10$placeholder_hash_for_yuki2026', 'Matthew', 'admin');

-- ============================================
-- Insert pet (Yuki)
-- ============================================
INSERT INTO pets (name, breed, notes) VALUES
  ('Yuki', NULL, 'Our beloved dog');

-- ============================================
-- Insert medications - Left Eye
-- ============================================
INSERT INTO items (pet_id, type, category, name, dose, location, notes, frequency, active, conflict_group, start_date)
SELECT
  (SELECT id FROM pets WHERE name = 'Yuki'),
  'medication',
  'leftEye',
  'Ofloxacin 0.3%',
  '1 drop',
  'LEFT eye',
  NULL,
  '4x_daily',
  true,
  'leftEye',
  '2026-01-12 12:00:00-08:00';

INSERT INTO items (pet_id, type, category, name, dose, location, notes, frequency, active, conflict_group, start_date)
SELECT
  (SELECT id FROM pets WHERE name = 'Yuki'),
  'medication',
  'leftEye',
  'Atropine 1%',
  '1 drop',
  'LEFT eye',
  'May cause drooling',
  '2x_daily',
  true,
  'leftEye',
  '2026-01-12 12:00:00-08:00';

INSERT INTO items (pet_id, type, category, name, dose, location, notes, frequency, active, conflict_group, start_date)
SELECT
  (SELECT id FROM pets WHERE name = 'Yuki'),
  'medication',
  'leftEye',
  'Amniotic eye drops',
  '1 drop',
  'LEFT eye',
  'Refrigerated',
  '2x_daily',
  true,
  'leftEye',
  '2026-01-12 12:00:00-08:00';

-- ============================================
-- Insert medications - Right Eye
-- ============================================
INSERT INTO items (pet_id, type, category, name, dose, location, notes, frequency, active, conflict_group, start_date)
SELECT
  (SELECT id FROM pets WHERE name = 'Yuki'),
  'medication',
  'rightEye',
  'Prednisolone acetate 1%',
  '1 drop',
  'RIGHT eye',
  'If squinting, STOP & call vet (650-551-1115)',
  '2x_daily',
  true,
  'rightEye',
  '2026-01-12 12:00:00-08:00';

INSERT INTO items (pet_id, type, category, name, dose, location, notes, frequency, active, conflict_group, start_date)
SELECT
  (SELECT id FROM pets WHERE name = 'Yuki'),
  'medication',
  'rightEye',
  'Tacrolimus 0.03% + Cyclosporine 2%',
  '1 drop',
  'RIGHT eye',
  'Wash hands after. Lifelong medication',
  '2x_daily',
  true,
  'rightEye',
  '2026-01-12 12:00:00-08:00';

-- ============================================
-- Insert medications - Oral
-- ============================================
INSERT INTO items (pet_id, type, category, name, dose, location, notes, frequency, active, conflict_group, start_date)
SELECT
  (SELECT id FROM pets WHERE name = 'Yuki'),
  'medication',
  'oral',
  'Prednisolone 5mg tablet',
  '1/4 tablet',
  'ORAL',
  'Do NOT stop abruptly. May increase hunger/thirst/urination',
  '1x_daily',
  true,
  NULL,
  '2026-01-15 12:00:00-08:00';

INSERT INTO items (pet_id, type, category, name, dose, location, notes, frequency, active, conflict_group, start_date)
SELECT
  (SELECT id FROM pets WHERE name = 'Yuki'),
  'medication',
  'oral',
  'Gabapentin 50mg',
  '1 tablet',
  'ORAL',
  'For pain. May cause sedation',
  '12h',
  true,
  NULL,
  '2026-01-12 12:00:00-08:00';

-- ============================================
-- Insert food/supplements
-- ============================================
INSERT INTO items (pet_id, type, category, name, dose, location, notes, frequency, active)
SELECT
  (SELECT id FROM pets WHERE name = 'Yuki'),
  'food',
  'food',
  'Breakfast',
  NULL,
  NULL,
  NULL,
  '1x_daily',
  true;

INSERT INTO items (pet_id, type, category, name, dose, location, notes, frequency, active)
SELECT
  (SELECT id FROM pets WHERE name = 'Yuki'),
  'food',
  'food',
  'Dinner',
  NULL,
  NULL,
  NULL,
  '1x_daily',
  true;

INSERT INTO items (pet_id, type, category, name, dose, location, notes, frequency, active)
SELECT
  (SELECT id FROM pets WHERE name = 'Yuki'),
  'supplement',
  'food',
  'Vitamins',
  NULL,
  NULL,
  'Give with food',
  '1x_daily',
  true;

INSERT INTO items (pet_id, type, category, name, dose, location, notes, frequency, active)
SELECT
  (SELECT id FROM pets WHERE name = 'Yuki'),
  'supplement',
  'food',
  'Probiotics',
  NULL,
  NULL,
  'Give with food',
  '1x_daily',
  true;

-- ============================================
-- Insert default schedules for 4x daily (Ofloxacin)
-- ============================================
INSERT INTO item_schedules (item_id, time_slot, scheduled_time)
SELECT id, 'morning', '08:00' FROM items WHERE name = 'Ofloxacin 0.3%'
UNION ALL
SELECT id, 'midday', '12:00' FROM items WHERE name = 'Ofloxacin 0.3%'
UNION ALL
SELECT id, 'evening', '17:00' FROM items WHERE name = 'Ofloxacin 0.3%'
UNION ALL
SELECT id, 'night', '21:00' FROM items WHERE name = 'Ofloxacin 0.3%';

-- ============================================
-- Insert default schedules for 2x daily medications
-- ============================================
INSERT INTO item_schedules (item_id, time_slot, scheduled_time)
SELECT id, 'morning', '08:00' FROM items WHERE frequency = '2x_daily'
UNION ALL
SELECT id, 'evening', '20:00' FROM items WHERE frequency = '2x_daily';

-- ============================================
-- Insert default schedules for 1x daily medications/food
-- ============================================
INSERT INTO item_schedules (item_id, time_slot, scheduled_time)
SELECT id, 'morning', '08:00' FROM items
WHERE frequency = '1x_daily'
  AND (name = 'Breakfast' OR name = 'Vitamins' OR name = 'Probiotics' OR name = 'Prednisolone 5mg tablet');

INSERT INTO item_schedules (item_id, time_slot, scheduled_time)
SELECT id, 'evening', '18:00' FROM items WHERE name = 'Dinner';

-- ============================================
-- Insert default schedules for 12h (Gabapentin)
-- ============================================
INSERT INTO item_schedules (item_id, time_slot, scheduled_time)
SELECT id, 'morning', '08:00' FROM items WHERE name = 'Gabapentin 50mg'
UNION ALL
SELECT id, 'evening', '20:00' FROM items WHERE name = 'Gabapentin 50mg';
