<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import type { DailyInstanceWithItem, SnoozeInterval } from '@/types'
import { formatTime, getRelativeTime } from '@/utils/date'
import { useInstancesStore } from '@/stores/instances'
import {
  Droplet,
  Pill,
  Utensils,
  Leaf,
  Check,
  Clock,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Undo2,
} from 'lucide-vue-next'

const props = defineProps<{
  instance: DailyInstanceWithItem
  status: 'overdue' | 'due' | 'snoozed' | 'upcoming' | 'confirmed'
}>()

const emit = defineEmits<{
  confirm: [overrideConflict: boolean]
  snooze: [minutes: SnoozeInterval]
  undo: []
}>()

const instancesStore = useInstancesStore()
const isExpanded = ref(false)
const isConfirming = ref(false)
const isUndoing = ref(false)
const showSnoozeOptions = ref(false)

// Reactive time ticker to refresh conflict checks every minute
const tick = ref(0)
let tickInterval: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  tickInterval = setInterval(() => {
    tick.value++
  }, 60000) // Update every minute
})

onUnmounted(() => {
  if (tickInterval) {
    clearInterval(tickInterval)
  }
})

const scheduledTime = computed(() => formatTime(new Date(props.instance.scheduled_time)))
const relativeTime = computed(() => getRelativeTime(new Date(props.instance.scheduled_time)))
const confirmedTime = computed(() =>
  props.instance.confirmed_at ? formatTime(new Date(props.instance.confirmed_at)) : null,
)

const hasNotes = computed(() => !!props.instance.item.notes)

// Check if this instance was previously undone (to prevent undo of undo)
const wasUndone = computed(() => {
  return props.instance.notes?.includes('[Undone') ?? false
})

// Icon based on item type and category
const icon = computed(() => {
  const type = props.instance.item.type
  const category = props.instance.item.category

  // Eye drops use droplet icon
  if (category === 'leftEye' || category === 'rightEye') return Droplet
  // Supplements use leaf icon
  if (type === 'supplement') return Leaf
  // Food items use utensils
  if (type === 'food' || category === 'food') return Utensils
  // Default to pill for medications
  return Pill
})

// Background color based on item TYPE (not status) for consistent visual identity
const iconBgClass = computed(() => {
  const type = props.instance.item.type
  const category = props.instance.item.category

  // Eye drops - accent purple/pink gradient feel
  if (category === 'leftEye') return 'bg-accent/20'
  if (category === 'rightEye') return 'bg-secondary/20'
  // Supplements - earthy green
  if (type === 'supplement') return 'bg-emerald-500/20'
  // Food - warm orange
  if (type === 'food' || category === 'food') return 'bg-amber-500/20'
  // Oral medications - blue
  if (category === 'oral') return 'bg-blue-500/20'
  // Default
  return 'bg-muted/50'
})

// Icon color matches background theme
const iconColorClass = computed(() => {
  const type = props.instance.item.type
  const category = props.instance.item.category

  if (category === 'leftEye') return 'text-accent'
  if (category === 'rightEye') return 'text-secondary'
  if (type === 'supplement') return 'text-emerald-600'
  if (type === 'food' || category === 'food') return 'text-amber-600'
  if (category === 'oral') return 'text-blue-600'
  return 'text-muted-foreground'
})

// Border/ring indicator for status (subtle)
const statusRingClass = computed(() => {
  switch (props.status) {
    case 'overdue':
      return 'ring-2 ring-error/50'
    case 'due':
      return 'ring-2 ring-accent/50'
    default:
      return ''
  }
})

// Re-check conflict every minute (tick dependency triggers recalculation)
const conflict = computed(() => {
  void tick.value // Dependency to trigger recalculation every minute
  return instancesStore.checkConflict(props.instance)
})

async function handleConfirm(event: Event) {
  event.stopPropagation() // Prevent card click from triggering
  if (isConfirming.value) return

  // Track whether we're overriding a conflict
  let overrideConflict = false

  // Check for conflict
  if (conflict.value.hasConflict) {
    // Show warning but still allow override
    const confirmed = window.confirm(
      `${conflict.value.conflictingItemName} was just given. Wait ${conflict.value.remainingMinutes} min or confirm anyway?`,
    )
    if (!confirmed) return
    overrideConflict = true
  }

  isConfirming.value = true
  emit('confirm', overrideConflict)
  // Reset after animation
  setTimeout(() => {
    isConfirming.value = false
  }, 300)
}

function handleSnooze(minutes: SnoozeInterval) {
  emit('snooze', minutes)
  showSnoozeOptions.value = false
}

function toggleSnoozeOptions(event: Event) {
  event.stopPropagation() // Prevent card click from triggering
  showSnoozeOptions.value = !showSnoozeOptions.value
}

function handleCardClick() {
  if (hasNotes.value) {
    isExpanded.value = !isExpanded.value
  }
}

async function handleUndo(event: Event) {
  event.stopPropagation() // Prevent card click from triggering
  if (isUndoing.value) return

  isUndoing.value = true
  emit('undo')
  // Reset after animation
  setTimeout(() => {
    isUndoing.value = false
  }, 300)
}
</script>

<template>
  <div
    class="card p-4 transition-all"
    :class="{
      'opacity-60': status === 'confirmed',
      'border-error/50 bg-error/5': status === 'overdue',
      'ring-2 ring-accent': status === 'due',
      'cursor-pointer': hasNotes,
    }"
    @click="handleCardClick"
  >
    <!-- Main Row -->
    <div class="flex items-center gap-4">
      <!-- Icon -->
      <div
        class="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-all"
        :class="[iconBgClass, statusRingClass]"
      >
        <component :is="icon" class="w-6 h-6" :class="iconColorClass" />
      </div>

      <!-- Content -->
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2">
          <h3 class="font-bold text-foreground truncate">{{ instance.item.name }}</h3>
          <span v-if="status === 'confirmed'" class="text-quaternary">
            <Check class="w-4 h-4" />
          </span>
          <!-- Notes indicator - subtle inline hint -->
          <span
            v-if="hasNotes"
            class="text-muted-foreground/50 transition-transform duration-200"
            :class="{ 'rotate-180': isExpanded }"
          >
            <ChevronDown class="w-4 h-4" />
          </span>
        </div>
        <div class="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{{ instance.item.location }}</span>
          <span v-if="instance.item.dose">· {{ instance.item.dose }}</span>
        </div>
        <div class="text-sm text-muted-foreground mt-1">
          <span v-if="status === 'confirmed' && confirmedTime">
            Done at {{ confirmedTime }}
          </span>
          <span v-else-if="status === 'snoozed' && instance.snooze_until">
            Snoozed until {{ formatTime(new Date(instance.snooze_until)) }}
          </span>
          <span v-else>
            {{ scheduledTime }}
            <span v-if="status !== 'upcoming'" class="text-xs ml-1">({{ relativeTime }})</span>
          </span>
        </div>
      </div>

      <!-- Actions - always right-aligned -->
      <div class="flex items-center gap-2 flex-shrink-0">
        <!-- Confirm Button -->
        <button
          v-if="status !== 'confirmed' && status !== 'upcoming'"
          class="btn btn-primary py-2 px-4 text-sm"
          :class="{ 'animate-bounce': isConfirming }"
          :disabled="isConfirming"
          @click="handleConfirm"
        >
          <Check class="w-4 h-4" />
        </button>

        <!-- Undo Button (for confirmed items that weren't already undone) -->
        <button
          v-if="status === 'confirmed' && !wasUndone"
          class="p-2 rounded-lg hover:bg-muted/50 transition-colors"
          :class="{ 'animate-pulse': isUndoing }"
          :disabled="isUndoing"
          title="Undo confirmation"
          @click="handleUndo"
        >
          <Undo2 class="w-5 h-5 text-muted-foreground" />
        </button>

        <!-- Snooze Button -->
        <button
          v-if="status === 'due' || status === 'overdue'"
          class="p-2 rounded-lg hover:bg-muted/50 transition-colors"
          @click="toggleSnoozeOptions"
        >
          <Clock class="w-5 h-5 text-muted-foreground" />
        </button>
      </div>
    </div>

    <!-- Conflict Warning -->
    <div
      v-if="conflict.hasConflict && status !== 'confirmed'"
      class="mt-3 flex items-center gap-2 text-sm text-tertiary"
    >
      <AlertTriangle class="w-4 h-4" />
      <span>
        Wait {{ conflict.remainingMinutes }} min - {{ conflict.conflictingItemName }} was just given
      </span>
    </div>

    <!-- Snooze Options -->
    <div v-if="showSnoozeOptions" class="mt-3 flex items-center gap-2" @click.stop>
      <span class="text-sm text-muted-foreground">Snooze for:</span>
      <button
        class="px-3 py-1 rounded-full text-sm font-medium bg-tertiary/20 text-tertiary hover:bg-tertiary/30 transition-colors"
        @click="handleSnooze(15)"
      >
        15 min
      </button>
      <button
        class="px-3 py-1 rounded-full text-sm font-medium bg-tertiary/20 text-tertiary hover:bg-tertiary/30 transition-colors"
        @click="handleSnooze(30)"
      >
        30 min
      </button>
      <button
        class="px-3 py-1 rounded-full text-sm font-medium bg-tertiary/20 text-tertiary hover:bg-tertiary/30 transition-colors"
        @click="handleSnooze(60)"
      >
        1 hour
      </button>
    </div>

    <!-- Expanded Notes -->
    <div v-if="isExpanded && hasNotes" class="mt-3 pt-3 border-t border-muted">
      <p class="text-sm text-muted-foreground">{{ instance.item.notes }}</p>
    </div>
  </div>
</template>
