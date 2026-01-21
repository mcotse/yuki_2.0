import 'dotenv/config'
import { initializePool, closePool, executeStatement, executeQuery } from '../db.js'
import { v4 as uuidv4 } from 'uuid'

async function seedData() {
  console.log('Seeding database with initial data...')

  try {
    await initializePool()

    // Check if data already exists
    const existingPets = await executeQuery<{ CNT: number }>('SELECT COUNT(*) as CNT FROM pets')
    if (existingPets[0].CNT > 0) {
      console.log('⚠ Data already exists. Skipping seed.')
      return
    }

    // Generate UUIDs
    const userId = uuidv4()
    const petId = uuidv4()
    const ofloxacinId = uuidv4()
    const atropineId = uuidv4()
    const amnioticId = uuidv4()
    const prednisoloneEyeId = uuidv4()
    const tacrolimusId = uuidv4()
    const prednisoloneOralId = uuidv4()
    const gabapentinId = uuidv4()
    const breakfastId = uuidv4()
    const dinnerId = uuidv4()
    const vitaminsId = uuidv4()
    const probioticsId = uuidv4()

    // Insert user
    console.log('Creating user...')
    await executeStatement(
      `INSERT INTO users (id, username, password_hash, display_name, role)
       VALUES (:id, :username, :password_hash, :display_name, :role)`,
      { id: userId, username: 'matthew', password_hash: 'placeholder_hash', display_name: 'Matthew', role: 'admin' }
    )

    // Insert pet
    console.log('Creating pet...')
    await executeStatement(
      `INSERT INTO pets (id, name, breed, notes) VALUES (:id, :name, :breed, :notes)`,
      { id: petId, name: 'Yuki', breed: null, notes: 'Our beloved dog' }
    )

    // Insert medications - Left Eye
    console.log('Creating left eye medications...')
    await executeStatement(
      `INSERT INTO items (id, pet_id, type, category, name, dose, location, notes, frequency, active, conflict_group, start_date)
       VALUES (:id, :pet_id, :type, :category, :name, :dose, :location, :notes, :frequency, :active, :conflict_group, :start_date)`,
      { id: ofloxacinId, pet_id: petId, type: 'medication', category: 'leftEye', name: 'Ofloxacin 0.3%',
        dose: '1 drop', location: 'LEFT eye', notes: null, frequency: '4x_daily', active: 1, conflict_group: 'leftEye', start_date: '2026-01-12' }
    )

    await executeStatement(
      `INSERT INTO items (id, pet_id, type, category, name, dose, location, notes, frequency, active, conflict_group, start_date)
       VALUES (:id, :pet_id, :type, :category, :name, :dose, :location, :notes, :frequency, :active, :conflict_group, :start_date)`,
      { id: atropineId, pet_id: petId, type: 'medication', category: 'leftEye', name: 'Atropine 1%',
        dose: '1 drop', location: 'LEFT eye', notes: 'May cause drooling', frequency: '2x_daily', active: 1, conflict_group: 'leftEye', start_date: '2026-01-12' }
    )

    await executeStatement(
      `INSERT INTO items (id, pet_id, type, category, name, dose, location, notes, frequency, active, conflict_group, start_date)
       VALUES (:id, :pet_id, :type, :category, :name, :dose, :location, :notes, :frequency, :active, :conflict_group, :start_date)`,
      { id: amnioticId, pet_id: petId, type: 'medication', category: 'leftEye', name: 'Amniotic eye drops',
        dose: '1 drop', location: 'LEFT eye', notes: 'Refrigerated', frequency: '2x_daily', active: 1, conflict_group: 'leftEye', start_date: '2026-01-12' }
    )

    // Insert medications - Right Eye
    console.log('Creating right eye medications...')
    await executeStatement(
      `INSERT INTO items (id, pet_id, type, category, name, dose, location, notes, frequency, active, conflict_group, start_date)
       VALUES (:id, :pet_id, :type, :category, :name, :dose, :location, :notes, :frequency, :active, :conflict_group, :start_date)`,
      { id: prednisoloneEyeId, pet_id: petId, type: 'medication', category: 'rightEye', name: 'Prednisolone acetate 1%',
        dose: '1 drop', location: 'RIGHT eye', notes: 'If squinting, STOP & call vet (650-551-1115)', frequency: '2x_daily', active: 1, conflict_group: 'rightEye', start_date: '2026-01-12' }
    )

    await executeStatement(
      `INSERT INTO items (id, pet_id, type, category, name, dose, location, notes, frequency, active, conflict_group, start_date)
       VALUES (:id, :pet_id, :type, :category, :name, :dose, :location, :notes, :frequency, :active, :conflict_group, :start_date)`,
      { id: tacrolimusId, pet_id: petId, type: 'medication', category: 'rightEye', name: 'Tacrolimus 0.03% + Cyclosporine 2%',
        dose: '1 drop', location: 'RIGHT eye', notes: 'Wash hands after. Lifelong medication', frequency: '2x_daily', active: 1, conflict_group: 'rightEye', start_date: '2026-01-12' }
    )

    // Insert medications - Oral
    console.log('Creating oral medications...')
    await executeStatement(
      `INSERT INTO items (id, pet_id, type, category, name, dose, location, notes, frequency, active, conflict_group, start_date)
       VALUES (:id, :pet_id, :type, :category, :name, :dose, :location, :notes, :frequency, :active, :conflict_group, :start_date)`,
      { id: prednisoloneOralId, pet_id: petId, type: 'medication', category: 'oral', name: 'Prednisolone 5mg tablet',
        dose: '1/4 tablet', location: 'ORAL', notes: 'Do NOT stop abruptly. May increase hunger/thirst/urination', frequency: '1x_daily', active: 1, conflict_group: null, start_date: '2026-01-15' }
    )

    await executeStatement(
      `INSERT INTO items (id, pet_id, type, category, name, dose, location, notes, frequency, active, conflict_group, start_date)
       VALUES (:id, :pet_id, :type, :category, :name, :dose, :location, :notes, :frequency, :active, :conflict_group, :start_date)`,
      { id: gabapentinId, pet_id: petId, type: 'medication', category: 'oral', name: 'Gabapentin 50mg',
        dose: '1 tablet', location: 'ORAL', notes: 'For pain. May cause sedation', frequency: '12h', active: 1, conflict_group: null, start_date: '2026-01-12' }
    )

    // Insert food/supplements
    console.log('Creating food and supplements...')
    await executeStatement(
      `INSERT INTO items (id, pet_id, type, category, name, dose, location, notes, frequency, active, conflict_group, start_date)
       VALUES (:id, :pet_id, :type, :category, :name, :dose, :location, :notes, :frequency, :active, :conflict_group, :start_date)`,
      { id: breakfastId, pet_id: petId, type: 'food', category: 'food', name: 'Breakfast',
        dose: null, location: null, notes: null, frequency: '1x_daily', active: 1, conflict_group: null, start_date: null }
    )

    await executeStatement(
      `INSERT INTO items (id, pet_id, type, category, name, dose, location, notes, frequency, active, conflict_group, start_date)
       VALUES (:id, :pet_id, :type, :category, :name, :dose, :location, :notes, :frequency, :active, :conflict_group, :start_date)`,
      { id: dinnerId, pet_id: petId, type: 'food', category: 'food', name: 'Dinner',
        dose: null, location: null, notes: null, frequency: '1x_daily', active: 1, conflict_group: null, start_date: null }
    )

    await executeStatement(
      `INSERT INTO items (id, pet_id, type, category, name, dose, location, notes, frequency, active, conflict_group, start_date)
       VALUES (:id, :pet_id, :type, :category, :name, :dose, :location, :notes, :frequency, :active, :conflict_group, :start_date)`,
      { id: vitaminsId, pet_id: petId, type: 'supplement', category: 'food', name: 'Vitamins',
        dose: null, location: null, notes: 'Give with food', frequency: '1x_daily', active: 1, conflict_group: null, start_date: null }
    )

    await executeStatement(
      `INSERT INTO items (id, pet_id, type, category, name, dose, location, notes, frequency, active, conflict_group, start_date)
       VALUES (:id, :pet_id, :type, :category, :name, :dose, :location, :notes, :frequency, :active, :conflict_group, :start_date)`,
      { id: probioticsId, pet_id: petId, type: 'supplement', category: 'food', name: 'Probiotics',
        dose: null, location: null, notes: 'Give with food', frequency: '1x_daily', active: 1, conflict_group: null, start_date: null }
    )

    // Insert schedules - Ofloxacin 4x daily
    console.log('Creating schedules...')
    const times4x = [
      { slot: 'morning', time: '08:00' },
      { slot: 'midday', time: '12:00' },
      { slot: 'evening', time: '17:00' },
      { slot: 'night', time: '21:00' }
    ]
    for (const t of times4x) {
      await executeStatement(
        `INSERT INTO item_schedules (id, item_id, time_slot, scheduled_time) VALUES (:id, :item_id, :time_slot, :scheduled_time)`,
        { id: uuidv4(), item_id: ofloxacinId, time_slot: t.slot, scheduled_time: t.time }
      )
    }

    // Insert schedules - 2x daily medications
    const times2x = [
      { slot: 'morning', time: '08:00' },
      { slot: 'evening', time: '20:00' }
    ]
    const items2x = [atropineId, amnioticId, prednisoloneEyeId, tacrolimusId, gabapentinId]
    for (const itemId of items2x) {
      for (const t of times2x) {
        await executeStatement(
          `INSERT INTO item_schedules (id, item_id, time_slot, scheduled_time) VALUES (:id, :item_id, :time_slot, :scheduled_time)`,
          { id: uuidv4(), item_id: itemId, time_slot: t.slot, scheduled_time: t.time }
        )
      }
    }

    // Insert schedules - 1x daily (morning)
    const items1xMorning = [breakfastId, vitaminsId, probioticsId, prednisoloneOralId]
    for (const itemId of items1xMorning) {
      await executeStatement(
        `INSERT INTO item_schedules (id, item_id, time_slot, scheduled_time) VALUES (:id, :item_id, :time_slot, :scheduled_time)`,
        { id: uuidv4(), item_id: itemId, time_slot: 'morning', scheduled_time: '08:00' }
      )
    }

    // Insert schedule - Dinner (evening)
    await executeStatement(
      `INSERT INTO item_schedules (id, item_id, time_slot, scheduled_time) VALUES (:id, :item_id, :time_slot, :scheduled_time)`,
      { id: uuidv4(), item_id: dinnerId, time_slot: 'evening', scheduled_time: '18:00' }
    )

    // Create today's instances
    console.log('Creating today\'s instances...')
    const today = new Date().toISOString().split('T')[0]
    const schedules = await executeQuery<{ ID: string; ITEM_ID: string; TIME_SLOT: string; SCHEDULED_TIME: string }>(
      'SELECT id, item_id, time_slot, scheduled_time FROM item_schedules'
    )

    for (const schedule of schedules) {
      await executeStatement(
        `INSERT INTO daily_instances (id, item_id, schedule_id, instance_date, scheduled_time, status, is_adhoc)
         VALUES (:id, :item_id, :schedule_id, :instanceDate, :scheduled_time, :status, :is_adhoc)`,
        {
          id: uuidv4(),
          item_id: schedule.ITEM_ID,
          schedule_id: schedule.ID,
          instanceDate: today,
          scheduled_time: schedule.SCHEDULED_TIME,
          status: 'pending',
          is_adhoc: 0
        }
      )
    }

    console.log('\n✓ Seed data inserted successfully!')
    console.log(`  - 1 user (matthew)`)
    console.log(`  - 1 pet (Yuki)`)
    console.log(`  - 12 items (medications, food, supplements)`)
    console.log(`  - ${schedules.length} schedules`)
    console.log(`  - ${schedules.length} instances for today (${today})`)

  } catch (error) {
    console.error('Failed to seed data:', error)
    process.exit(1)
  } finally {
    await closePool()
  }
}

seedData()
