<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import type { DailyInstanceWithItem, SnoozeInterval } from '@/types'
import { formatTime, getRelativeTime } from '@/utils/date'
import { useInstancesStore } from '@/stores/instances'
import {
  Eye,
  Pill,
  Utensils,
  Check,
  Clock,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from 'lucide-vue-next'

const props = defineProps<{
  instance: DailyInstanceWithItem
  status: 'overdue' | 'due' | 'snoozed' | 'upcoming' | 'confirmed'
}>()

const emit = defineEmits<{
  confirm: [overrideConflict: boolean]
  snooze: [minutes: SnoozeInterval]
}>()

const instancesStore = useInstancesStore()
const isExpanded = ref(false)
const isConfirming = ref(false)
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

const icon = computed(() => {
  const category = props.instance.item.category
  if (category === 'leftEye' || category === 'rightEye') return Eye
  if (category === 'oral') return Pill
  return Utensils
})

const iconBgClass = computed(() => {
  switch (props.status) {
    case 'overdue':
      return 'bg-error/20'
    case 'due':
      return 'bg-accent/20'
    case 'snoozed':
      return 'bg-tertiary/20'
    case 'confirmed':
      return 'bg-quaternary/20'
    default:
      return 'bg-muted/50'
  }
})

const iconColorClass = computed(() => {
  switch (props.status) {
    case 'overdue':
      return 'text-error'
    case 'due':
      return 'bg-accent'
    case 'snoozed':
      return 'text-tertiary'
    case 'confirmed':
      return 'text-quaternary'
    default:
      return 'text-muted-foreground'
  }
})

// Re-check conflict every minute (tick dependency triggers recalculation)
const conflict = computed(() => {
  void tick.value // Dependency to trigger recalculation every minute
  return instancesStore.checkConflict(props.instance)
})

async function handleConfirm() {
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
</script>

<template>
  <div
    class="card p-4 transition-all"
    :class="{
      'opacity-60': status === 'confirmed',
      'border-error/50 bg-error/5': status === 'overdue',
      'ring-2 ring-accent': status === 'due',
    }"
  >
    <!-- Main Row -->
    <div class="flex items-center gap-4">
      <!-- Icon -->
      <div
        class="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
        :class="iconBgClass"
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

      <!-- Actions -->
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

        <!-- Snooze Button -->
        <button
          v-if="status === 'due' || status === 'overdue'"
          class="p-2 rounded-lg hover:bg-muted/50 transition-colors"
          @click="showSnoozeOptions = !showSnoozeOptions"
        >
          <Clock class="w-5 h-5 text-muted-foreground" />
        </button>

        <!-- Expand Button or Placeholder for alignment -->
        <button
          v-if="instance.item.notes"
          class="p-2 rounded-lg hover:bg-muted/50 transition-colors"
          @click="isExpanded = !isExpanded"
        >
          <component
            :is="isExpanded ? ChevronUp : ChevronDown"
            class="w-5 h-5 text-muted-foreground"
          />
        </button>
        <div v-else class="w-9 h-9" aria-hidden="true"></div>
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
    <div v-if="showSnoozeOptions" class="mt-3 flex items-center gap-2">
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
    <div v-if="isExpanded && instance.item.notes" class="mt-3 pt-3 border-t border-muted">
      <p class="text-sm text-muted-foreground">{{ instance.item.notes }}</p>
    </div>
  </div>
</template>
