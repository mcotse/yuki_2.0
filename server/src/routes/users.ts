import { Router } from 'express'
import { executeQuery, executeStatement } from '../db.js'
import { v4 as uuidv4 } from 'uuid'

const router = Router()

interface User {
  ID: string
  USERNAME: string
  PASSWORD_HASH: string
  DISPLAY_NAME: string
  ROLE: string
  CREATED_AT: Date
}

// Get all users
router.get('/', async (_req, res, next) => {
  try {
    const users = await executeQuery<User>(`
      SELECT id, username, display_name, role, created_at
      FROM users
      ORDER BY created_at DESC
    `)
    res.json(users.map(u => ({
      id: u.ID,
      username: u.USERNAME,
      display_name: u.DISPLAY_NAME,
      role: u.ROLE,
      created_at: u.CREATED_AT,
    })))
  } catch (error) {
    next(error)
  }
})

// Get user by ID
router.get('/:id', async (req, res, next) => {
  try {
    const users = await executeQuery<User>(
      `SELECT id, username, display_name, role, created_at FROM users WHERE id = :id`,
      { id: req.params.id }
    )
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' })
    }
    const u = users[0]
    res.json({
      id: u.ID,
      username: u.USERNAME,
      display_name: u.DISPLAY_NAME,
      role: u.ROLE,
      created_at: u.CREATED_AT,
    })
  } catch (error) {
    next(error)
  }
})

// Create user
router.post('/', async (req, res, next) => {
  try {
    const { username, password_hash, display_name, role = 'user' } = req.body
    const id = uuidv4()

    await executeStatement(
      `INSERT INTO users (id, username, password_hash, display_name, role)
       VALUES (:id, :username, :password_hash, :display_name, :role)`,
      { id, username, password_hash, display_name, role }
    )

    res.status(201).json({ id, username, display_name, role })
  } catch (error) {
    next(error)
  }
})

// Update user
router.patch('/:id', async (req, res, next) => {
  try {
    const { display_name, role } = req.body
    const updates: string[] = []
    const binds: Record<string, unknown> = { id: req.params.id }

    if (display_name !== undefined) {
      updates.push('display_name = :display_name')
      binds.display_name = display_name
    }
    if (role !== undefined) {
      updates.push('role = :role')
      binds.role = role
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' })
    }

    await executeStatement(
      `UPDATE users SET ${updates.join(', ')} WHERE id = :id`,
      binds
    )

    res.json({ success: true })
  } catch (error) {
    next(error)
  }
})

export default router
