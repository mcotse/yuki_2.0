<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useHistoryStore, type HistoryEntry } from '@/stores/history'
import { useAuthStore } from '@/stores/auth'
import { formatTime, formatDisplayDate, parseLocalDate, formatLocalDate } from '@/utils/date'
import { RefreshCw, AlertCircle, Calendar, ChevronLeft, ChevronRight, Clock, User, Edit2, X, Check } from 'lucide-vue-next'

const historyStore = useHistoryStore()
const authStore = useAuthStore()

const showDatePicker = ref(false)
const datePickerInput = ref('')
const editingEntry = ref<HistoryEntry | null>(null)
const editTime = ref('')
const editNotes = ref('')
const isSaving = ref(false)

// Navigate to previous/next day
function goToPreviousDay() {
  const current = parseLocalDate(historyStore.selectedDate)
  current.setDate(current.getDate() - 1)
  historyStore.fetchHistoryForDate(formatLocalDate(current))
}

function goToNextDay() {
  const current = parseLocalDate(historyStore.selectedDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  current.setDate(current.getDate() + 1)

  // Don't go past today
  if (current <= today) {
    historyStore.fetchHistoryForDate(formatLocalDate(current))
  }
}

function isToday(): boolean {
  const today = formatLocalDate(new Date())
  return historyStore.selectedDate === today
}

function openDatePicker() {
  datePickerInput.value = historyStore.selectedDate
  showDatePicker.value = true
}

function selectDate() {
  if (datePickerInput.value) {
    historyStore.fetchHistoryForDate(datePickerInput.value)
    showDatePicker.value = false
  }
}

function getLocationBadge(item: { category: string | null; location: string | null }) {
  if (item.location === 'LEFT eye') return { text: 'L', color: 'bg-accent' }
  if (item.location === 'RIGHT eye') return { text: 'R', color: 'bg-secondary' }
  if (item.location === 'ORAL') return { text: 'O', color: 'bg-tertiary' }
  return null
}

function startEdit(entry: HistoryEntry) {
  editingEntry.value = entry
  // Format time for input
  const time = entry.confirmedAt
  const hours = String(time.getHours()).padStart(2, '0')
  const minutes = String(time.getMinutes()).padStart(2, '0')
  editTime.value = `${hours}:${minutes}`
  editNotes.value = entry.instance.notes ?? ''
}

function cancelEdit() {
  editingEntry.value = null
  editTime.value = ''
  editNotes.value = ''
}

async function saveEdit() {
  if (!editingEntry.value) return

  isSaving.value = true
  try {
    // Combine date with new time
    const datePart = historyStore.selectedDate
    const [hours, minutes] = editTime.value.split(':')
    const newTime = parseLocalDate(datePart)
    newTime.setHours(parseInt(hours ?? '0'), parseInt(minutes ?? '0'), 0, 0)

    await historyStore.updateConfirmation(editingEntry.value.instance.id, {
      confirmed_at: newTime.toISOString(),
      notes: editNotes.value || null,
    })

    cancelEdit()
  } finally {
    isSaving.value = false
  }
}

onMounted(() => {
  historyStore.fetchHistoryForDate(historyStore.selectedDate)
})
</script>

<template>
  <main class="p-6 pb-24 max-w-lg mx-auto">
    <!-- Header with Date Navigation -->
    <div class="flex items-center justify-between mb-6">
      <button
        class="p-2 rounded-xl hover:bg-muted/50 transition-colors"
        @click="goToPreviousDay"
      >
        <ChevronLeft class="w-5 h-5 text-foreground" />
      </button>

      <button
        class="flex items-center gap-2 px-4 py-2 rounded-xl hover:bg-muted/50 transition-colors"
        @click="openDatePicker"
      >
        <Calendar class="w-5 h-5 text-accent" />
        <span class="text-lg font-semibold text-foreground">
          {{ formatDisplayDate(parseLocalDate(historyStore.selectedDate)) }}
        </span>
      </button>

      <button
        class="p-2 rounded-xl hover:bg-muted/50 transition-colors disabled:opacity-30"
        :disabled="isToday()"
        @click="goToNextDay"
      >
        <ChevronRight class="w-5 h-5 text-foreground" />
      </button>
    </div>

    <!-- Summary -->
    <p class="text-center text-sm text-muted-foreground mb-6">
      {{ historyStore.totalEntries }} confirmation{{ historyStore.totalEntries !== 1 ? 's' : '' }}
    </p>

    <!-- Loading State -->
    <div v-if="historyStore.isLoading" class="py-12 text-center">
      <RefreshCw class="w-8 h-8 mx-auto text-accent animate-spin mb-4" />
      <p class="text-muted-foreground">Loading history...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="historyStore.error" class="card p-6 bg-error/10 border-error">
      <div class="flex items-center gap-3 text-error">
        <AlertCircle class="w-5 h-5" />
        <span>{{ historyStore.error }}</span>
      </div>
    </div>

    <!-- History List -->
    <div v-else-if="historyStore.entriesByTime.length > 0" class="space-y-3">
      <div
        v-for="entry in historyStore.entriesByTime"
        :key="entry.instance.id"
        class="card p-4"
      >
        <div class="flex items-start gap-3">
          <!-- Location Badge -->
          <div
            v-if="getLocationBadge(entry.instance.item)"
            class="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm"
            :class="getLocationBadge(entry.instance.item)?.color"
          >
            {{ getLocationBadge(entry.instance.item)?.text }}
          </div>
          <div
            v-else
            class="w-10 h-10 rounded-xl bg-quaternary flex items-center justify-center"
          >
            <Check class="w-5 h-5 text-foreground" />
          </div>

          <!-- Content -->
          <div class="flex-1 min-w-0">
            <div class="flex items-start justify-between gap-2">
              <div>
                <h3 class="font-semibold text-foreground truncate">
                  {{ entry.instance.item.name }}
                </h3>
                <p v-if="entry.instance.item.dose" class="text-sm text-muted-foreground">
                  {{ entry.instance.item.dose }}
                </p>
              </div>

              <!-- Edit Button (Admin Only) -->
              <button
                v-if="authStore.isAdmin"
                class="p-2 rounded-lg hover:bg-muted/50 transition-colors"
                @click="startEdit(entry)"
              >
                <Edit2 class="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            <!-- Meta Info -->
            <div class="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              <span class="flex items-center gap-1">
                <Clock class="w-3.5 h-3.5" />
                {{ formatTime(entry.confirmedAt) }}
              </span>
              <span v-if="entry.confirmedByName" class="flex items-center gap-1">
                <User class="w-3.5 h-3.5" />
                {{ entry.confirmedByName }}
              </span>
            </div>

            <!-- Notes -->
            <p v-if="entry.instance.notes" class="mt-2 text-sm text-muted-foreground italic">
              "{{ entry.instance.notes }}"
            </p>

            <!-- Ad-hoc Badge -->
            <span
              v-if="entry.instance.is_adhoc"
              class="inline-block mt-2 px-2 py-0.5 text-xs font-medium bg-tertiary/20 text-tertiary rounded-full"
            >
              Ad-hoc
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="py-12 text-center">
      <div class="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
        <Clock class="w-8 h-8 text-muted-foreground" />
      </div>
      <h2 class="text-lg font-semibold text-foreground mb-2">No confirmations</h2>
      <p class="text-muted-foreground">
        No medications were confirmed on this day.
      </p>
    </div>

    <!-- Date Picker Modal -->
    <Teleport to="body">
      <div
        v-if="showDatePicker"
        class="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
        @click.self="showDatePicker = false"
      >
        <div class="bg-card rounded-2xl p-6 w-full max-w-sm shadow-xl">
          <h2 class="text-lg font-semibold text-foreground mb-4">Select Date</h2>
          <input
            v-model="datePickerInput"
            type="date"
            :max="formatLocalDate(new Date())"
            class="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
          />
          <div class="flex gap-3 mt-4">
            <button
              class="flex-1 px-4 py-3 rounded-xl border border-border text-foreground hover:bg-muted/50 transition-colors"
              @click="showDatePicker = false"
            >
              Cancel
            </button>
            <button
              class="flex-1 px-4 py-3 rounded-xl bg-accent text-white font-medium hover:bg-accent/90 transition-colors"
              @click="selectDate"
            >
              Select
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Edit Modal -->
    <Teleport to="body">
      <div
        v-if="editingEntry"
        class="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
        @click.self="cancelEdit"
      >
        <div class="bg-card rounded-2xl p-6 w-full max-w-sm shadow-xl">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-semibold text-foreground">Edit Confirmation</h2>
            <button
              class="p-1 rounded-lg hover:bg-muted/50 transition-colors"
              @click="cancelEdit"
            >
              <X class="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-muted-foreground mb-1">
                Medication
              </label>
              <p class="text-foreground font-medium">
                {{ editingEntry.instance.item.name }}
              </p>
            </div>

            <div>
              <label class="block text-sm font-medium text-muted-foreground mb-1">
                Time
              </label>
              <input
                v-model="editTime"
                type="time"
                class="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-muted-foreground mb-1">
                Notes
              </label>
              <textarea
                v-model="editNotes"
                rows="3"
                placeholder="Add notes..."
                class="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent resize-none"
              />
            </div>
          </div>

          <div class="flex gap-3 mt-6">
            <button
              class="flex-1 px-4 py-3 rounded-xl border border-border text-foreground hover:bg-muted/50 transition-colors"
              :disabled="isSaving"
              @click="cancelEdit"
            >
              Cancel
            </button>
            <button
              class="flex-1 px-4 py-3 rounded-xl bg-accent text-white font-medium hover:bg-accent/90 transition-colors disabled:opacity-50"
              :disabled="isSaving"
              @click="saveEdit"
            >
              <RefreshCw v-if="isSaving" class="w-5 h-5 animate-spin mx-auto" />
              <span v-else>Save</span>
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </main>
</template>
