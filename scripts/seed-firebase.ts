/**
 * Firebase Firestore Seed Script
 * Run with: npx tsx scripts/seed-firebase.ts
 *
 * Requires environment variables:
 * - FIREBASE_PROJECT_ID
 * - GOOGLE_APPLICATION_CREDENTIALS (path to service account JSON)
 */

import { initializeApp, cert, type ServiceAccount } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import * as fs from 'fs'
import * as path from 'path'

// Load service account
const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
if (!serviceAccountPath) {
  console.error('❌ GOOGLE_APPLICATION_CREDENTIALS environment variable not set')
  console.error('   Set it to the path of your Firebase service account JSON file')
  process.exit(1)
}

const serviceAccount = JSON.parse(
  fs.readFileSync(path.resolve(serviceAccountPath), 'utf-8')
) as ServiceAccount

// Initialize Firebase Admin
initializeApp({
  credential: cert(serviceAccount),
})

const db = getFirestore()

// ============================================
// Seed Data - Updated 2026-01-24
// ============================================

const ITEMS = [
  // === LEFT EYE MEDICATIONS ===
  {
    id: 'ofloxacin',
    pet_id: 'yuki',
    type: 'medication',
    category: 'leftEye',
    name: 'Ofloxacin 0.3%',
    dose: '1 drop',
    location: 'LEFT eye',
    notes: null,
    frequency: '4x_daily',
    active: true,
    start_date: '2026-01-12',
    end_date: null,
    conflict_group: 'leftEye',
    schedules: [
      { time_slot: 'morning', scheduled_time: '08:00' },
      { time_slot: 'midday', scheduled_time: '12:00' },
      { time_slot: 'evening', scheduled_time: '17:00' },
      { time_slot: 'night', scheduled_time: '21:00' },
    ],
  },
  {
    id: 'atropine',
    pet_id: 'yuki',
    type: 'medication',
    category: 'leftEye',
    name: 'Atropine 1%',
    dose: '1 drop',
    location: 'LEFT eye',
    notes: '⚠️ May cause drooling',
    frequency: '2x_daily',
    active: true,
    start_date: '2026-01-12',
    end_date: null,
    conflict_group: 'leftEye',
    schedules: [
      { time_slot: 'morning', scheduled_time: '08:00' },
      { time_slot: 'evening', scheduled_time: '20:00' },
    ],
  },
  {
    id: 'amniotic',
    pet_id: 'yuki',
    type: 'medication',
    category: 'leftEye',
    name: 'Amniotic eye drops',
    dose: '1 drop',
    location: 'LEFT eye',
    notes: '❄️ Refrigerated',
    frequency: '2x_daily',
    active: true,
    start_date: '2026-01-12',
    end_date: null,
    conflict_group: 'leftEye',
    schedules: [
      { time_slot: 'morning', scheduled_time: '08:00' },
      { time_slot: 'evening', scheduled_time: '20:00' },
    ],
  },
  {
    id: 'plasma',
    pet_id: 'yuki',
    type: 'medication',
    category: 'leftEye',
    name: 'Homologous plasma',
    dose: '1 drop',
    location: 'LEFT eye',
    notes: '❄️ Refrigerated',
    frequency: '4x_daily',
    active: false,
    start_date: '2026-01-12',
    end_date: '2026-01-19',
    conflict_group: 'leftEye',
    schedules: [
      { time_slot: 'morning', scheduled_time: '08:00' },
      { time_slot: 'midday', scheduled_time: '12:00' },
      { time_slot: 'evening', scheduled_time: '17:00' },
      { time_slot: 'night', scheduled_time: '21:00' },
    ],
  },

  // === RIGHT EYE MEDICATIONS ===
  {
    id: 'prednisolone-eye',
    pet_id: 'yuki',
    type: 'medication',
    category: 'rightEye',
    name: 'Prednisolone acetate 1%',
    dose: '1 drop',
    location: 'RIGHT eye',
    notes: '🛑 If squinting, STOP & call vet (650-551-1115)',
    frequency: '2x_daily',
    active: true,
    start_date: '2026-01-12',
    end_date: null,
    conflict_group: 'rightEye',
    schedules: [
      { time_slot: 'morning', scheduled_time: '08:00' },
      { time_slot: 'evening', scheduled_time: '20:00' },
    ],
  },
  {
    id: 'tacrolimus-cyclosporine',
    pet_id: 'yuki',
    type: 'medication',
    category: 'rightEye',
    name: 'Tacrolimus 0.03% + Cyclosporine 2%',
    dose: '1 drop',
    location: 'RIGHT eye',
    notes: '🧤 Wash hands after. 🔁 Lifelong med',
    frequency: '2x_daily',
    active: true,
    start_date: '2026-01-12',
    end_date: null,
    conflict_group: 'rightEye',
    schedules: [
      { time_slot: 'morning', scheduled_time: '08:00' },
      { time_slot: 'evening', scheduled_time: '20:00' },
    ],
  },

  // === ORAL MEDICATIONS ===
  {
    id: 'prednisolone-oral',
    pet_id: 'yuki',
    type: 'medication',
    category: 'oral',
    name: 'Prednisolone 5mg tablet',
    dose: '¼ tablet',
    location: 'ORAL',
    notes: '⚠️ Do NOT stop abruptly. May increase hunger/thirst/urination',
    frequency: '1x_daily',
    active: true,
    start_date: '2026-01-15',
    end_date: null,
    conflict_group: null,
    schedules: [
      { time_slot: 'morning', scheduled_time: '08:00' },
    ],
  },
  {
    id: 'amoxicillin',
    pet_id: 'yuki',
    type: 'medication',
    category: 'oral',
    name: 'Amoxicillin/Clavulanate liquid',
    dose: '1 mL',
    location: 'ORAL',
    notes: '🍽️ Give with food. ❄️ Refrigerate',
    frequency: '2x_daily',
    active: false,
    start_date: '2026-01-13',
    end_date: '2026-01-19',
    conflict_group: null,
    schedules: [
      { time_slot: 'morning', scheduled_time: '08:00' },
      { time_slot: 'evening', scheduled_time: '20:00' },
    ],
  },
  {
    id: 'gabapentin',
    pet_id: 'yuki',
    type: 'medication',
    category: 'oral',
    name: 'Gabapentin 50mg',
    dose: '1 tablet',
    location: 'ORAL',
    notes: '💊 For pain. May cause sedation',
    frequency: '2x_daily',
    active: false,
    start_date: '2026-01-12',
    end_date: '2026-01-22',
    conflict_group: null,
    schedules: [
      { time_slot: 'morning', scheduled_time: '08:00' },
      { time_slot: 'evening', scheduled_time: '20:00' },
    ],
  },

  // === FOOD ===
  {
    id: 'breakfast',
    pet_id: 'yuki',
    type: 'food',
    category: 'food',
    name: 'Breakfast',
    dose: null,
    location: null,
    notes: null,
    frequency: '1x_daily',
    active: true,
    start_date: null,
    end_date: null,
    conflict_group: null,
    schedules: [
      { time_slot: 'morning', scheduled_time: '07:30' },
    ],
  },
  {
    id: 'dinner',
    pet_id: 'yuki',
    type: 'food',
    category: 'food',
    name: 'Dinner',
    dose: null,
    location: null,
    notes: null,
    frequency: '1x_daily',
    active: true,
    start_date: null,
    end_date: null,
    conflict_group: null,
    schedules: [
      { time_slot: 'evening', scheduled_time: '18:00' },
    ],
  },
]

async function seedFirestore() {
  console.log('🔥 Seeding Firestore with medication data...\n')

  const batch = db.batch()
  const itemsRef = db.collection('items')

  // Check for existing items
  const existingSnapshot = await itemsRef.limit(1).get()
  if (!existingSnapshot.empty) {
    console.log('⚠️  Items collection already has data.')
    console.log('   To replace all items, run with --force flag')

    if (!process.argv.includes('--force')) {
      console.log('\n❌ Aborting. Use --force to overwrite existing data.')
      process.exit(1)
    }

    console.log('   --force flag detected, deleting existing items...')
    const allItems = await itemsRef.get()
    for (const doc of allItems.docs) {
      batch.delete(doc.ref)
    }
  }

  // Add new items
  for (const item of ITEMS) {
    const { id, ...data } = item
    const docRef = itemsRef.doc(id)
    batch.set(docRef, {
      ...data,
      created_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
    })
    console.log(`  ✓ ${item.name} (${item.category})`)
  }

  await batch.commit()

  console.log('\n✅ Firestore seeded successfully!')
  console.log(`   - ${ITEMS.length} items created`)
  console.log(`   - ${ITEMS.filter(i => i.active).length} active`)
  console.log(`   - ${ITEMS.filter(i => !i.active).length} inactive`)
}

seedFirestore()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error seeding Firestore:', error)
    process.exit(1)
  })
