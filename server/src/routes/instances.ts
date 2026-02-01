import { Router } from 'express'
import { executeQuery, executeStatement } from '../db.js'
import { v4 as uuidv4 } from 'uuid'
import { logger } from '../lib/logger.js'

const router = Router()

interface Instance {
  ID: string
  ITEM_ID: string
  SCHEDULE_ID: string | null
  INSTANCE_DATE: string
  SCHEDULED_TIME: string
  STATUS: string
  CONFIRMED_AT: Date | null
  CONFIRMED_BY: string | null
  SNOOZE_UNTIL: string | null
  NOTES: string | null
  IS_ADHOC: number
  CREATED_AT: Date
  UPDATED_AT: Date
}

// Get instances by date
router.get('/', async (req, res, next) => {
  try {
    const { date } = req.query
    let sql = `SELECT * FROM daily_instances`
    const binds: Record<string, unknown> = {}

    if (date) {
      sql += ` WHERE instance_date = :instanceDate`
      binds.instanceDate = date
    }
    sql += ` ORDER BY scheduled_time`

    const instances = await executeQuery<Instance>(sql, binds)
    res.json(instances.map(i => {
      // Combine date and time into ISO timestamp for frontend
      const scheduledTimeISO = `${i.INSTANCE_DATE}T${i.SCHEDULED_TIME}:00`
      return {
        id: i.ID,
        item_id: i.ITEM_ID,
        schedule_id: i.SCHEDULE_ID,
        date: i.INSTANCE_DATE,
        scheduled_time: scheduledTimeISO,
        status: i.STATUS,
        confirmed_at: i.CONFIRMED_AT,
        confirmed_by: i.CONFIRMED_BY,
        snooze_until: i.SNOOZE_UNTIL,
        notes: i.NOTES,
        is_adhoc: i.IS_ADHOC === 1,
        created_at: i.CREATED_AT,
        updated_at: i.UPDATED_AT,
      }
    }))
  } catch (error) {
    next(error)
  }
})

// Get instance by ID
router.get('/:id', async (req, res, next) => {
  try {
    const instances = await executeQuery<Instance>(
      `SELECT * FROM daily_instances WHERE id = :id`,
      { id: req.params.id }
    )
    if (instances.length === 0) {
      return res.status(404).json({ error: 'Instance not found' })
    }
    const i = instances[0]
    const scheduledTimeISO = `${i.INSTANCE_DATE}T${i.SCHEDULED_TIME}:00`
    res.json({
      id: i.ID,
      item_id: i.ITEM_ID,
      schedule_id: i.SCHEDULE_ID,
      date: i.INSTANCE_DATE,
      scheduled_time: scheduledTimeISO,
      status: i.STATUS,
      confirmed_at: i.CONFIRMED_AT,
      confirmed_by: i.CONFIRMED_BY,
      snooze_until: i.SNOOZE_UNTIL,
      notes: i.NOTES,
      is_adhoc: i.IS_ADHOC === 1,
      created_at: i.CREATED_AT,
      updated_at: i.UPDATED_AT,
    })
  } catch (error) {
    next(error)
  }
})

// Create instance
router.post('/', async (req, res, next) => {
  try {
    const {
      item_id, schedule_id, date, scheduled_time,
      status = 'pending', is_adhoc = false, notes,
      confirmed_at, confirmed_by
    } = req.body
    const id = uuidv4()
    const now = new Date().toISOString()

    // Extract just the time part (HH:MM) from ISO timestamp if needed
    let timeOnly = scheduled_time
    if (scheduled_time && scheduled_time.includes('T')) {
      const timePart = scheduled_time.split('T')[1]
      timeOnly = timePart ? timePart.substring(0, 5) : scheduled_time
    }

    // Build the SQL dynamically based on whether confirmed_at is provided
    let sql = `INSERT INTO daily_instances (id, item_id, schedule_id, instance_date, scheduled_time, status, is_adhoc, notes, created_at, updated_at`
    let values = `:id, :item_id, :schedule_id, :instanceDate, :scheduled_time, :status, :is_adhoc, :notes, TO_TIMESTAMP(:created_at, 'YYYY-MM-DD"T"HH24:MI:SS.FF3"Z"'), TO_TIMESTAMP(:updated_at, 'YYYY-MM-DD"T"HH24:MI:SS.FF3"Z"')`

    const binds: Record<string, unknown> = {
      id,
      item_id: item_id || null,
      schedule_id: schedule_id || null,
      instanceDate: date,
      scheduled_time: timeOnly,
      status,
      is_adhoc: is_adhoc ? 1 : 0,
      notes: notes || null,
      created_at: now,
      updated_at: now
    }

    if (confirmed_at) {
      sql += `, confirmed_at`
      values += `, CAST(FROM_TZ(TO_TIMESTAMP(:confirmed_at, 'YYYY-MM-DD"T"HH24:MI:SS.FF3"Z"'), 'UTC') AT TIME ZONE 'America/Los_Angeles' AS TIMESTAMP)`
      binds.confirmed_at = confirmed_at
    }

    if (confirmed_by) {
      sql += `, confirmed_by`
      values += `, :confirmed_by`
      binds.confirmed_by = confirmed_by
    }

    sql += `) VALUES (${values})`

    await executeStatement(sql, binds)

    if (confirmed_at && confirmed_by) {
      logger.info({
        event: 'medication_confirmed',
        instance_id: id,
        item_id,
        confirmed_by,
        confirmed_at,
        request_id: req.id,
      })
    }

    res.status(201).json({ id, item_id, date, scheduled_time: timeOnly, status, is_adhoc, notes })
  } catch (error) {
    next(error)
  }
})

// Update instance (confirm, snooze, etc.)
router.patch('/:id', async (req, res, next) => {
  try {
    const updates: string[] = ['updated_at = SYSTIMESTAMP']
    const binds: Record<string, unknown> = { id: req.params.id }

    if (req.body.status !== undefined) {
      updates.push('status = :status')
      binds.status = req.body.status
    }
    if (req.body.confirmed_at !== undefined) {
      // Parse UTC ISO string and convert to local timezone (PST/PDT)
      // FROM_TZ marks the timestamp as UTC, AT TIME ZONE converts to local,
      // CAST extracts as plain TIMESTAMP for storage
      updates.push("confirmed_at = CAST(FROM_TZ(TO_TIMESTAMP(:confirmed_at, 'YYYY-MM-DD\"T\"HH24:MI:SS.FF3\"Z\"'), 'UTC') AT TIME ZONE 'America/Los_Angeles' AS TIMESTAMP)")
      binds.confirmed_at = req.body.confirmed_at
    }
    if (req.body.confirmed_by !== undefined) {
      updates.push('confirmed_by = :confirmed_by')
      binds.confirmed_by = req.body.confirmed_by
    }
    if (req.body.snooze_until !== undefined) {
      updates.push('snooze_until = :snooze_until')
      binds.snooze_until = req.body.snooze_until
    }
    if (req.body.notes !== undefined) {
      updates.push('notes = :notes')
      binds.notes = req.body.notes
    }

    await executeStatement(
      `UPDATE daily_instances SET ${updates.join(', ')} WHERE id = :id`,
      binds
    )

    if (req.body.confirmed_at !== undefined && req.body.confirmed_by !== undefined) {
      logger.info({
        event: 'medication_confirmed',
        instance_id: req.params.id,
        confirmed_by: req.body.confirmed_by,
        confirmed_at: req.body.confirmed_at,
        request_id: req.id,
      })
    }

    res.json({ success: true })
  } catch (error) {
    next(error)
  }
})

// Delete instance
router.delete('/:id', async (req, res, next) => {
  try {
    await executeStatement(`DELETE FROM daily_instances WHERE id = :id`, { id: req.params.id })
    res.json({ success: true })
  } catch (error) {
    next(error)
  }
})

export default router
