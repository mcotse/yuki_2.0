import { Router } from 'express'
import { executeQuery, executeStatement } from '../db.js'
import { v4 as uuidv4 } from 'uuid'

const router = Router()

interface Item {
  ID: string
  PET_ID: string | null
  TYPE: string
  CATEGORY: string | null
  NAME: string
  DOSE: string | null
  LOCATION: string | null
  NOTES: string | null
  FREQUENCY: string
  ACTIVE: number
  START_DATE: string | null
  END_DATE: string | null
  CONFLICT_GROUP: string | null
  CREATED_AT: Date
  UPDATED_AT: Date
}

interface Schedule {
  ID: string
  ITEM_ID: string
  TIME_SLOT: string
  SCHEDULED_TIME: string
  CREATED_AT: Date
}

// Get all items with schedules
router.get('/', async (_req, res, next) => {
  try {
    const items = await executeQuery<Item>(`SELECT * FROM items ORDER BY name`)
    const schedules = await executeQuery<Schedule>(`SELECT * FROM item_schedules`)

    const schedulesByItem = new Map<string, Schedule[]>()
    for (const s of schedules) {
      const existing = schedulesByItem.get(s.ITEM_ID) || []
      existing.push(s)
      schedulesByItem.set(s.ITEM_ID, existing)
    }

    res.json(items.map(item => ({
      id: item.ID,
      pet_id: item.PET_ID,
      type: item.TYPE,
      category: item.CATEGORY,
      name: item.NAME,
      dose: item.DOSE,
      location: item.LOCATION,
      notes: item.NOTES,
      frequency: item.FREQUENCY,
      active: item.ACTIVE === 1,
      start_date: item.START_DATE,
      end_date: item.END_DATE,
      conflict_group: item.CONFLICT_GROUP,
      created_at: item.CREATED_AT,
      updated_at: item.UPDATED_AT,
      schedules: (schedulesByItem.get(item.ID) || []).map(s => ({
        id: s.ID,
        item_id: s.ITEM_ID,
        time_slot: s.TIME_SLOT,
        scheduled_time: s.SCHEDULED_TIME,
        created_at: s.CREATED_AT,
      })),
    })))
  } catch (error) {
    next(error)
  }
})

// Get item by ID
router.get('/:id', async (req, res, next) => {
  try {
    const items = await executeQuery<Item>(
      `SELECT * FROM items WHERE id = :id`,
      { id: req.params.id }
    )
    if (items.length === 0) {
      return res.status(404).json({ error: 'Item not found' })
    }

    const schedules = await executeQuery<Schedule>(
      `SELECT * FROM item_schedules WHERE item_id = :item_id`,
      { item_id: req.params.id }
    )

    const item = items[0]
    res.json({
      id: item.ID,
      pet_id: item.PET_ID,
      type: item.TYPE,
      category: item.CATEGORY,
      name: item.NAME,
      dose: item.DOSE,
      location: item.LOCATION,
      notes: item.NOTES,
      frequency: item.FREQUENCY,
      active: item.ACTIVE === 1,
      start_date: item.START_DATE,
      end_date: item.END_DATE,
      conflict_group: item.CONFLICT_GROUP,
      created_at: item.CREATED_AT,
      updated_at: item.UPDATED_AT,
      schedules: schedules.map(s => ({
        id: s.ID,
        item_id: s.ITEM_ID,
        time_slot: s.TIME_SLOT,
        scheduled_time: s.SCHEDULED_TIME,
        created_at: s.CREATED_AT,
      })),
    })
  } catch (error) {
    next(error)
  }
})

// Create item with schedules
router.post('/', async (req, res, next) => {
  try {
    const {
      pet_id, type, category, name, dose, location, notes,
      frequency, active = true, start_date, end_date, conflict_group,
      schedules = []
    } = req.body
    const id = uuidv4()
    const now = new Date().toISOString()

    await executeStatement(
      `INSERT INTO items (id, pet_id, type, category, name, dose, location, notes, frequency, active, start_date, end_date, conflict_group, created_at, updated_at)
       VALUES (:id, :pet_id, :type, :category, :name, :dose, :location, :notes, :frequency, :active, :start_date, :end_date, :conflict_group, TO_TIMESTAMP(:created_at, 'YYYY-MM-DD"T"HH24:MI:SS.FF3"Z"'), TO_TIMESTAMP(:updated_at, 'YYYY-MM-DD"T"HH24:MI:SS.FF3"Z"'))`,
      {
        id, pet_id: pet_id || null, type, category: category || null, name,
        dose: dose || null, location: location || null, notes: notes || null,
        frequency, active: active ? 1 : 0, start_date: start_date || null,
        end_date: end_date || null, conflict_group: conflict_group || null,
        created_at: now, updated_at: now
      }
    )

    // Create schedules
    const createdSchedules = []
    for (const schedule of schedules) {
      const scheduleId = uuidv4()
      await executeStatement(
        `INSERT INTO item_schedules (id, item_id, time_slot, scheduled_time)
         VALUES (:id, :item_id, :time_slot, :scheduled_time)`,
        { id: scheduleId, item_id: id, time_slot: schedule.time_slot, scheduled_time: schedule.scheduled_time }
      )
      createdSchedules.push({ id: scheduleId, item_id: id, ...schedule })
    }

    res.status(201).json({ id, name, type, schedules: createdSchedules })
  } catch (error) {
    next(error)
  }
})

// Update item
router.patch('/:id', async (req, res, next) => {
  try {
    const fields = ['pet_id', 'type', 'category', 'name', 'dose', 'location', 'notes', 'frequency', 'start_date', 'end_date', 'conflict_group']
    const updates: string[] = ['updated_at = SYSTIMESTAMP']
    const binds: Record<string, unknown> = { id: req.params.id }

    for (const field of fields) {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = :${field}`)
        binds[field] = req.body[field]
      }
    }

    if (req.body.active !== undefined) {
      updates.push('active = :active')
      binds.active = req.body.active ? 1 : 0
    }

    await executeStatement(
      `UPDATE items SET ${updates.join(', ')} WHERE id = :id`,
      binds
    )

    res.json({ success: true })
  } catch (error) {
    next(error)
  }
})

// Delete item
router.delete('/:id', async (req, res, next) => {
  try {
    await executeStatement(`DELETE FROM item_schedules WHERE item_id = :id`, { id: req.params.id })
    await executeStatement(`DELETE FROM items WHERE id = :id`, { id: req.params.id })
    res.json({ success: true })
  } catch (error) {
    next(error)
  }
})

export default router
