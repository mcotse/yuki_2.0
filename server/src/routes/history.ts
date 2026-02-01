import { Router } from 'express'
import { executeQuery, executeStatement } from '../db.js'
import { v4 as uuidv4 } from 'uuid'
import { logger } from '../lib/logger.js'

const router = Router()

interface HistoryEntry {
  ID: string
  INSTANCE_ID: string
  VERSION: number
  CONFIRMED_AT: Date
  CONFIRMED_BY: string | null
  NOTES: string | null
  EDITED_AT: Date | null
  EDITED_BY: string | null
  PREVIOUS_VALUES: string | null
  CREATED_AT: Date
}

// Get history by instance ID
router.get('/instance/:instanceId', async (req, res, next) => {
  try {
    const history = await executeQuery<HistoryEntry>(
      `SELECT * FROM confirmation_history WHERE instance_id = :instance_id ORDER BY version DESC`,
      { instance_id: req.params.instanceId }
    )
    res.json(history.map(h => ({
      id: h.ID,
      instance_id: h.INSTANCE_ID,
      version: h.VERSION,
      confirmed_at: h.CONFIRMED_AT,
      confirmed_by: h.CONFIRMED_BY,
      notes: h.NOTES,
      edited_at: h.EDITED_AT,
      edited_by: h.EDITED_BY,
      previous_values: h.PREVIOUS_VALUES ? JSON.parse(h.PREVIOUS_VALUES) : null,
      created_at: h.CREATED_AT,
    })))
  } catch (error) {
    next(error)
  }
})

// Get all history (with optional date filter)
router.get('/', async (req, res, next) => {
  try {
    const { from, to, limit = 100 } = req.query
    let sql = `SELECT * FROM confirmation_history WHERE 1=1`
    const binds: Record<string, unknown> = {}

    if (from) {
      sql += ` AND confirmed_at >= TO_TIMESTAMP(:from_date, 'YYYY-MM-DD')`
      binds.from_date = from
    }
    if (to) {
      sql += ` AND confirmed_at <= TO_TIMESTAMP(:to_date, 'YYYY-MM-DD') + INTERVAL '1' DAY`
      binds.to_date = to
    }

    sql += ` ORDER BY confirmed_at DESC FETCH FIRST :limit ROWS ONLY`
    binds.limit = Number(limit)

    const history = await executeQuery<HistoryEntry>(sql, binds)
    res.json(history.map(h => ({
      id: h.ID,
      instance_id: h.INSTANCE_ID,
      version: h.VERSION,
      confirmed_at: h.CONFIRMED_AT,
      confirmed_by: h.CONFIRMED_BY,
      notes: h.NOTES,
      edited_at: h.EDITED_AT,
      edited_by: h.EDITED_BY,
      previous_values: h.PREVIOUS_VALUES ? JSON.parse(h.PREVIOUS_VALUES) : null,
      created_at: h.CREATED_AT,
    })))
  } catch (error) {
    next(error)
  }
})

// Create history entry
router.post('/', async (req, res, next) => {
  try {
    const { instance_id, confirmed_at, confirmed_by, notes, previous_values } = req.body
    const id = uuidv4()

    // Get next version number
    const versionResult = await executeQuery<{ MAX_VERSION: number }>(
      `SELECT COALESCE(MAX(version), 0) + 1 AS MAX_VERSION FROM confirmation_history WHERE instance_id = :instance_id`,
      { instance_id }
    )
    const version = versionResult[0]?.MAX_VERSION || 1

    await executeStatement(
      `INSERT INTO confirmation_history (id, instance_id, version, confirmed_at, confirmed_by, notes, previous_values)
       VALUES (:id, :instance_id, :version, TO_TIMESTAMP(:confirmed_at, 'YYYY-MM-DD"T"HH24:MI:SS.FF3"Z"'), :confirmed_by, :notes, :previous_values)`,
      {
        id, instance_id, version,
        confirmed_at,
        confirmed_by: confirmed_by || null,
        notes: notes || null,
        previous_values: previous_values ? JSON.stringify(previous_values) : null
      }
    )

    logger.info({
      event: 'history_entry_created',
      history_id: id,
      instance_id,
      version,
      confirmed_by: confirmed_by || null,
      request_id: req.id,
    })

    res.status(201).json({ id, instance_id, version, confirmed_at })
  } catch (error) {
    next(error)
  }
})

// Update history entry (for edits)
router.patch('/:id', async (req, res, next) => {
  try {
    const { edited_at, edited_by, notes, previous_values } = req.body
    const updates: string[] = []
    const binds: Record<string, unknown> = { id: req.params.id }

    if (edited_at !== undefined) {
      updates.push('edited_at = TO_TIMESTAMP(:edited_at, \'YYYY-MM-DD"T"HH24:MI:SS.FF3"Z"\')')
      binds.edited_at = edited_at
    }
    if (edited_by !== undefined) {
      updates.push('edited_by = :edited_by')
      binds.edited_by = edited_by
    }
    if (notes !== undefined) {
      updates.push('notes = :notes')
      binds.notes = notes
    }
    if (previous_values !== undefined) {
      updates.push('previous_values = :previous_values')
      binds.previous_values = JSON.stringify(previous_values)
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' })
    }

    await executeStatement(
      `UPDATE confirmation_history SET ${updates.join(', ')} WHERE id = :id`,
      binds
    )

    logger.info({
      event: 'confirmation_edited',
      history_id: req.params.id,
      edited_by: edited_by || null,
      changes: Object.keys(req.body).filter(k => k !== 'id'),
      request_id: req.id,
    })

    res.json({ success: true })
  } catch (error) {
    next(error)
  }
})

export default router
