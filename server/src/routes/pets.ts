import { Router } from 'express'
import { executeQuery, executeStatement } from '../db.js'
import { v4 as uuidv4 } from 'uuid'

const router = Router()

interface Pet {
  ID: string
  NAME: string
  BREED: string | null
  WEIGHT_KG: number | null
  NOTES: string | null
  CREATED_AT: Date
}

// Get all pets
router.get('/', async (_req, res, next) => {
  try {
    const pets = await executeQuery<Pet>(`SELECT * FROM pets ORDER BY name`)
    res.json(pets.map(p => ({
      id: p.ID,
      name: p.NAME,
      breed: p.BREED,
      weight_kg: p.WEIGHT_KG,
      notes: p.NOTES,
      created_at: p.CREATED_AT,
    })))
  } catch (error) {
    next(error)
  }
})

// Get pet by ID
router.get('/:id', async (req, res, next) => {
  try {
    const pets = await executeQuery<Pet>(
      `SELECT * FROM pets WHERE id = :id`,
      { id: req.params.id }
    )
    if (pets.length === 0) {
      return res.status(404).json({ error: 'Pet not found' })
    }
    const p = pets[0]
    res.json({
      id: p.ID,
      name: p.NAME,
      breed: p.BREED,
      weight_kg: p.WEIGHT_KG,
      notes: p.NOTES,
      created_at: p.CREATED_AT,
    })
  } catch (error) {
    next(error)
  }
})

// Create pet
router.post('/', async (req, res, next) => {
  try {
    const { name, breed, weight_kg, notes } = req.body
    const id = uuidv4()

    await executeStatement(
      `INSERT INTO pets (id, name, breed, weight_kg, notes)
       VALUES (:id, :name, :breed, :weight_kg, :notes)`,
      { id, name, breed: breed || null, weight_kg: weight_kg || null, notes: notes || null }
    )

    res.status(201).json({ id, name, breed, weight_kg, notes })
  } catch (error) {
    next(error)
  }
})

// Update pet
router.patch('/:id', async (req, res, next) => {
  try {
    const { name, breed, weight_kg, notes } = req.body
    const updates: string[] = []
    const binds: Record<string, unknown> = { id: req.params.id }

    if (name !== undefined) { updates.push('name = :name'); binds.name = name }
    if (breed !== undefined) { updates.push('breed = :breed'); binds.breed = breed }
    if (weight_kg !== undefined) { updates.push('weight_kg = :weight_kg'); binds.weight_kg = weight_kg }
    if (notes !== undefined) { updates.push('notes = :notes'); binds.notes = notes }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' })
    }

    await executeStatement(
      `UPDATE pets SET ${updates.join(', ')} WHERE id = :id`,
      binds
    )

    res.json({ success: true })
  } catch (error) {
    next(error)
  }
})

// Delete pet
router.delete('/:id', async (req, res, next) => {
  try {
    await executeStatement(`DELETE FROM pets WHERE id = :id`, { id: req.params.id })
    res.json({ success: true })
  } catch (error) {
    next(error)
  }
})

export default router
