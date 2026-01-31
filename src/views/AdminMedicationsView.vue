<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useItemsStore } from '@/stores/items'
import { useAuthStore } from '@/stores/auth'
import type { ItemWithSchedules, ItemCategory, ItemType, ItemFrequency } from '@/types'
import {
  ArrowLeft,
  Plus,
  Edit2,
  Trash2,
  Droplet,
  Pill,
  Utensils,
  Leaf,
  RefreshCw,
  X,
  Check,
  RotateCcw,
} from 'lucide-vue-next'

const router = useRouter()
const itemsStore = useItemsStore()
const authStore = useAuthStore()

// Redirect if not admin
if (!authStore.isAdmin) {
  router.push('/settings')
}

// State
const showAddModal = ref(false)
const editingItem = ref<ItemWithSchedules | null>(null)
const showInactive = ref(false)
const isSaving = ref(false)
const filterType = ref<ItemType | 'all'>('all')

// Form state
const formName = ref('')
const formType = ref<ItemType>('medication')
const formCategory = ref<ItemCategory>('oral')
const formDose = ref('')
const formFrequency = ref<ItemFrequency>('1x_daily')
const formConflictGroup = ref('')
const formNotes = ref('')

// Computed
const filteredItems = computed(() => {
  let result = showInactive.value
    ? itemsStore.items
    : itemsStore.activeItems

  if (filterType.value !== 'all') {
    result = result.filter(item => item.type === filterType.value)
  }

  return result.sort((a, b) => a.name.localeCompare(b.name))
})

const activeCount = computed(() => itemsStore.activeItems.length)
const inactiveCount = computed(() => itemsStore.items.length - itemsStore.activeItems.length)

// Methods - Icon system (consistent with MedicationCard and HistoryView)
function getIcon(item: ItemWithSchedules) {
  const category = item.category
  const type = item.type

  if (category === 'leftEye' || category === 'rightEye') return Droplet
  if (type === 'supplement') return Leaf
  if (type === 'food' || category === 'food') return Utensils
  return Pill
}

function getIconBgClass(item: ItemWithSchedules) {
  const category = item.category
  const type = item.type

  if (category === 'leftEye') return 'bg-accent/20'
  if (category === 'rightEye') return 'bg-secondary/20'
  if (type === 'supplement') return 'bg-emerald-500/20'
  if (type === 'food' || category === 'food') return 'bg-amber-500/20'
  if (category === 'oral') return 'bg-blue-500/20'
  return 'bg-muted/50'
}

function getIconColorClass(item: ItemWithSchedules) {
  const category = item.category
  const type = item.type

  if (category === 'leftEye') return 'text-accent'
  if (category === 'rightEye') return 'text-secondary'
  if (type === 'supplement') return 'text-emerald-600'
  if (type === 'food' || category === 'food') return 'text-amber-600'
  if (category === 'oral') return 'text-blue-600'
  return 'text-muted-foreground'
}

function getLocationLabel(category: string | null) {
  if (category === 'leftEye') return 'Left Eye'
  if (category === 'rightEye') return 'Right Eye'
  if (category === 'oral') return 'Oral'
  if (category === 'food') return 'Food'
  return ''
}

function getFrequencyLabel(freq: string | null) {
  const labels: Record<string, string> = {
    '1x_daily': 'Once daily',
    '2x_daily': 'Twice daily',
    '4x_daily': '4x daily',
    '12h': 'Every 12 hours',
    'as_needed': 'As needed',
  }
  return labels[freq ?? ''] ?? freq
}

function openAddModal() {
  resetForm()
  editingItem.value = null
  showAddModal.value = true
}

function openEditModal(item: ItemWithSchedules) {
  editingItem.value = item
  formName.value = item.name
  formType.value = item.type as ItemType
  formCategory.value = (item.category as ItemCategory) ?? 'oral'
  formDose.value = item.dose ?? ''
  formFrequency.value = (item.frequency as ItemFrequency) ?? '1x_daily'
  formConflictGroup.value = item.conflict_group ?? ''
  formNotes.value = item.notes ?? ''
  showAddModal.value = true
}

function closeModal() {
  showAddModal.value = false
  editingItem.value = null
  resetForm()
}

function resetForm() {
  formName.value = ''
  formType.value = 'medication'
  formCategory.value = 'oral'
  formDose.value = ''
  formFrequency.value = '1x_daily'
  formConflictGroup.value = ''
  formNotes.value = ''
}

// Compute location from category
function getLocationFromCategory(category: ItemCategory): string | null {
  if (category === 'leftEye') return 'LEFT eye'
  if (category === 'rightEye') return 'RIGHT eye'
  if (category === 'oral') return 'ORAL'
  return null
}

async function saveItem() {
  if (!formName.value.trim()) return

  isSaving.value = true
  try {
    const itemData = {
      name: formName.value.trim(),
      type: formType.value,
      category: formCategory.value,
      location: getLocationFromCategory(formCategory.value),
      dose: formDose.value.trim() || null,
      frequency: formFrequency.value,
      conflict_group: formConflictGroup.value.trim() || null,
      notes: formNotes.value.trim() || null,
      active: true,
    }

    if (editingItem.value) {
      // Update existing item
      await itemsStore.updateItem(editingItem.value.id, itemData)
    } else {
      // Create new item
      await itemsStore.createItem(itemData)
    }

    closeModal()
  } finally {
    isSaving.value = false
  }
}

async function toggleItemActive(item: ItemWithSchedules) {
  if (item.active) {
    await itemsStore.deactivateItem(item.id)
  } else {
    await itemsStore.reactivateItem(item.id)
  }
}

onMounted(() => {
  itemsStore.fetchItems()
})
</script>

<template>
  <main class="p-6 pb-24 max-w-lg mx-auto">
    <!-- Header -->
    <div class="flex items-center gap-4 mb-6">
      <button
        class="p-2 rounded-xl hover:bg-muted/50 transition-colors"
        @click="router.push('/settings')"
      >
        <ArrowLeft class="w-5 h-5 text-foreground" />
      </button>
      <div class="flex-1">
        <h1 class="text-2xl font-bold text-foreground">Manage Reminders</h1>
        <p class="text-sm text-muted-foreground">
          {{ activeCount }} active, {{ inactiveCount }} inactive
        </p>
      </div>
      <button
        class="btn btn-primary py-2 px-4"
        @click="openAddModal"
      >
        <Plus class="w-4 h-4" />
        <span>Add</span>
      </button>
    </div>

    <!-- Filters -->
    <div class="flex items-center gap-3 mb-6">
      <select
        v-model="filterType"
        class="px-3 py-2 rounded-xl border border-border bg-background text-foreground text-sm"
      >
        <option value="all">All types</option>
        <option value="medication">Medications</option>
        <option value="food">Food</option>
        <option value="supplement">Supplements</option>
      </select>

      <label class="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
        <input
          v-model="showInactive"
          type="checkbox"
          class="w-4 h-4 rounded border-border"
        />
        Show inactive
      </label>
    </div>

    <!-- Loading State -->
    <div v-if="itemsStore.isLoading" class="py-12 text-center">
      <RefreshCw class="w-8 h-8 mx-auto text-accent animate-spin mb-4" />
      <p class="text-muted-foreground">Loading items...</p>
    </div>

    <!-- Items List -->
    <div v-else-if="filteredItems.length > 0" class="space-y-3">
      <div
        v-for="item in filteredItems"
        :key="item.id"
        class="card p-4"
        :class="{ 'opacity-50': !item.active }"
      >
        <div class="flex items-start gap-3">
          <!-- Icon -->
          <div
            class="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            :class="getIconBgClass(item)"
          >
            <component :is="getIcon(item)" class="w-5 h-5" :class="getIconColorClass(item)" />
          </div>

          <!-- Content -->
          <div class="flex-1 min-w-0">
            <div class="flex items-start justify-between gap-2">
              <div>
                <h3 class="font-semibold text-foreground">
                  {{ item.name }}
                  <span v-if="!item.active" class="text-xs text-muted-foreground">(inactive)</span>
                </h3>
                <p class="text-sm text-muted-foreground">
                  {{ getLocationLabel(item.category) }}
                  <span v-if="item.dose">· {{ item.dose }}</span>
                </p>
              </div>

              <!-- Actions -->
              <div class="flex items-center gap-1">
                <button
                  class="p-2 rounded-lg hover:bg-muted/50 transition-colors"
                  title="Edit"
                  @click="openEditModal(item)"
                >
                  <Edit2 class="w-4 h-4 text-muted-foreground" />
                </button>
                <button
                  class="p-2 rounded-lg hover:bg-muted/50 transition-colors"
                  :title="item.active ? 'Deactivate' : 'Reactivate'"
                  @click="toggleItemActive(item)"
                >
                  <Trash2 v-if="item.active" class="w-4 h-4 text-error" />
                  <RotateCcw v-else class="w-4 h-4 text-quaternary" />
                </button>
              </div>
            </div>

            <!-- Meta -->
            <div class="flex flex-wrap items-center gap-2 mt-2">
              <span class="px-2 py-0.5 text-xs font-medium bg-muted rounded-full">
                {{ item.type }}
              </span>
              <span class="px-2 py-0.5 text-xs font-medium bg-muted rounded-full">
                {{ getFrequencyLabel(item.frequency) }}
              </span>
              <span
                v-if="item.conflict_group"
                class="px-2 py-0.5 text-xs font-medium bg-tertiary/20 text-tertiary rounded-full"
              >
                Group: {{ item.conflict_group }}
              </span>
            </div>

            <!-- Notes -->
            <p v-if="item.notes" class="mt-2 text-xs text-muted-foreground italic">
              {{ item.notes }}
            </p>

            <!-- Schedules -->
            <div v-if="item.schedules?.length > 0" class="mt-2 text-xs text-muted-foreground">
              <span class="font-medium">Schedules:</span>
              {{ item.schedules.map(s => s.scheduled_time?.substring(0, 5)).join(', ') }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="py-12 text-center">
      <div class="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
        <Pill class="w-8 h-8 text-muted-foreground" />
      </div>
      <h2 class="text-lg font-semibold text-foreground mb-2">No items</h2>
      <p class="text-muted-foreground mb-4">
        Add your first item to get started.
      </p>
      <button
        class="btn btn-primary"
        @click="openAddModal"
      >
        <Plus class="w-4 h-4" />
        Add Item
      </button>
    </div>

    <!-- Add/Edit Modal -->
    <Teleport to="body">
      <div
        v-if="showAddModal"
        class="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
        @click.self="closeModal"
      >
        <div class="bg-card rounded-2xl p-6 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-semibold text-foreground">
              {{ editingItem ? 'Edit Item' : 'Add Item' }}
            </h2>
            <button
              class="p-1 rounded-lg hover:bg-muted/50 transition-colors"
              @click="closeModal"
            >
              <X class="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          <form class="space-y-4" @submit.prevent="saveItem">
            <!-- Name -->
            <div>
              <label class="block text-sm font-medium text-muted-foreground mb-1">
                Name *
              </label>
              <input
                v-model="formName"
                type="text"
                required
                placeholder="e.g., Ofloxacin 0.3%"
                class="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>

            <!-- Type -->
            <div>
              <label class="block text-sm font-medium text-muted-foreground mb-1">
                Type
              </label>
              <select
                v-model="formType"
                class="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="medication">Medication</option>
                <option value="food">Food</option>
                <option value="supplement">Supplement</option>
              </select>
            </div>

            <!-- Category/Location -->
            <div>
              <label class="block text-sm font-medium text-muted-foreground mb-1">
                Location
              </label>
              <select
                v-model="formCategory"
                class="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="leftEye">Left Eye</option>
                <option value="rightEye">Right Eye</option>
                <option value="oral">Oral</option>
                <option value="food">Food/Other</option>
              </select>
            </div>

            <!-- Dose -->
            <div>
              <label class="block text-sm font-medium text-muted-foreground mb-1">
                Dose
              </label>
              <input
                v-model="formDose"
                type="text"
                placeholder="e.g., 1 drop, 50mg"
                class="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>

            <!-- Frequency -->
            <div>
              <label class="block text-sm font-medium text-muted-foreground mb-1">
                Frequency
              </label>
              <select
                v-model="formFrequency"
                class="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="1x_daily">Once daily</option>
                <option value="2x_daily">Twice daily</option>
                <option value="4x_daily">4x daily</option>
                <option value="12h">Every 12 hours</option>
                <option value="as_needed">As needed</option>
              </select>
            </div>

            <!-- Conflict Group -->
            <div>
              <label class="block text-sm font-medium text-muted-foreground mb-1">
                Conflict Group
              </label>
              <input
                v-model="formConflictGroup"
                type="text"
                placeholder="e.g., eye_drops"
                class="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
              />
              <p class="text-xs text-muted-foreground mt-1">
                Items in the same group require 5 min spacing
              </p>
            </div>

            <!-- Notes -->
            <div>
              <label class="block text-sm font-medium text-muted-foreground mb-1">
                Notes
              </label>
              <textarea
                v-model="formNotes"
                rows="2"
                placeholder="Additional instructions..."
                class="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent resize-none"
              />
            </div>

            <!-- Actions -->
            <div class="flex gap-3 pt-2">
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
                class="flex-1 btn btn-primary"
                :disabled="isSaving || !formName.trim()"
              >
                <RefreshCw v-if="isSaving" class="w-5 h-5 animate-spin" />
                <template v-else>
                  <Check class="w-4 h-4" />
                  <span>{{ editingItem ? 'Save' : 'Add' }}</span>
                </template>
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </main>
</template>
