<script setup lang="ts">
import { ref, computed } from 'vue'
import type { HistoryEntry as HistoryEntryType } from '@/stores/history'
import { useAuthStore } from '@/stores/auth'
import { formatTime } from '@/utils/date'
import { Clock, User, Edit2, Check, ChevronDown, ChevronUp } from 'lucide-vue-next'

const props = defineProps<{
  entry: HistoryEntryType
}>()

const emit = defineEmits<{
  edit: [entry: HistoryEntryType]
}>()

const authStore = useAuthStore()
const isExpanded = ref(false)

const locationBadge = computed(() => {
  const item = props.entry.instance.item
  if (item.location === 'LEFT eye') return { text: 'L', color: 'bg-accent' }
  if (item.location === 'RIGHT eye') return { text: 'R', color: 'bg-secondary' }
  if (item.location === 'ORAL') return { text: 'O', color: 'bg-tertiary' }
  return null
})

function toggleExpanded() {
  isExpanded.value = !isExpanded.value
}

function handleEdit() {
  emit('edit', props.entry)
}
</script>

<template>
  <div class="card overflow-hidden">
    <div class="p-4">
      <div class="flex items-start gap-3">
        <!-- Location Badge -->
        <div
          v-if="locationBadge"
          class="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
          :class="locationBadge.color"
        >
          {{ locationBadge.text }}
        </div>
        <div
          v-else
          class="w-10 h-10 rounded-xl bg-quaternary flex items-center justify-center flex-shrink-0"
        >
          <Check class="w-5 h-5 text-foreground" />
        </div>

        <!-- Content -->
        <div class="flex-1 min-w-0" @click="toggleExpanded">
          <div class="flex items-start justify-between gap-2">
            <div>
              <h3 class="font-semibold text-foreground truncate">
                {{ entry.instance.item.name }}
              </h3>
              <p v-if="entry.instance.item.dose" class="text-sm text-muted-foreground">
                {{ entry.instance.item.dose }}
              </p>
            </div>

            <!-- Actions -->
            <div class="flex items-center gap-1">
              <!-- Edit Button (Admin Only) -->
              <button
                v-if="authStore.isAdmin"
                class="p-2 rounded-lg hover:bg-muted/50 transition-colors"
                @click.stop="handleEdit"
              >
                <Edit2 class="w-4 h-4 text-muted-foreground" />
              </button>

              <!-- Expand Button -->
              <button
                class="p-2 rounded-lg hover:bg-muted/50 transition-colors"
                @click.stop="toggleExpanded"
              >
                <ChevronDown v-if="!isExpanded" class="w-4 h-4 text-muted-foreground" />
                <ChevronUp v-else class="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
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

    <!-- Expanded Details -->
    <div v-if="isExpanded" class="px-4 pb-4 border-t border-muted">
      <div class="pt-3 space-y-2 text-sm">
        <!-- Scheduled Time -->
        <div class="flex justify-between">
          <span class="text-muted-foreground">Scheduled</span>
          <span class="text-foreground">
            {{ formatTime(new Date(entry.instance.scheduled_time)) }}
          </span>
        </div>

        <!-- Confirmed Time -->
        <div class="flex justify-between">
          <span class="text-muted-foreground">Confirmed</span>
          <span class="text-foreground">
            {{ formatTime(entry.confirmedAt) }}
          </span>
        </div>

        <!-- Confirmed By -->
        <div v-if="entry.confirmedByName" class="flex justify-between">
          <span class="text-muted-foreground">Confirmed by</span>
          <span class="text-foreground">{{ entry.confirmedByName }}</span>
        </div>

        <!-- Location -->
        <div v-if="entry.instance.item.location" class="flex justify-between">
          <span class="text-muted-foreground">Location</span>
          <span class="text-foreground">{{ entry.instance.item.location }}</span>
        </div>

        <!-- Notes -->
        <div v-if="entry.instance.notes" class="pt-2">
          <span class="text-muted-foreground">Notes:</span>
          <p class="text-foreground mt-1 italic">"{{ entry.instance.notes }}"</p>
        </div>
      </div>
    </div>
  </div>
</template>
