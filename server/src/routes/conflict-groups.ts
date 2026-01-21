import { Router } from 'express'
import { executeQuery, executeStatement } from '../db.js'
import { v4 as uuidv4 } from 'uuid'

const router = Router()

interface ConflictGroup {
  ID: string
  NAME: string
  SPACING_MINUTES: number
  CREATED_AT: Date
}

// Get all conflict groups
router.get('/', async (_req, res, next) => {
  try {
    const groups = await executeQuery<ConflictGroup>(`SELECT * FROM conflict_groups ORDER BY name`)
    res.json(groups.map(g => ({
      id: g.ID,
      name: g.NAME,
      spacing_minutes: g.SPACING_MINUTES,
      created_at: g.CREATED_AT,
    })))
  } catch (error) {
    next(error)
  }
})

// Get conflict group by ID
router.get('/:id', async (req, res, next) => {
  try {
    const groups = await executeQuery<ConflictGroup>(
      `SELECT * FROM conflict_groups WHERE id = :id`,
      { id: req.params.id }
    )
    if (groups.length === 0) {
      return res.status(404).json({ error: 'Conflict group not found' })
    }
    const g = groups[0]
    res.json({
      id: g.ID,
      name: g.NAME,
      spacing_minutes: g.SPACING_MINUTES,
      created_at: g.CREATED_AT,
    })
  } catch (error) {
    next(error)
  }
})

// Create conflict group
router.post('/', async (req, res, next) => {
  try {
    const { name, spacing_minutes = 30 } = req.body
    const id = uuidv4()

    await executeStatement(
      `INSERT INTO conflict_groups (id, name, spacing_minutes)
       VALUES (:id, :name, :spacing_minutes)`,
      { id, name, spacing_minutes }
    )

    res.status(201).json({ id, name, spacing_minutes })
  } catch (error) {
    next(error)
  }
})

// Update conflict group
router.patch('/:id', async (req, res, next) => {
  try {
    const { name, spacing_minutes } = req.body
    const updates: string[] = []
    const binds: Record<string, unknown> = { id: req.params.id }

    if (name !== undefined) {
      updates.push('name = :name')
      binds.name = name
    }
    if (spacing_minutes !== undefined) {
      updates.push('spacing_minutes = :spacing_minutes')
      binds.spacing_minutes = spacing_minutes
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' })
    }

    await executeStatement(
      `UPDATE conflict_groups SET ${updates.join(', ')} WHERE id = :id`,
      binds
    )

    res.json({ success: true })
  } catch (error) {
    next(error)
  }
})

// Delete conflict group
router.delete('/:id', async (req, res, next) => {
  try {
    await executeStatement(`DELETE FROM conflict_groups WHERE id = :id`, { id: req.params.id })
    res.json({ success: true })
  } catch (error) {
    next(error)
  }
})

export default router
