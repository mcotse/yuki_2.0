import { Router } from 'express'
import { executeQuery, executeStatement } from '../db.js'
import { v4 as uuidv4 } from 'uuid'

const router = Router()

interface Schedule {
  ID: string
  ITEM_ID: string
  TIME_SLOT: string
  SCHEDULED_TIME: string
  CREATED_AT: Date
}

// Get all schedules
router.get('/', async (_req, res, next) => {
  try {
    const schedules = await executeQuery<Schedule>(`SELECT * FROM item_schedules ORDER BY scheduled_time`)
    res.json(schedules.map(s => ({
      id: s.ID,
      item_id: s.ITEM_ID,
      time_slot: s.TIME_SLOT,
      scheduled_time: s.SCHEDULED_TIME,
      created_at: s.CREATED_AT,
    })))
  } catch (error) {
    next(error)
  }
})

// Get schedules by item ID
router.get('/item/:itemId', async (req, res, next) => {
  try {
    const schedules = await executeQuery<Schedule>(
      `SELECT * FROM item_schedules WHERE item_id = :item_id ORDER BY scheduled_time`,
      { item_id: req.params.itemId }
    )
    res.json(schedules.map(s => ({
      id: s.ID,
      item_id: s.ITEM_ID,
      time_slot: s.TIME_SLOT,
      scheduled_time: s.SCHEDULED_TIME,
      created_at: s.CREATED_AT,
    })))
  } catch (error) {
    next(error)
  }
})

// Create schedule
router.post('/', async (req, res, next) => {
  try {
    const { item_id, time_slot, scheduled_time } = req.body
    const id = uuidv4()

    await executeStatement(
      `INSERT INTO item_schedules (id, item_id, time_slot, scheduled_time)
       VALUES (:id, :item_id, :time_slot, :scheduled_time)`,
      { id, item_id, time_slot, scheduled_time }
    )

    res.status(201).json({ id, item_id, time_slot, scheduled_time })
  } catch (error) {
    next(error)
  }
})

// Delete schedule
router.delete('/:id', async (req, res, next) => {
  try {
    await executeStatement(`DELETE FROM item_schedules WHERE id = :id`, { id: req.params.id })
    res.json({ success: true })
  } catch (error) {
    next(error)
  }
})

export default router
