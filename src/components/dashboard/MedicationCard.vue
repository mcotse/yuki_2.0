<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
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

const props = withDefaults(
  defineProps<{
    instance: DailyInstanceWithItem
    status: 'overdue' | 'due' | 'snoozed' | 'upcoming' | 'confirmed'
    compact?: boolean
  }>(),
  {
    compact: false,
  }
)

const emit = defineEmits<{
  confirm: []
  snooze: [minutes: SnoozeInterval]
}>()

const instancesStore = useInstancesStore()
const isExpanded = ref(false)
const isConfirming = ref(false)
const showSnoozeOptions = ref(false)

// Live countdown timer for conflict warning
const countdownSeconds = ref(0)
let countdownInterval: ReturnType<typeof setInterval> | null = null

function updateCountdown() {
  const conflictCheck = instancesStore.checkConflict(props.instance)
  if (conflictCheck.hasConflict && conflictCheck.remainingSeconds) {
    countdownSeconds.value = conflictCheck.remainingSeconds
  } else {
    countdownSeconds.value = 0
    stopCountdown()
  }
}

function startCountdown() {
  if (countdownInterval) return
  countdownInterval = setInterval(() => {
    if (countdownSeconds.value > 0) {
      countdownSeconds.value--
    }
    if (countdownSeconds.value <= 0) {
      stopCountdown()
    }
  }, 1000)
}

function stopCountdown() {
  if (countdownInterval) {
    clearInterval(countdownInterval)
    countdownInterval = null
  }
}

function formatCountdown(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${String(secs).padStart(2, '0')}`
}

// Watch for conflict changes
watch(
  () => instancesStore.checkConflict(props.instance),
  (newConflict) => {
    if (newConflict.hasConflict && newConflict.remainingSeconds) {
      countdownSeconds.value = newConflict.remainingSeconds
      startCountdown()
    } else {
      countdownSeconds.value = 0
      stopCountdown()
    }
  },
  { immediate: true }
)

onMounted(() => {
  updateCountdown()
  if (countdownSeconds.value > 0) {
    startCountdown()
  }
})

onUnmounted(() => {
  stopCountdown()
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
      return 'text-accent'
    case 'snoozed':
      return 'text-tertiary'
    case 'confirmed':
      return 'text-quaternary'
    default:
      return 'text-muted-foreground'
  }
})

const conflict = computed(() => instancesStore.checkConflict(props.instance))

async function handleConfirm() {
  if (isConfirming.value) return

  // Check for conflict
  if (conflict.value.hasConflict) {
    // Show warning but still allow override
    const confirmed = window.confirm(
      `${conflict.value.conflictingItemName} was just given. Wait ${conflict.value.remainingSeconds}s or confirm anyway?`,
    )
    if (!confirmed) return
  }

  isConfirming.value = true
  emit('confirm')
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
    class="card transition-all"
    :class="[
      compact ? 'p-3' : 'p-4',
      {
        'opacity-60': status === 'confirmed',
        'border-error/50 bg-error/5': status === 'overdue',
        'ring-2 ring-accent': status === 'due',
        'bg-secondary/5 border-secondary/30': compact,
      },
    ]"
  >
    <!-- Main Row -->
    <div class="flex items-center" :class="compact ? 'gap-3' : 'gap-4'">
      <!-- Icon -->
      <div
        class="rounded-xl flex items-center justify-center flex-shrink-0"
        :class="[iconBgClass, compact ? 'w-9 h-9' : 'w-12 h-12']"
      >
        <component :is="icon" :class="[iconColorClass, compact ? 'w-4 h-4' : 'w-6 h-6']" />
      </div>

      <!-- Content -->
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2">
          <h3 :class="['font-bold text-foreground truncate', compact ? 'text-sm' : '']">{{ instance.item.name }}</h3>
          <span v-if="status === 'confirmed'" class="text-quaternary flex-shrink-0">
            <Check class="w-4 h-4" />
          </span>
        </div>
        <div v-if="!compact && (instance.item.location || instance.item.dose)" class="text-sm text-muted-foreground truncate">
          <span v-if="instance.item.location">{{ instance.item.location }}</span>
          <span v-if="instance.item.dose">{{ instance.item.location ? ' · ' : '' }}{{ instance.item.dose }}</span>
        </div>
        <div :class="['text-muted-foreground', compact ? 'text-xs' : 'text-sm mt-0.5']">
          <span v-if="status === 'confirmed' && confirmedTime">
            Done at {{ confirmedTime }}
          </span>
          <span v-else-if="status === 'snoozed' && instance.snooze_until">
            Snoozed until {{ formatTime(new Date(instance.snooze_until)) }}
          </span>
          <span v-else>
            {{ scheduledTime }}
            <span v-if="!compact && status !== 'upcoming'" class="text-xs ml-1 text-muted-foreground/70">({{ relativeTime }})</span>
            <span v-if="compact && instance.item.location" class="ml-1">· {{ instance.item.location }}</span>
          </span>
        </div>
      </div>

      <!-- Actions - Grid layout for consistent alignment -->
      <div v-if="!compact" class="flex items-center flex-shrink-0">
        <!-- Primary action: Confirm -->
        <button
          v-if="status !== 'confirmed' && status !== 'upcoming'"
          class="btn btn-primary py-2 px-4 text-sm mr-1"
          :class="{ 'animate-bounce': isConfirming }"
          :disabled="isConfirming"
          @click="handleConfirm"
        >
          <Check class="w-4 h-4" />
        </button>

        <!-- Secondary actions container - fixed width for alignment -->
        <div class="flex items-center gap-0.5 w-[72px] justify-end">
          <!-- Snooze Button -->
          <button
            v-if="status === 'due' || status === 'overdue'"
            class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted/50 transition-colors"
            @click="showSnoozeOptions = !showSnoozeOptions"
          >
            <Clock class="w-[18px] h-[18px] text-muted-foreground" />
          </button>

          <!-- Expand Button - only show if notes exist -->
          <button
            v-if="instance.item.notes"
            class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted/50 transition-colors"
            @click="isExpanded = !isExpanded"
          >
            <component
              :is="isExpanded ? ChevronUp : ChevronDown"
              class="w-[18px] h-[18px] text-muted-foreground"
            />
          </button>
        </div>
      </div>
    </div>

    <!-- Conflict Warning with Live Countdown -->
    <div
      v-if="!compact && countdownSeconds > 0 && status !== 'confirmed'"
      class="mt-3 flex items-center gap-2 text-sm text-tertiary bg-tertiary/10 rounded-lg p-2"
    >
      <AlertTriangle class="w-4 h-4 flex-shrink-0" />
      <span class="flex-1">
        Wait <span class="font-mono font-bold">{{ formatCountdown(countdownSeconds) }}</span> - {{ conflict.conflictingItemName }} was just given
      </span>
    </div>

    <!-- Snooze Options -->
    <div v-if="!compact && showSnoozeOptions" class="mt-3 flex items-center gap-2">
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
    <div v-if="!compact && isExpanded && instance.item.notes" class="mt-3 pt-3 border-t border-muted">
      <p class="text-sm text-muted-foreground">{{ instance.item.notes }}</p>
    </div>
  </div>
</template>
