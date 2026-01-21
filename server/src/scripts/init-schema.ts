import 'dotenv/config'
import { initializePool, closePool, getConnection } from '../db.js'

const schema = `
-- Users table
CREATE TABLE users (
  id VARCHAR2(36) PRIMARY KEY,
  username VARCHAR2(255) NOT NULL UNIQUE,
  password_hash VARCHAR2(255) NOT NULL,
  display_name VARCHAR2(255) NOT NULL,
  role VARCHAR2(20) DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  created_at TIMESTAMP DEFAULT SYSTIMESTAMP
)
/

-- Pets table
CREATE TABLE pets (
  id VARCHAR2(36) PRIMARY KEY,
  name VARCHAR2(255) NOT NULL,
  breed VARCHAR2(255),
  weight_kg NUMBER(5,2),
  notes CLOB,
  created_at TIMESTAMP DEFAULT SYSTIMESTAMP
)
/

-- Items table (medications, food, supplements)
CREATE TABLE items (
  id VARCHAR2(36) PRIMARY KEY,
  pet_id VARCHAR2(36) REFERENCES pets(id),
  type VARCHAR2(20) NOT NULL CHECK (type IN ('medication', 'food', 'supplement')),
  category VARCHAR2(50),
  name VARCHAR2(255) NOT NULL,
  dose VARCHAR2(100),
  location VARCHAR2(255),
  notes CLOB,
  frequency VARCHAR2(100) NOT NULL,
  active NUMBER(1) DEFAULT 1,
  start_date VARCHAR2(20),
  end_date VARCHAR2(20),
  conflict_group VARCHAR2(36),
  created_at TIMESTAMP DEFAULT SYSTIMESTAMP,
  updated_at TIMESTAMP DEFAULT SYSTIMESTAMP
)
/

-- Item schedules table
CREATE TABLE item_schedules (
  id VARCHAR2(36) PRIMARY KEY,
  item_id VARCHAR2(36) NOT NULL REFERENCES items(id),
  time_slot VARCHAR2(50) NOT NULL,
  scheduled_time VARCHAR2(20) NOT NULL,
  created_at TIMESTAMP DEFAULT SYSTIMESTAMP
)
/

-- Daily instances table
CREATE TABLE daily_instances (
  id VARCHAR2(36) PRIMARY KEY,
  item_id VARCHAR2(36) NOT NULL REFERENCES items(id),
  schedule_id VARCHAR2(36) REFERENCES item_schedules(id),
  instance_date VARCHAR2(20) NOT NULL,
  scheduled_time VARCHAR2(20) NOT NULL,
  status VARCHAR2(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'snoozed', 'expired')),
  confirmed_at TIMESTAMP,
  confirmed_by VARCHAR2(36),
  snooze_until VARCHAR2(30),
  notes CLOB,
  is_adhoc NUMBER(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT SYSTIMESTAMP,
  updated_at TIMESTAMP DEFAULT SYSTIMESTAMP
)
/

-- Confirmation history table
CREATE TABLE confirmation_history (
  id VARCHAR2(36) PRIMARY KEY,
  instance_id VARCHAR2(36) NOT NULL REFERENCES daily_instances(id),
  version NUMBER DEFAULT 1,
  confirmed_at TIMESTAMP NOT NULL,
  confirmed_by VARCHAR2(36),
  notes CLOB,
  edited_at TIMESTAMP,
  edited_by VARCHAR2(36),
  previous_values CLOB,
  created_at TIMESTAMP DEFAULT SYSTIMESTAMP
)
/

-- Conflict groups table
CREATE TABLE conflict_groups (
  id VARCHAR2(36) PRIMARY KEY,
  name VARCHAR2(255) NOT NULL,
  spacing_minutes NUMBER DEFAULT 30,
  created_at TIMESTAMP DEFAULT SYSTIMESTAMP
)
/

-- Indexes for performance
CREATE INDEX idx_items_pet_id ON items(pet_id)
/
CREATE INDEX idx_items_active ON items(active)
/
CREATE INDEX idx_item_schedules_item_id ON item_schedules(item_id)
/
CREATE INDEX idx_daily_instances_item_id ON daily_instances(item_id)
/
CREATE INDEX idx_daily_instances_date ON daily_instances(instance_date)
/
CREATE INDEX idx_daily_instances_status ON daily_instances(status)
/
CREATE INDEX idx_confirmation_history_instance_id ON confirmation_history(instance_id)
/
`

async function initSchema() {
  console.log('Initializing database schema...')

  try {
    await initializePool()
    const connection = await getConnection()

    // Remove comments and split by the Oracle statement separator
    const cleanSchema = schema
      .split('\n')
      .filter(line => !line.trim().startsWith('--'))
      .join('\n')

    const statements = cleanSchema
      .split(/\n\/(?:\n|$)/)
      .map(s => s.trim())
      .filter(s => s.length > 0)

    for (const statement of statements) {
      try {
        console.log(`Executing: ${statement.substring(0, 60)}...`)
        await connection.execute(statement)
        console.log('  ✓ Success')
      } catch (error: unknown) {
        const err = error as { errorNum?: number; message?: string }
        // Ignore "table already exists" errors (ORA-00955)
        if (err.errorNum === 955) {
          console.log('  ⚠ Already exists, skipping')
        } else if (err.errorNum === 1408) {
          // Index already exists
          console.log('  ⚠ Index already exists, skipping')
        } else {
          console.error('  ✗ Error:', err.message)
        }
      }
    }

    await connection.commit()
    await connection.close()

    console.log('\n✓ Schema initialization complete!')
  } catch (error) {
    console.error('Failed to initialize schema:', error)
    process.exit(1)
  } finally {
    await closePool()
  }
}

initSchema()
