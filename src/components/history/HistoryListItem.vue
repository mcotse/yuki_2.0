<script setup lang="ts">
import { computed } from 'vue'
import type { HistoryEntry as HistoryEntryType } from '@/stores/history'
import { useAuthStore } from '@/stores/auth'
import { formatTime } from '@/utils/date'
import { Eye, Pill, Utensils, Edit2 } from 'lucide-vue-next'

const props = defineProps<{
  entry: HistoryEntryType
}>()

const emit = defineEmits<{
  edit: [entry: HistoryEntryType]
}>()

const authStore = useAuthStore()

const locationBadge = computed(() => {
  const item = props.entry.instance.item
  if (item.location === 'LEFT eye') return { text: 'L', color: 'bg-accent', textColor: 'text-white' }
  if (item.location === 'RIGHT eye') return { text: 'R', color: 'bg-secondary', textColor: 'text-white' }
  if (item.location === 'ORAL') return { text: 'O', color: 'bg-tertiary', textColor: 'text-foreground' }
  return null
})

const itemIcon = computed(() => {
  const item = props.entry.instance.item
  if (item.category === 'leftEye' || item.category === 'rightEye') return Eye
  if (item.category === 'food') return Utensils
  return Pill
})

function handleEdit() {
  emit('edit', props.entry)
}
</script>

<template>
  <div class="history-list-item group">
    <div class="flex items-center gap-3 py-3 px-4">
      <!-- Location Badge / Icon -->
      <div
        v-if="locationBadge"
        class="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 transition-transform group-hover:scale-105"
        :class="[locationBadge.color, locationBadge.textColor]"
      >
        {{ locationBadge.text }}
      </div>
      <div
        v-else
        class="w-8 h-8 rounded-lg bg-quaternary/20 flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105"
      >
        <component :is="itemIcon" class="w-4 h-4 text-quaternary" />
      </div>

      <!-- Main Content -->
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2">
          <span class="font-medium text-foreground truncate">
            {{ entry.instance.item.name }}
          </span>
          <!-- Ad-hoc Badge -->
          <span
            v-if="entry.instance.is_adhoc"
            class="px-1.5 py-0.5 text-[10px] font-semibold bg-tertiary/20 text-tertiary rounded"
          >
            Ad-hoc
          </span>
        </div>
        <div class="flex items-center gap-2 text-xs text-muted-foreground">
          <span v-if="entry.instance.item.dose">{{ entry.instance.item.dose }}</span>
          <span v-if="entry.instance.item.dose && entry.confirmedByName" class="opacity-50">·</span>
          <span v-if="entry.confirmedByName">{{ entry.confirmedByName }}</span>
        </div>
      </div>

      <!-- Time -->
      <div class="flex items-center gap-2 flex-shrink-0">
        <span class="text-sm font-medium text-muted-foreground tabular-nums">
          {{ formatTime(entry.confirmedAt) }}
        </span>

        <!-- Edit Button (Admin Only) -->
        <button
          v-if="authStore.isAdmin"
          class="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-muted/50 transition-all"
          @click.stop="handleEdit"
        >
          <Edit2 class="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.history-list-item {
  background-color: var(--color-card);
  border-bottom: 1px solid var(--color-border);
  transition: background-color 0.15s ease;
}

.history-list-item:first-child {
  border-top-left-radius: var(--radius-lg);
  border-top-right-radius: var(--radius-lg);
}

.history-list-item:last-child {
  border-bottom: none;
  border-bottom-left-radius: var(--radius-lg);
  border-bottom-right-radius: var(--radius-lg);
}

.history-list-item:hover {
  background-color: var(--color-muted);
}
</style>
