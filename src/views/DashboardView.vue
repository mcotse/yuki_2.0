<script setup lang="ts">
import { onMounted, computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useItemsStore } from '@/stores/items'
import { useInstancesStore } from '@/stores/instances'
import { generateInstancesForDate } from '@/services/instanceGenerator'
import { getToday } from '@/utils/date'
import MedicationCard from '@/components/dashboard/MedicationCard.vue'
import QuickLogCard from '@/components/dashboard/QuickLogCard.vue'
import { RefreshCw, AlertCircle, ChevronDown, Droplet, Pill, Leaf, Utensils, X, Filter } from 'lucide-vue-next'
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
const filtersCollapsed = ref(true) // Start collapsed for less intrusive UI
const overdueCollapsed = ref(false)
const upcomingCollapsed = ref(false)
const completedCollapsed = ref(false)

// Upcoming section - show limited items with "load more"
const UPCOMING_INITIAL_COUNT = 3
const upcomingShowAll = ref(false)

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

// Visible upcoming items (limited unless "show all" is enabled)
const visibleUpcoming = computed(() => {
  if (upcomingShowAll.value) return filteredUpcoming.value
  return filteredUpcoming.value.slice(0, UPCOMING_INITIAL_COUNT)
})

const hasMoreUpcoming = computed(() => filteredUpcoming.value.length > UPCOMING_INITIAL_COUNT)
const hiddenUpcomingCount = computed(() => filteredUpcoming.value.length - UPCOMING_INITIAL_COUNT)

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
  <main class="dashboard-main">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-foreground">Today</h1>
        <p class="text-sm text-muted-foreground">
          {{ pendingCount }} pending, {{ confirmedCount }} done
        </p>
      </div>
      <div class="flex items-center gap-1">
        <!-- Filter Toggle -->
        <button
          class="header-icon-btn relative"
          :class="{ 'header-icon-btn-active': activeFilter }"
          @click="filtersCollapsed = !filtersCollapsed"
          aria-label="Toggle filters"
        >
          <Filter class="w-5 h-5" />
          <span v-if="activeFilter" class="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-accent border-2 border-background" />
        </button>
        <!-- Refresh -->
        <button
          class="header-icon-btn"
          :disabled="isLoading"
          @click="refreshDashboard"
        >
          <RefreshCw class="w-5 h-5" :class="{ 'animate-spin': isLoading }" />
        </button>
      </div>
    </div>

    <!-- Filter Chips - Expandable row -->
    <Transition name="filter-expand">
      <div v-show="!filtersCollapsed" class="filter-bar">
        <button
          v-for="filter in filterOptions"
          :key="filter.id"
          class="filter-chip group"
          :class="[
            activeFilter === filter.id
              ? filter.colorClass + ' border shadow-sm'
              : 'bg-muted/40 text-muted-foreground border border-transparent hover:bg-muted/60',
          ]"
          @click="toggleFilter(filter.id)"
        >
          <component :is="filter.icon" class="w-3 h-3" />
          <span class="text-xs font-medium whitespace-nowrap">{{ filter.label }}</span>
          <X
            v-if="activeFilter === filter.id"
            class="w-2.5 h-2.5 opacity-60 group-hover:opacity-100"
          />
        </button>
      </div>
    </Transition>

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
      <!-- Quick Log Card - At the top for easy access -->
      <section class="mb-6">
        <QuickLogCard @logged="refreshDashboard" />
      </section>

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
            <div class="card-list-wrapper">
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
          </div>
        </Transition>
      </section>

      <!-- Due Now Section -->
      <section v-if="instancesByStatus.due.length > 0" class="mb-8">
        <h2 class="text-sm font-bold text-accent uppercase tracking-wider mb-3">
          Due Now
          <span v-if="activeFilter" class="text-xs text-accent/70 font-medium ml-1">({{ filteredDue.length }})</span>
        </h2>
        <div class="card-list-wrapper">
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
        </div>
      </section>

      <!-- Snoozed Section -->
      <section v-if="instancesByStatus.snoozed.length > 0" class="mb-8">
        <h2 class="text-sm font-bold text-tertiary uppercase tracking-wider mb-3">
          Snoozed
          <span v-if="activeFilter" class="text-xs text-tertiary/70 font-medium ml-1">({{ filteredSnoozed.length }})</span>
        </h2>
        <div class="card-list-wrapper">
          <TransitionGroup name="card-filter" tag="div" class="space-y-3">
            <MedicationCard
              v-for="instance in filteredSnoozed"
              :key="instance.id"
              :instance="instance"
              status="snoozed"
              @confirm="confirmMedication(instance.id, $event)"
            />
          </TransitionGroup>
        </div>
      </section>

      <!-- Upcoming Section -->
      <section v-if="instancesByStatus.upcoming.length > 0" class="mb-8">
        <button
          class="flex items-center gap-2 w-full text-left mb-3 group"
          @click="upcomingCollapsed = !upcomingCollapsed"
        >
          <h2 class="text-sm font-bold text-muted-foreground uppercase tracking-wider">
            Coming Up
          </h2>
          <span class="text-xs text-muted-foreground/70 font-medium">({{ filteredUpcoming.length }})</span>
          <ChevronDown
            class="w-4 h-4 text-muted-foreground/70 transition-transform duration-300"
            :class="{ '-rotate-180': upcomingCollapsed }"
          />
        </button>
        <Transition name="collapse">
          <div v-show="!upcomingCollapsed" class="collapse-content">
            <div class="card-list-wrapper">
              <TransitionGroup name="card-filter" tag="div" class="space-y-3">
                <MedicationCard
                  v-for="instance in visibleUpcoming"
                  :key="instance.id"
                  :instance="instance"
                  status="upcoming"
                />
              </TransitionGroup>
              <!-- Show More / Show Less Button -->
              <div v-if="hasMoreUpcoming" class="mt-4 text-center">
                <button
                  class="show-more-btn"
                  @click="upcomingShowAll = !upcomingShowAll"
                >
                  <span v-if="!upcomingShowAll">
                    Show {{ hiddenUpcomingCount }} more
                  </span>
                  <span v-else>Show less</span>
                  <ChevronDown
                    class="w-4 h-4 transition-transform duration-200"
                    :class="{ '-rotate-180': upcomingShowAll }"
                  />
                </button>
              </div>
            </div>
          </div>
        </Transition>
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
            <div class="card-list-wrapper">
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
