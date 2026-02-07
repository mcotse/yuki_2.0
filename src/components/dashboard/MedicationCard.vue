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
  Info,
  ChevronUp,
  Undo2,
  Trash2,
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
  confirm: [overrideConflict?: boolean]
  snooze: [minutes: SnoozeInterval]
  undo: []
  delete: []
}>()

const instancesStore = useInstancesStore()
const isExpanded = ref(false)
const isConfirming = ref(false)
const showSnoozeOptions = ref(false)

// Swipe-to-delete state
const swipeOffset = ref(0)
const isSwipeRevealed = ref(false)
const isDeleting = ref(false)
let touchStartX = 0
let touchStartY = 0
let isSwiping = false
const DELETE_REVEAL_THRESHOLD = 72 // px to reveal delete button
const DELETE_BUTTON_WIDTH = 80 // px width of the delete action area

function handleTouchStart(e: TouchEvent) {
  if (props.compact) return
  const touch = e.touches[0]
  if (!touch) return
  touchStartX = touch.clientX
  touchStartY = touch.clientY
  isSwiping = false
}

function handleTouchMove(e: TouchEvent) {
  if (props.compact) return
  const touch = e.touches[0]
  if (!touch) return

  const deltaX = touch.clientX - touchStartX
  const deltaY = touch.clientY - touchStartY

  // Determine if this is a horizontal swipe (vs vertical scroll)
  if (!isSwiping && Math.abs(deltaX) > 10) {
    // Only capture horizontal swipe if it's more horizontal than vertical
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      isSwiping = true
    } else {
      return
    }
  }

  if (!isSwiping) return
  e.preventDefault()

  if (isSwipeRevealed.value) {
    // Already revealed - allow swiping back to right
    const newOffset = Math.min(0, -DELETE_BUTTON_WIDTH + deltaX)
    swipeOffset.value = newOffset
  } else {
    // Swiping left to reveal (only allow leftward)
    const newOffset = Math.min(0, deltaX)
    // Add resistance after threshold
    if (Math.abs(newOffset) > DELETE_BUTTON_WIDTH) {
      const overflow = Math.abs(newOffset) - DELETE_BUTTON_WIDTH
      swipeOffset.value = -(DELETE_BUTTON_WIDTH + overflow * 0.3)
    } else {
      swipeOffset.value = newOffset
    }
  }
}

function handleTouchEnd() {
  if (props.compact || !isSwiping) return

  const absOffset = Math.abs(swipeOffset.value)

  if (isSwipeRevealed.value) {
    // If swiped back enough, close it
    if (absOffset < DELETE_BUTTON_WIDTH * 0.5) {
      closeSwipe()
    } else {
      snapOpen()
    }
  } else {
    // If swiped far enough, reveal delete button
    if (absOffset >= DELETE_REVEAL_THRESHOLD) {
      snapOpen()
    } else {
      closeSwipe()
    }
  }
}

function snapOpen() {
  swipeOffset.value = -DELETE_BUTTON_WIDTH
  isSwipeRevealed.value = true
}

function closeSwipe() {
  swipeOffset.value = 0
  isSwipeRevealed.value = false
}

function handleDelete() {
  if (isDeleting.value) return
  const confirmed = window.confirm(
    `Delete "${props.instance.item.name}" from today's schedule? This cannot be undone.`,
  )
  if (!confirmed) {
    closeSwipe()
    return
  }
  isDeleting.value = true
  emit('delete')
}

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
  let overrideConflict = false
  if (conflict.value.hasConflict) {
    // Show warning but still allow override
    const confirmed = window.confirm(
      `${conflict.value.conflictingItemName} was just given. Wait ${conflict.value.remainingSeconds}s or confirm anyway?`,
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
    class="swipe-container"
    :class="[
      { 'swipe-deleting': isDeleting },
      compact ? 'swipe-container-compact' : 'swipe-container-active',
      {
        'border-error/50 bg-error/5': !compact && status === 'overdue',
        'ring-2 ring-accent': !compact && status === 'due',
        'opacity-60': !compact && status === 'confirmed',
      },
    ]"
  >
    <!-- Delete action behind the card -->
    <div
      v-if="!compact"
      class="swipe-delete-action"
      :style="{ width: Math.abs(swipeOffset) + 'px' }"
      @click.stop="handleDelete"
    >
      <Trash2 class="w-5 h-5 text-white" />
    </div>

    <!-- Main card -->
    <div
      class="card transition-[box-shadow,border-color,opacity,background-color] swipe-card"
      :class="[
        compact ? 'p-3' : 'p-4',
        {
          'opacity-60': compact && status === 'confirmed',
          'bg-error/5': status === 'overdue',
          'ring-2 ring-accent': compact && status === 'due',
          'bg-secondary/5 border-secondary/30': compact,
          'cursor-pointer hover:bg-muted/30': !compact && instance.item.notes,
        },
      ]"
      :style="!compact ? { transform: `translateX(${swipeOffset}px)` } : undefined"
      @click="!compact && instance.item.notes ? isExpanded = !isExpanded : null"
      @touchstart.passive="handleTouchStart"
      @touchmove="handleTouchMove"
      @touchend.passive="handleTouchEnd"
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

      <!-- Actions -->
      <div v-if="!compact" class="flex items-center gap-1 flex-shrink-0">
        <!-- Info/Collapse icon for cards with notes -->
        <button
          v-if="instance.item.notes"
          class="w-6 h-6 flex items-center justify-center rounded-full text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors"
          @click.stop="isExpanded = !isExpanded"
          :aria-label="isExpanded ? 'Hide details' : 'Show details'"
        >
          <ChevronUp v-if="isExpanded" class="w-4 h-4" />
          <Info v-else class="w-4 h-4" />
        </button>

        <!-- Confirm Button - compact pill style with visible check icon -->
        <button
          v-if="status !== 'confirmed' && status !== 'upcoming'"
          class="w-12 h-9 p-0 rounded-full flex items-center justify-center bg-accent shadow-md hover:shadow-lg active:shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
          :class="{ 'animate-bounce': isConfirming }"
          :disabled="isConfirming"
          @click.stop="handleConfirm"
        >
          <Check class="w-5 h-5 text-white" :stroke-width="2.5" />
        </button>

        <!-- Snooze Button -->
        <button
          v-if="status === 'due' || status === 'overdue'"
          class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted/50 transition-colors"
          @click.stop="showSnoozeOptions = !showSnoozeOptions"
        >
          <Clock class="w-[18px] h-[18px] text-muted-foreground" />
        </button>

        <!-- Undo Button for confirmed cards -->
        <button
          v-if="status === 'confirmed'"
          class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted/50 transition-colors"
          @click.stop="emit('undo')"
          aria-label="Undo confirmation"
        >
          <Undo2 class="w-[18px] h-[18px] text-muted-foreground" />
        </button>
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
    <div v-if="!compact && showSnoozeOptions" class="mt-3 flex items-center gap-2" @click.stop>
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
  </div>
</template>
