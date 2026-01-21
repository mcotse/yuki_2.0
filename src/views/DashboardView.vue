<script setup lang="ts">
import { onMounted, computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useItemsStore } from '@/stores/items'
import { useInstancesStore } from '@/stores/instances'
import { generateInstancesForDate } from '@/services/instanceGenerator'
import { getToday } from '@/utils/date'
import MedicationCard from '@/components/dashboard/MedicationCard.vue'
import { RefreshCw, AlertCircle, ChevronDown, Droplet, Pill, Leaf, Utensils, X } from 'lucide-vue-next'
import type { ScheduledInstance } from '@/types'

const itemsStore = useItemsStore()
const instancesStore = useInstancesStore()

const isLoading = computed(() => itemsStore.isLoading || instancesStore.isLoading)
const error = computed(() => itemsStore.error || instancesStore.error)

// Use storeToRefs to maintain reactivity for computed properties
const { instancesByStatus, pendingCount, confirmedCount } = storeToRefs(instancesStore)

// Filter state
const activeFilter = ref<string | null>(null)

// Collapsible section states
const overdueCollapsed = ref(false)
const completedCollapsed = ref(false)

// Filter options with icons and colors
const filterOptions = [
  { id: 'leftEye', label: 'Left Eye', icon: Droplet, colorClass: 'bg-accent/20 text-accent border-accent/40' },
  { id: 'rightEye', label: 'Right Eye', icon: Droplet, colorClass: 'bg-secondary/20 text-secondary border-secondary/40' },
  { id: 'oral', label: 'Oral', icon: Pill, colorClass: 'bg-blue-500/20 text-blue-600 border-blue-500/40' },
  { id: 'supplement', label: 'Supplements', icon: Leaf, colorClass: 'bg-emerald-500/20 text-emerald-600 border-emerald-500/40' },
  { id: 'food', label: 'Food', icon: Utensils, colorClass: 'bg-amber-500/20 text-amber-600 border-amber-500/40' },
]

// Filter function for instances
function filterInstances(instances: ScheduledInstance[]): ScheduledInstance[] {
  if (!activeFilter.value) return instances
  return instances.filter((instance) => {
    const category = instance.item.category
    const type = instance.item.type
    if (activeFilter.value === 'supplement') return type === 'supplement'
    if (activeFilter.value === 'food') return type === 'food' || category === 'food'
    return category === activeFilter.value
  })
}

// Filtered instances by status
const filteredOverdue = computed(() => filterInstances(instancesByStatus.value.overdue))
const filteredDue = computed(() => filterInstances(instancesByStatus.value.due))
const filteredSnoozed = computed(() => filterInstances(instancesByStatus.value.snoozed))
const filteredUpcoming = computed(() => filterInstances(instancesByStatus.value.upcoming))
const filteredConfirmed = computed(() => filterInstances(instancesByStatus.value.confirmed))

// Toggle filter
function toggleFilter(filterId: string) {
  activeFilter.value = activeFilter.value === filterId ? null : filterId
}

async function loadDashboard() {
  // Load items first
  if (itemsStore.items.length === 0) {
    await itemsStore.fetchItems()
  }

  // Generate instances for today if needed
  const today = getToday()
  await generateInstancesForDate(today, itemsStore.items)

  // Fetch instances for today
  await instancesStore.fetchInstancesForDate(today)
}

async function refreshDashboard() {
  await instancesStore.refreshInstances()
}

function confirmMedication(instanceId: string, overrideConflict: boolean) {
  instancesStore.confirmInstance(instanceId, undefined, overrideConflict)
}

function undoMedication(instanceId: string) {
  instancesStore.undoConfirmation(instanceId)
}

onMounted(loadDashboard)
</script>

<template>
  <main class="p-6 pb-24 max-w-lg mx-auto">
    <!-- Header -->
    <div class="flex items-center justify-between mb-4">
      <div>
        <h1 class="text-2xl font-bold text-foreground">Today</h1>
        <p class="text-sm text-muted-foreground">
          {{ pendingCount }} pending, {{ confirmedCount }} done
        </p>
      </div>
      <button
        class="p-2 rounded-xl hover:bg-muted/50 transition-colors"
        :disabled="isLoading"
        @click="refreshDashboard"
      >
        <RefreshCw class="w-5 h-5 text-foreground" :class="{ 'animate-spin': isLoading }" />
      </button>
    </div>

    <!-- Filter Tags -->
    <div class="flex flex-wrap gap-2 mb-6 overflow-x-auto pb-1">
      <button
        v-for="filter in filterOptions"
        :key="filter.id"
        class="filter-tag group"
        :class="[
          activeFilter === filter.id
            ? filter.colorClass + ' border-2 shadow-sm'
            : 'bg-muted/50 text-muted-foreground border border-border hover:border-foreground/30',
        ]"
        @click="toggleFilter(filter.id)"
      >
        <component :is="filter.icon" class="w-3.5 h-3.5" />
        <span class="text-xs font-semibold whitespace-nowrap">{{ filter.label }}</span>
        <X
          v-if="activeFilter === filter.id"
          class="w-3 h-3 ml-0.5 opacity-60 group-hover:opacity-100"
        />
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading && instancesByStatus.due.length === 0" class="py-12 text-center">
      <RefreshCw class="w-8 h-8 mx-auto text-accent animate-spin mb-4" />
      <p class="text-muted-foreground">Loading medications...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="card p-6 bg-error/10 border-error">
      <div class="flex items-center gap-3 text-error">
        <AlertCircle class="w-5 h-5" />
        <span>{{ error }}</span>
      </div>
    </div>

    <!-- Dashboard Content -->
    <template v-else>
      <!-- Overdue Section -->
      <section v-if="instancesByStatus.overdue.length > 0" class="mb-8">
        <button
          class="flex items-center gap-2 w-full text-left mb-3 group"
          @click="overdueCollapsed = !overdueCollapsed"
        >
          <h2 class="text-sm font-bold text-error uppercase tracking-wider">
            Overdue
          </h2>
          <span class="text-xs text-error/70 font-medium">({{ filteredOverdue.length }})</span>
          <ChevronDown
            class="w-4 h-4 text-error/70 transition-transform duration-300"
            :class="{ '-rotate-180': overdueCollapsed }"
          />
        </button>
        <Transition name="collapse">
          <div v-show="!overdueCollapsed" class="collapse-content">
            <TransitionGroup name="card-filter" tag="div" class="space-y-3">
              <MedicationCard
                v-for="instance in filteredOverdue"
                :key="instance.id"
                :instance="instance"
                status="overdue"
                @confirm="confirmMedication(instance.id, $event)"
                @snooze="instancesStore.snoozeInstance(instance.id, $event)"
              />
            </TransitionGroup>
          </div>
        </Transition>
      </section>

      <!-- Due Now Section -->
      <section v-if="instancesByStatus.due.length > 0" class="mb-8">
        <h2 class="text-sm font-bold text-accent uppercase tracking-wider mb-3">
          Due Now
          <span v-if="activeFilter" class="text-xs text-accent/70 font-medium ml-1">({{ filteredDue.length }})</span>
        </h2>
        <TransitionGroup name="card-filter" tag="div" class="space-y-3">
          <MedicationCard
            v-for="instance in filteredDue"
            :key="instance.id"
            :instance="instance"
            status="due"
            @confirm="confirmMedication(instance.id, $event)"
            @snooze="instancesStore.snoozeInstance(instance.id, $event)"
          />
        </TransitionGroup>
      </section>

      <!-- Snoozed Section -->
      <section v-if="instancesByStatus.snoozed.length > 0" class="mb-8">
        <h2 class="text-sm font-bold text-tertiary uppercase tracking-wider mb-3">
          Snoozed
          <span v-if="activeFilter" class="text-xs text-tertiary/70 font-medium ml-1">({{ filteredSnoozed.length }})</span>
        </h2>
        <TransitionGroup name="card-filter" tag="div" class="space-y-3">
          <MedicationCard
            v-for="instance in filteredSnoozed"
            :key="instance.id"
            :instance="instance"
            status="snoozed"
            @confirm="confirmMedication(instance.id, $event)"
          />
        </TransitionGroup>
      </section>

      <!-- Upcoming Section -->
      <section v-if="instancesByStatus.upcoming.length > 0" class="mb-8">
        <h2 class="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3">
          Coming Up
          <span v-if="activeFilter" class="text-xs text-muted-foreground/70 font-medium ml-1">({{ filteredUpcoming.length }})</span>
        </h2>
        <TransitionGroup name="card-filter" tag="div" class="space-y-3">
          <MedicationCard
            v-for="instance in filteredUpcoming"
            :key="instance.id"
            :instance="instance"
            status="upcoming"
          />
        </TransitionGroup>
      </section>

      <!-- Completed Section -->
      <section v-if="instancesByStatus.confirmed.length > 0" class="mb-8">
        <button
          class="flex items-center gap-2 w-full text-left mb-3 group"
          @click="completedCollapsed = !completedCollapsed"
        >
          <h2 class="text-sm font-bold text-quaternary uppercase tracking-wider">
            Completed
          </h2>
          <span class="text-xs text-quaternary/70 font-medium">({{ filteredConfirmed.length }})</span>
          <ChevronDown
            class="w-4 h-4 text-quaternary/70 transition-transform duration-300"
            :class="{ '-rotate-180': completedCollapsed }"
          />
        </button>
        <Transition name="collapse">
          <div v-show="!completedCollapsed" class="collapse-content">
            <TransitionGroup name="card-filter" tag="div" class="space-y-3">
              <MedicationCard
                v-for="instance in filteredConfirmed"
                :key="instance.id"
                :instance="instance"
                status="confirmed"
                @undo="undoMedication(instance.id)"
              />
            </TransitionGroup>
          </div>
        </Transition>
      </section>

      <!-- Empty State -->
      <div
        v-if="
          instancesByStatus.overdue.length === 0 &&
          instancesByStatus.due.length === 0 &&
          instancesByStatus.upcoming.length === 0 &&
          instancesByStatus.snoozed.length === 0 &&
          instancesByStatus.confirmed.length === 0
        "
        class="py-12 text-center"
      >
        <div
          class="w-20 h-20 mx-auto mb-4 bg-quaternary/20 rounded-full flex items-center justify-center border-2 border-foreground shadow-sm"
        >
          <span class="text-3xl">🎉</span>
        </div>
        <h2 class="text-lg font-bold text-foreground mb-2">All caught up!</h2>
        <p class="text-muted-foreground">No medications scheduled for today.</p>
      </div>
    </template>
  </main>
</template>
