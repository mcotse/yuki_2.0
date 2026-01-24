<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useItemsStore } from '@/stores/items'
import { useAuth } from '@/composables/useAuth'
import type { ItemWithSchedules, ItemType, ItemCategory, ItemFrequency } from '@/types'
import type { Database } from '@/types/database'
import {
  ArrowLeft,
  Plus,
  Eye,
  Pill,
  Utensils,
  Edit2,
  Archive,
  RotateCcw,
  RefreshCw,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-vue-next'

type ItemInsert = Database['public']['Tables']['items']['Insert']

const router = useRouter()
const itemsStore = useItemsStore()
const { canManageMedications } = useAuth()

// State
const showArchived = ref(false)
const showModal = ref(false)
const editingItem = ref<ItemWithSchedules | null>(null)
const isSaving = ref(false)
const expandedItems = ref<Set<string>>(new Set())

// Form state
const formData = ref({
  name: '',
  type: 'medication' as ItemType,
  category: 'oral' as ItemCategory | null,
  location: 'ORAL' as string | null,
  dose: '',
  frequency: '1x_daily' as ItemFrequency,
  notes: '',
  conflict_group: '',
  schedules: [{ time_slot: 'morning', scheduled_time: '08:00' }] as Array<{ time_slot: string; scheduled_time: string }>,
})

// Computed
const activeItems = computed(() => itemsStore.items.filter(i => i.active))
const archivedItems = computed(() => itemsStore.items.filter(i => !i.active))

const itemsByType = computed(() => {
  const items = showArchived.value ? archivedItems.value : activeItems.value
  return {
    medication: items.filter(i => i.type === 'medication'),
    supplement: items.filter(i => i.type === 'supplement'),
    food: items.filter(i => i.type === 'food'),
  }
})

const frequencyOptions: Array<{ value: ItemFrequency; label: string }> = [
  { value: '1x_daily', label: 'Once daily' },
  { value: '2x_daily', label: 'Twice daily' },
  { value: '4x_daily', label: '4 times daily' },
  { value: '12h', label: 'Every 12 hours' },
  { value: 'as_needed', label: 'As needed' },
]

const locationOptions = [
  { value: 'LEFT eye', label: 'Left Eye', category: 'leftEye' },
  { value: 'RIGHT eye', label: 'Right Eye', category: 'rightEye' },
  { value: 'ORAL', label: 'Oral', category: 'oral' },
]

const typeOptions: Array<{ value: ItemType; label: string }> = [
  { value: 'medication', label: 'Medication' },
  { value: 'supplement', label: 'Supplement' },
  { value: 'food', label: 'Food' },
]

// Functions
function goBack() {
  router.push('/settings')
}

function toggleExpanded(id: string) {
  if (expandedItems.value.has(id)) {
    expandedItems.value.delete(id)
  } else {
    expandedItems.value.add(id)
  }
}

function getIcon(item: ItemWithSchedules) {
  if (item.category === 'leftEye' || item.category === 'rightEye') return Eye
  if (item.type === 'medication' || item.type === 'supplement') return Pill
  return Utensils
}

function getIconColor(item: ItemWithSchedules) {
  if (item.category === 'leftEye') return 'bg-accent/20 text-accent'
  if (item.category === 'rightEye') return 'bg-secondary/20 text-secondary'
  if (item.type === 'food') return 'bg-tertiary/20 text-tertiary'
  return 'bg-quaternary/20 text-quaternary'
}

function getFrequencyLabel(freq: string) {
  const option = frequencyOptions.find(o => o.value === freq)
  return option?.label ?? freq
}

function openAddModal() {
  editingItem.value = null
  formData.value = {
    name: '',
    type: 'medication',
    category: 'oral',
    location: 'ORAL',
    dose: '',
    frequency: '1x_daily',
    notes: '',
    conflict_group: '',
    schedules: [{ time_slot: 'morning', scheduled_time: '08:00' }],
  }
  showModal.value = true
}

function openEditModal(item: ItemWithSchedules) {
  editingItem.value = item
  formData.value = {
    name: item.name,
    type: item.type,
    category: (item.category as ItemCategory) ?? 'oral',
    location: item.location,
    dose: item.dose ?? '',
    frequency: (item.frequency as ItemFrequency) ?? '1x_daily',
    notes: item.notes ?? '',
    conflict_group: item.conflict_group ?? '',
    schedules: item.schedules.length > 0
      ? item.schedules.map(s => ({ time_slot: s.time_slot, scheduled_time: s.scheduled_time.substring(0, 5) }))
      : [{ time_slot: 'morning', scheduled_time: '08:00' }],
  }
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  editingItem.value = null
}

function updateLocationFromCategory() {
  const loc = locationOptions.find(o => o.category === formData.value.category)
  if (loc) {
    formData.value.location = loc.value
  }
}

function addSchedule() {
  formData.value.schedules.push({ time_slot: 'custom', scheduled_time: '12:00' })
}

function removeSchedule(index: number) {
  if (formData.value.schedules.length > 1) {
    formData.value.schedules.splice(index, 1)
  }
}

async function saveItem() {
  if (!formData.value.name.trim()) return

  isSaving.value = true
  try {
    if (editingItem.value) {
      // Update existing item
      await itemsStore.updateItem(editingItem.value.id, {
        name: formData.value.name,
        type: formData.value.type,
        category: formData.value.category,
        location: formData.value.location,
        dose: formData.value.dose || null,
        frequency: formData.value.frequency,
        notes: formData.value.notes || null,
        conflict_group: formData.value.conflict_group || null,
      })
    } else {
      // Create new item
      const itemData: ItemInsert = {
        name: formData.value.name,
        type: formData.value.type,
        category: formData.value.category,
        location: formData.value.location,
        dose: formData.value.dose || null,
        frequency: formData.value.frequency,
        notes: formData.value.notes || null,
        conflict_group: formData.value.conflict_group || null,
        active: true,
      }
      await itemsStore.createItem(itemData, formData.value.schedules)
    }

    closeModal()
    await itemsStore.fetchItems()
  } finally {
    isSaving.value = false
  }
}

async function toggleActive(item: ItemWithSchedules) {
  if (item.active) {
    await itemsStore.deactivateItem(item.id)
  } else {
    await itemsStore.reactivateItem(item.id)
  }
}

onMounted(async () => {
  // Redirect if not admin
  if (!canManageMedications()) {
    router.push('/settings')
    return
  }

  if (itemsStore.items.length === 0) {
    await itemsStore.fetchItems()
  }
})
</script>

<template>
  <main class="p-6 pb-24 max-w-lg mx-auto">
    <!-- Header -->
    <div class="flex items-center gap-4 mb-6">
      <button
        class="p-2 rounded-xl hover:bg-muted/50 transition-colors"
        @click="goBack"
      >
        <ArrowLeft class="w-5 h-5 text-foreground" />
      </button>
      <h1 class="text-2xl font-bold text-foreground flex-1">Manage Medications</h1>
      <button
        class="btn btn-primary py-2 px-3"
        @click="openAddModal"
      >
        <Plus class="w-5 h-5" />
      </button>
    </div>

    <!-- Toggle Active/Archived -->
    <div class="flex gap-2 mb-6">
      <button
        class="flex-1 py-2 px-4 rounded-xl font-medium transition-colors"
        :class="!showArchived ? 'bg-accent text-white' : 'bg-muted text-muted-foreground'"
        @click="showArchived = false"
      >
        Active ({{ activeItems.length }})
      </button>
      <button
        class="flex-1 py-2 px-4 rounded-xl font-medium transition-colors"
        :class="showArchived ? 'bg-accent text-white' : 'bg-muted text-muted-foreground'"
        @click="showArchived = true"
      >
        Archived ({{ archivedItems.length }})
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="itemsStore.isLoading" class="py-12 text-center">
      <RefreshCw class="w-8 h-8 mx-auto text-accent animate-spin mb-4" />
      <p class="text-muted-foreground">Loading medications...</p>
    </div>

    <!-- Medication Lists -->
    <div v-else class="space-y-6">
      <!-- Medications -->
      <section v-if="itemsByType.medication.length > 0">
        <h2 class="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3">
          Medications
        </h2>
        <div class="space-y-2">
          <div
            v-for="item in itemsByType.medication"
            :key="item.id"
            class="card overflow-hidden"
          >
            <div class="flex items-center gap-3 p-4">
              <div
                class="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                :class="getIconColor(item)"
              >
                <component :is="getIcon(item)" class="w-5 h-5" />
              </div>
              <div class="flex-1 min-w-0" @click="toggleExpanded(item.id)">
                <h3 class="font-semibold text-foreground truncate">{{ item.name }}</h3>
                <p class="text-sm text-muted-foreground">
                  {{ item.location }} · {{ getFrequencyLabel(item.frequency) }}
                </p>
              </div>
              <div class="flex items-center gap-1">
                <button
                  class="p-2 rounded-lg hover:bg-muted/50 transition-colors"
                  @click="openEditModal(item)"
                >
                  <Edit2 class="w-4 h-4 text-muted-foreground" />
                </button>
                <button
                  class="p-2 rounded-lg hover:bg-muted/50 transition-colors"
                  @click="toggleActive(item)"
                  :title="item.active ? 'Archive' : 'Restore'"
                >
                  <Archive v-if="item.active" class="w-4 h-4 text-muted-foreground" />
                  <RotateCcw v-else class="w-4 h-4 text-accent" />
                </button>
                <button
                  class="p-2 rounded-lg hover:bg-muted/50 transition-colors"
                  @click="toggleExpanded(item.id)"
                >
                  <ChevronDown v-if="!expandedItems.has(item.id)" class="w-4 h-4 text-muted-foreground" />
                  <ChevronUp v-else class="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            </div>
            <!-- Expanded Details -->
            <div v-if="expandedItems.has(item.id)" class="px-4 pb-4 pt-0 border-t border-muted">
              <div class="pt-3 space-y-2 text-sm">
                <div v-if="item.dose" class="flex justify-between">
                  <span class="text-muted-foreground">Dose</span>
                  <span class="text-foreground">{{ item.dose }}</span>
                </div>
                <div v-if="item.schedules.length > 0" class="flex justify-between">
                  <span class="text-muted-foreground">Schedule</span>
                  <span class="text-foreground">
                    {{ item.schedules.map(s => s.scheduled_time.substring(0, 5)).join(', ') }}
                  </span>
                </div>
                <div v-if="item.conflict_group" class="flex justify-between">
                  <span class="text-muted-foreground">Conflict Group</span>
                  <span class="text-foreground">{{ item.conflict_group }}</span>
                </div>
                <div v-if="item.notes" class="pt-2">
                  <span class="text-muted-foreground">Notes:</span>
                  <p class="text-foreground mt-1">{{ item.notes }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Supplements -->
      <section v-if="itemsByType.supplement.length > 0">
        <h2 class="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3">
          Supplements
        </h2>
        <div class="space-y-2">
          <div
            v-for="item in itemsByType.supplement"
            :key="item.id"
            class="card overflow-hidden"
          >
            <div class="flex items-center gap-3 p-4">
              <div
                class="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                :class="getIconColor(item)"
              >
                <component :is="getIcon(item)" class="w-5 h-5" />
              </div>
              <div class="flex-1 min-w-0">
                <h3 class="font-semibold text-foreground truncate">{{ item.name }}</h3>
                <p class="text-sm text-muted-foreground">
                  {{ getFrequencyLabel(item.frequency) }}
                </p>
              </div>
              <div class="flex items-center gap-1">
                <button
                  class="p-2 rounded-lg hover:bg-muted/50 transition-colors"
                  @click="openEditModal(item)"
                >
                  <Edit2 class="w-4 h-4 text-muted-foreground" />
                </button>
                <button
                  class="p-2 rounded-lg hover:bg-muted/50 transition-colors"
                  @click="toggleActive(item)"
                >
                  <Archive v-if="item.active" class="w-4 h-4 text-muted-foreground" />
                  <RotateCcw v-else class="w-4 h-4 text-accent" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Food -->
      <section v-if="itemsByType.food.length > 0">
        <h2 class="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3">
          Food
        </h2>
        <div class="space-y-2">
          <div
            v-for="item in itemsByType.food"
            :key="item.id"
            class="card overflow-hidden"
          >
            <div class="flex items-center gap-3 p-4">
              <div
                class="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                :class="getIconColor(item)"
              >
                <component :is="getIcon(item)" class="w-5 h-5" />
              </div>
              <div class="flex-1 min-w-0">
                <h3 class="font-semibold text-foreground truncate">{{ item.name }}</h3>
                <p class="text-sm text-muted-foreground">
                  {{ getFrequencyLabel(item.frequency) }}
                </p>
              </div>
              <div class="flex items-center gap-1">
                <button
                  class="p-2 rounded-lg hover:bg-muted/50 transition-colors"
                  @click="openEditModal(item)"
                >
                  <Edit2 class="w-4 h-4 text-muted-foreground" />
                </button>
                <button
                  class="p-2 rounded-lg hover:bg-muted/50 transition-colors"
                  @click="toggleActive(item)"
                >
                  <Archive v-if="item.active" class="w-4 h-4 text-muted-foreground" />
                  <RotateCcw v-else class="w-4 h-4 text-accent" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Empty State -->
      <div
        v-if="(showArchived ? archivedItems : activeItems).length === 0"
        class="py-12 text-center"
      >
        <div class="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
          <Pill class="w-8 h-8 text-muted-foreground" />
        </div>
        <h2 class="text-lg font-semibold text-foreground mb-2">
          {{ showArchived ? 'No archived items' : 'No active items' }}
        </h2>
        <p class="text-muted-foreground mb-4">
          {{ showArchived ? 'Archived medications will appear here.' : 'Add a medication to get started.' }}
        </p>
        <button
          v-if="!showArchived"
          class="btn btn-primary"
          @click="openAddModal"
        >
          <Plus class="w-5 h-5 mr-2" />
          Add Medication
        </button>
      </div>
    </div>

    <!-- Add/Edit Modal -->
    <Teleport to="body">
      <div
        v-if="showModal"
        class="fixed inset-0 bg-black/50 flex items-end justify-center z-50"
        @click.self="closeModal"
      >
        <div class="bg-card rounded-t-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-xl font-bold text-foreground">
              {{ editingItem ? 'Edit Medication' : 'Add Medication' }}
            </h2>
            <button
              class="p-2 rounded-lg hover:bg-muted/50 transition-colors"
              @click="closeModal"
            >
              <X class="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          <form @submit.prevent="saveItem" class="space-y-4">
            <!-- Name -->
            <div>
              <label class="block text-sm font-medium text-muted-foreground mb-1">
                Name *
              </label>
              <input
                v-model="formData.name"
                type="text"
                required
                placeholder="e.g., Cyclosporine"
                class="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>

            <!-- Type -->
            <div>
              <label class="block text-sm font-medium text-muted-foreground mb-1">
                Type
              </label>
              <select
                v-model="formData.type"
                class="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option v-for="opt in typeOptions" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
            </div>

            <!-- Location (for medications) -->
            <div v-if="formData.type === 'medication'">
              <label class="block text-sm font-medium text-muted-foreground mb-1">
                Location
              </label>
              <select
                v-model="formData.category"
                @change="updateLocationFromCategory"
                class="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option v-for="opt in locationOptions" :key="opt.value" :value="opt.category">
                  {{ opt.label }}
                </option>
              </select>
            </div>

            <!-- Dose -->
            <div>
              <label class="block text-sm font-medium text-muted-foreground mb-1">
                Dose
              </label>
              <input
                v-model="formData.dose"
                type="text"
                placeholder="e.g., 1 drop, 2 capsules"
                class="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>

            <!-- Frequency -->
            <div>
              <label class="block text-sm font-medium text-muted-foreground mb-1">
                Frequency
              </label>
              <select
                v-model="formData.frequency"
                class="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option v-for="opt in frequencyOptions" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
            </div>

            <!-- Schedules -->
            <div>
              <div class="flex items-center justify-between mb-2">
                <label class="text-sm font-medium text-muted-foreground">
                  Schedule Times
                </label>
                <button
                  type="button"
                  class="text-sm text-accent hover:underline"
                  @click="addSchedule"
                >
                  + Add time
                </button>
              </div>
              <div class="space-y-2">
                <div
                  v-for="(schedule, index) in formData.schedules"
                  :key="index"
                  class="flex items-center gap-2"
                >
                  <input
                    v-model="schedule.scheduled_time"
                    type="time"
                    class="flex-1 px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                  <button
                    v-if="formData.schedules.length > 1"
                    type="button"
                    class="p-2 rounded-lg hover:bg-error/10 text-error transition-colors"
                    @click="removeSchedule(index)"
                  >
                    <X class="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            <!-- Conflict Group -->
            <div>
              <label class="block text-sm font-medium text-muted-foreground mb-1">
                Conflict Group
              </label>
              <input
                v-model="formData.conflict_group"
                type="text"
                placeholder="e.g., eye-drops"
                class="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
              />
              <p class="text-xs text-muted-foreground mt-1">
                Items in the same group require 5-minute spacing
              </p>
            </div>

            <!-- Notes -->
            <div>
              <label class="block text-sm font-medium text-muted-foreground mb-1">
                Notes
              </label>
              <textarea
                v-model="formData.notes"
                rows="2"
                placeholder="Any special instructions..."
                class="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent resize-none"
              />
            </div>

            <!-- Actions -->
            <div class="flex gap-3 pt-4">
              <button
                type="button"
                class="flex-1 px-4 py-3 rounded-xl border border-border text-foreground hover:bg-muted/50 transition-colors"
                :disabled="isSaving"
                @click="closeModal"
              >
                Cancel
              </button>
              <button
                type="submit"
                class="flex-1 px-4 py-3 rounded-xl bg-accent text-white font-medium hover:bg-accent/90 transition-colors disabled:opacity-50"
                :disabled="isSaving || !formData.name.trim()"
              >
                <RefreshCw v-if="isSaving" class="w-5 h-5 animate-spin mx-auto" />
                <span v-else>{{ editingItem ? 'Save Changes' : 'Add Medication' }}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </main>
</template>
