/**
 * Test Fixtures API - Only available in development/test environments
 * Provides endpoints to seed and reset the database for E2E testing
 */
import { Router } from 'express'
import { executeQuery, executeStatement } from '../db.js'

const router = Router()

// Only enable in non-production environments
const isTestEnabled = process.env.NODE_ENV !== 'production'

interface CountResult {
  CNT: number
}

/**
 * Reset database and seed with test fixtures
 * POST /api/test-fixtures/reset
 */
router.post('/reset', async (req, res, next) => {
  if (!isTestEnabled) {
    return res.status(403).json({ error: 'Test fixtures not available in production' })
  }

  try {
    console.log('[Test Fixtures] Resetting database...')

    // Clear existing data in correct order (respect foreign keys)
    await executeStatement('DELETE FROM daily_instances')
    await executeStatement('DELETE FROM item_schedules')
    await executeStatement('DELETE FROM items')
    await executeStatement('DELETE FROM pets')
    await executeStatement('DELETE FROM users')

    // Generate fixed UUIDs for predictable testing
    const userId = 'test-user-001'
    const petId = 'test-pet-001'
    const ofloxacinId = 'test-item-ofloxacin'
    const atropineId = 'test-item-atropine'
    const amnioticId = 'test-item-amniotic'
    const prednisoloneEyeId = 'test-item-pred-eye'
    const tacrolimusId = 'test-item-tacrolimus'
    const prednisoloneOralId = 'test-item-pred-oral'
    const gabapentinId = 'test-item-gabapentin'
    const quickLogId = 'test-item-quicklog'

    // Insert user
    await executeStatement(
      `INSERT INTO users (id, username, password_hash, display_name, role)
       VALUES (:id, :username, :password_hash, :display_name, :role)`,
      { id: userId, username: 'matthew', password_hash: 'placeholder_hash', display_name: 'Matthew', role: 'admin' }
    )

    // Insert pet
    await executeStatement(
      `INSERT INTO pets (id, name, breed, notes) VALUES (:id, :name, :breed, :notes)`,
      { id: petId, name: 'Yuki', breed: null, notes: 'Test pet' }
    )

    // Insert LEFT eye medications (same conflict_group: 'leftEye')
    await executeStatement(
      `INSERT INTO items (id, pet_id, type, category, name, dose, location, notes, frequency, active, conflict_group, start_date)
       VALUES (:id, :pet_id, :type, :category, :name, :dose, :location, :notes, :frequency, :active, :conflict_group, :start_date)`,
      { id: ofloxacinId, pet_id: petId, type: 'medication', category: 'leftEye', name: 'Ofloxacin 0.3%',
        dose: '1 drop', location: 'LEFT eye', notes: null, frequency: '4x_daily', active: 1, conflict_group: 'leftEye', start_date: '2026-01-01' }
    )

    await executeStatement(
      `INSERT INTO items (id, pet_id, type, category, name, dose, location, notes, frequency, active, conflict_group, start_date)
       VALUES (:id, :pet_id, :type, :category, :name, :dose, :location, :notes, :frequency, :active, :conflict_group, :start_date)`,
      { id: atropineId, pet_id: petId, type: 'medication', category: 'leftEye', name: 'Atropine 1%',
        dose: '1 drop', location: 'LEFT eye', notes: 'May cause drooling', frequency: '2x_daily', active: 1, conflict_group: 'leftEye', start_date: '2026-01-01' }
    )

    await executeStatement(
      `INSERT INTO items (id, pet_id, type, category, name, dose, location, notes, frequency, active, conflict_group, start_date)
       VALUES (:id, :pet_id, :type, :category, :name, :dose, :location, :notes, :frequency, :active, :conflict_group, :start_date)`,
      { id: amnioticId, pet_id: petId, type: 'medication', category: 'leftEye', name: 'Amniotic drops',
        dose: '1 drop', location: 'LEFT eye', notes: 'Refrigerated', frequency: '2x_daily', active: 1, conflict_group: 'leftEye', start_date: '2026-01-01' }
    )

    // Insert RIGHT eye medications (same conflict_group: 'rightEye')
    await executeStatement(
      `INSERT INTO items (id, pet_id, type, category, name, dose, location, notes, frequency, active, conflict_group, start_date)
       VALUES (:id, :pet_id, :type, :category, :name, :dose, :location, :notes, :frequency, :active, :conflict_group, :start_date)`,
      { id: prednisoloneEyeId, pet_id: petId, type: 'medication', category: 'rightEye', name: 'Prednisolone 1%',
        dose: '1 drop', location: 'RIGHT eye', notes: null, frequency: '2x_daily', active: 1, conflict_group: 'rightEye', start_date: '2026-01-01' }
    )

    await executeStatement(
      `INSERT INTO items (id, pet_id, type, category, name, dose, location, notes, frequency, active, conflict_group, start_date)
       VALUES (:id, :pet_id, :type, :category, :name, :dose, :location, :notes, :frequency, :active, :conflict_group, :start_date)`,
      { id: tacrolimusId, pet_id: petId, type: 'medication', category: 'rightEye', name: 'Tacrolimus 0.03%',
        dose: '1 drop', location: 'RIGHT eye', notes: null, frequency: '2x_daily', active: 1, conflict_group: 'rightEye', start_date: '2026-01-01' }
    )

    // Insert ORAL medications (no conflict group)
    await executeStatement(
      `INSERT INTO items (id, pet_id, type, category, name, dose, location, notes, frequency, active, conflict_group, start_date)
       VALUES (:id, :pet_id, :type, :category, :name, :dose, :location, :notes, :frequency, :active, :conflict_group, :start_date)`,
      { id: prednisoloneOralId, pet_id: petId, type: 'medication', category: 'oral', name: 'Prednisolone 5mg',
        dose: '1/4 tablet', location: 'ORAL', notes: null, frequency: '1x_daily', active: 1, conflict_group: null, start_date: '2026-01-01' }
    )

    await executeStatement(
      `INSERT INTO items (id, pet_id, type, category, name, dose, location, notes, frequency, active, conflict_group, start_date)
       VALUES (:id, :pet_id, :type, :category, :name, :dose, :location, :notes, :frequency, :active, :conflict_group, :start_date)`,
      { id: gabapentinId, pet_id: petId, type: 'medication', category: 'oral', name: 'Gabapentin 50mg',
        dose: '1 tablet', location: 'ORAL', notes: null, frequency: '12h', active: 1, conflict_group: null, start_date: '2026-01-01' }
    )

    // Insert Quick Log placeholder item (for quick log feature)
    await executeStatement(
      `INSERT INTO items (id, pet_id, type, category, name, dose, location, notes, frequency, active, conflict_group, start_date)
       VALUES (:id, :pet_id, :type, :category, :name, :dose, :location, :notes, :frequency, :active, :conflict_group, :start_date)`,
      { id: quickLogId, pet_id: petId, type: 'supplement', category: 'oral', name: 'Quick Log',
        dose: null, location: null, notes: 'Placeholder item for quick log entries', frequency: 'as_needed', active: 1, conflict_group: null, start_date: null }
    )

    // Create schedules - all at 08:00 for testing (current time-ish)
    const allItemIds = [ofloxacinId, atropineId, amnioticId, prednisoloneEyeId, tacrolimusId, prednisoloneOralId, gabapentinId]
    const scheduleIds: string[] = []

    for (const itemId of allItemIds) {
      const scheduleId = `schedule-${itemId}`
      scheduleIds.push(scheduleId)
      await executeStatement(
        `INSERT INTO item_schedules (id, item_id, time_slot, scheduled_time) VALUES (:id, :item_id, :time_slot, :scheduled_time)`,
        { id: scheduleId, item_id: itemId, time_slot: 'morning', scheduled_time: '08:00' }
      )
    }

    // Create today's instances - all pending at 08:00
    // Use local date (not UTC) to match frontend behavior
    const now = new Date()
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    for (let i = 0; i < allItemIds.length; i++) {
      await executeStatement(
        `INSERT INTO daily_instances (id, item_id, schedule_id, instance_date, scheduled_time, status, is_adhoc)
         VALUES (:id, :item_id, :schedule_id, :instanceDate, :scheduled_time, :status, :is_adhoc)`,
        {
          id: `instance-${allItemIds[i]}`,
          item_id: allItemIds[i],
          schedule_id: scheduleIds[i],
          instanceDate: today,
          scheduled_time: '08:00',
          status: 'pending',
          is_adhoc: 0
        }
      )
    }

    console.log('[Test Fixtures] Database reset complete')
    res.json({
      success: true,
      message: 'Database reset with test fixtures',
      data: {
        items: allItemIds.length,
        instances: allItemIds.length,
        date: today
      }
    })
  } catch (error) {
    console.error('[Test Fixtures] Reset failed:', error)
    next(error)
  }
})

/**
 * Get current test data state
 * GET /api/test-fixtures/status
 */
router.get('/status', async (req, res, next) => {
  if (!isTestEnabled) {
    return res.status(403).json({ error: 'Test fixtures not available in production' })
  }

  try {
    const itemCount = await executeQuery<CountResult>('SELECT COUNT(*) as CNT FROM items')
    const instanceCount = await executeQuery<CountResult>('SELECT COUNT(*) as CNT FROM daily_instances')
    const confirmedCount = await executeQuery<CountResult>(`SELECT COUNT(*) as CNT FROM daily_instances WHERE status = 'confirmed'`)

    res.json({
      items: itemCount[0].CNT,
      instances: instanceCount[0].CNT,
      confirmed: confirmedCount[0].CNT
    })
  } catch (error) {
    next(error)
  }
})

/**
 * Clear all confirmations (reset instances to pending)
 * POST /api/test-fixtures/clear-confirmations
 */
router.post('/clear-confirmations', async (req, res, next) => {
  if (!isTestEnabled) {
    return res.status(403).json({ error: 'Test fixtures not available in production' })
  }

  try {
    await executeStatement(
      `UPDATE daily_instances SET status = 'pending', confirmed_at = NULL, confirmed_by = NULL, snooze_until = NULL`
    )
    res.json({ success: true, message: 'All confirmations cleared' })
  } catch (error) {
    next(error)
  }
})

/**
 * Clear confirmations for items with a specific prefix only
 * POST /api/test-fixtures/clear-confirmations/:prefix
 */
router.post('/clear-confirmations/:prefix', async (req, res, next) => {
  if (!isTestEnabled) {
    return res.status(403).json({ error: 'Test fixtures not available in production' })
  }

  const { prefix } = req.params

  try {
    await executeStatement(
      `UPDATE daily_instances SET status = 'pending', confirmed_at = NULL, confirmed_by = NULL, snooze_until = NULL
       WHERE item_id LIKE :prefix`,
      { prefix: `test-item-${prefix}-%` }
    )
    res.json({ success: true, message: `Confirmations cleared for prefix: ${prefix}` })
  } catch (error) {
    next(error)
  }
})

/**
 * Create isolated test data with a unique prefix
 * POST /api/test-fixtures/create-isolated
 * Body: { prefix: string, includeConflictGroups?: boolean }
 *
 * Uses MERGE statements to handle race conditions when multiple workers
 * try to create data with the same prefix simultaneously.
 */
router.post('/create-isolated', async (req, res, next) => {
  if (!isTestEnabled) {
    return res.status(403).json({ error: 'Test fixtures not available in production' })
  }

  const { prefix, includeConflictGroups = true } = req.body

  if (!prefix || typeof prefix !== 'string') {
    return res.status(400).json({ error: 'prefix is required' })
  }

  try {
    const petId = 'test-pet-001' // Use existing pet
    const itemPrefix = `test-item-${prefix}`

    // Create isolated medications with prefix using MERGE to handle race conditions
    const ofloxacinId = `${itemPrefix}-ofloxacin`
    const atropineId = `${itemPrefix}-atropine`
    const amnioticId = `${itemPrefix}-amniotic`
    const prednisoloneEyeId = `${itemPrefix}-pred-eye`
    const tacrolimusId = `${itemPrefix}-tacrolimus`
    const gabapentinId = `${itemPrefix}-gabapentin`

    // LEFT eye medications (conflict_group with prefix)
    const leftEyeGroup = includeConflictGroups ? `${prefix}-leftEye` : null
    const rightEyeGroup = includeConflictGroups ? `${prefix}-rightEye` : null

    // Use MERGE to upsert items (handles race conditions)
    const mergeItemSql = `
      MERGE INTO items dest
      USING (SELECT :id as id FROM dual) src
      ON (dest.id = src.id)
      WHEN NOT MATCHED THEN
        INSERT (id, pet_id, type, category, name, dose, location, notes, frequency, active, conflict_group, start_date)
        VALUES (:id, :pet_id, :type, :category, :name, :dose, :location, :notes, :frequency, :active, :conflict_group, :start_date)`

    await executeStatement(mergeItemSql,
      { id: ofloxacinId, pet_id: petId, type: 'medication', category: 'leftEye', name: `${prefix}-Ofloxacin`,
        dose: '1 drop', location: 'LEFT eye', notes: null, frequency: '4x_daily', active: 1, conflict_group: leftEyeGroup, start_date: '2026-01-01' }
    )

    await executeStatement(mergeItemSql,
      { id: atropineId, pet_id: petId, type: 'medication', category: 'leftEye', name: `${prefix}-Atropine`,
        dose: '1 drop', location: 'LEFT eye', notes: 'May cause drooling', frequency: '2x_daily', active: 1, conflict_group: leftEyeGroup, start_date: '2026-01-01' }
    )

    await executeStatement(mergeItemSql,
      { id: amnioticId, pet_id: petId, type: 'medication', category: 'leftEye', name: `${prefix}-Amniotic`,
        dose: '1 drop', location: 'LEFT eye', notes: 'Refrigerated', frequency: '2x_daily', active: 1, conflict_group: leftEyeGroup, start_date: '2026-01-01' }
    )

    // RIGHT eye medications
    await executeStatement(mergeItemSql,
      { id: prednisoloneEyeId, pet_id: petId, type: 'medication', category: 'rightEye', name: `${prefix}-Prednisolone`,
        dose: '1 drop', location: 'RIGHT eye', notes: null, frequency: '2x_daily', active: 1, conflict_group: rightEyeGroup, start_date: '2026-01-01' }
    )

    await executeStatement(mergeItemSql,
      { id: tacrolimusId, pet_id: petId, type: 'medication', category: 'rightEye', name: `${prefix}-Tacrolimus`,
        dose: '1 drop', location: 'RIGHT eye', notes: null, frequency: '2x_daily', active: 1, conflict_group: rightEyeGroup, start_date: '2026-01-01' }
    )

    // ORAL medication (no conflict group)
    await executeStatement(mergeItemSql,
      { id: gabapentinId, pet_id: petId, type: 'medication', category: 'oral', name: `${prefix}-Gabapentin`,
        dose: '1 tablet', location: 'ORAL', notes: null, frequency: '12h', active: 1, conflict_group: null, start_date: '2026-01-01' }
    )

    // Create schedules and instances using MERGE
    const allItemIds = [ofloxacinId, atropineId, amnioticId, prednisoloneEyeId, tacrolimusId, gabapentinId]
    const scheduleIds: string[] = []

    const mergeScheduleSql = `
      MERGE INTO item_schedules dest
      USING (SELECT :item_id as item_id FROM dual) src
      ON (dest.item_id = src.item_id)
      WHEN MATCHED THEN
        UPDATE SET time_slot = :time_slot, scheduled_time = :scheduled_time
      WHEN NOT MATCHED THEN
        INSERT (id, item_id, time_slot, scheduled_time)
        VALUES (:id, :item_id, :time_slot, :scheduled_time)`

    for (const itemId of allItemIds) {
      const scheduleId = `schedule-${itemId}`
      scheduleIds.push(scheduleId)
      await executeStatement(mergeScheduleSql,
        { id: scheduleId, item_id: itemId, time_slot: 'morning', scheduled_time: '08:00' }
      )
    }

    // Create today's instances using MERGE
    const now = new Date()
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

    const mergeInstanceSql = `
      MERGE INTO daily_instances dest
      USING (SELECT :id as id FROM dual) src
      ON (dest.id = src.id)
      WHEN MATCHED THEN
        UPDATE SET status = 'pending', confirmed_at = NULL, confirmed_by = NULL, snooze_until = NULL
      WHEN NOT MATCHED THEN
        INSERT (id, item_id, schedule_id, instance_date, scheduled_time, status, is_adhoc)
        VALUES (:id, :item_id, :schedule_id, :instanceDate, :scheduled_time, :status, :is_adhoc)`

    for (let i = 0; i < allItemIds.length; i++) {
      await executeStatement(mergeInstanceSql,
        {
          id: `instance-${allItemIds[i]}`,
          item_id: allItemIds[i],
          schedule_id: scheduleIds[i],
          instanceDate: today,
          scheduled_time: '08:00',
          status: 'pending',
          is_adhoc: 0
        }
      )
    }

    res.json({
      success: true,
      message: `Isolated test data created with prefix '${prefix}'`,
      prefix,
      items: allItemIds.length,
      medications: {
        leftEye: [`${prefix}-Ofloxacin`, `${prefix}-Atropine`, `${prefix}-Amniotic`],
        rightEye: [`${prefix}-Prednisolone`, `${prefix}-Tacrolimus`],
        oral: [`${prefix}-Gabapentin`]
      }
    })
  } catch (error) {
    console.error(`[Test Fixtures] Create isolated failed for prefix '${prefix}':`, error)
    next(error)
  }
})

export default router
