<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useItemsStore } from '@/stores/items'
import { useInstancesStore } from '@/stores/instances'
import { generateInstancesForDate } from '@/services/instanceGenerator'
import { getToday } from '@/utils/date'
import MedicationCard from '@/components/dashboard/MedicationCard.vue'
import { RefreshCw, AlertCircle } from 'lucide-vue-next'

const itemsStore = useItemsStore()
const instancesStore = useInstancesStore()

const isLoading = computed(() => itemsStore.isLoading || instancesStore.isLoading)
const error = computed(() => itemsStore.error || instancesStore.error)

const { instancesByStatus, pendingCount, confirmedCount } = instancesStore

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

onMounted(loadDashboard)
</script>

<template>
  <main class="p-6 pb-24 max-w-lg mx-auto">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
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
        <h2 class="text-sm font-bold text-error uppercase tracking-wider mb-3">
          Overdue
        </h2>
        <div class="space-y-3">
          <MedicationCard
            v-for="instance in instancesByStatus.overdue"
            :key="instance.id"
            :instance="instance"
            status="overdue"
            @confirm="instancesStore.confirmInstance(instance.id)"
            @snooze="instancesStore.snoozeInstance(instance.id, $event)"
          />
        </div>
      </section>

      <!-- Due Now Section -->
      <section v-if="instancesByStatus.due.length > 0" class="mb-8">
        <h2 class="text-sm font-bold text-accent uppercase tracking-wider mb-3">
          Due Now
        </h2>
        <div class="space-y-3">
          <MedicationCard
            v-for="instance in instancesByStatus.due"
            :key="instance.id"
            :instance="instance"
            status="due"
            @confirm="instancesStore.confirmInstance(instance.id)"
            @snooze="instancesStore.snoozeInstance(instance.id, $event)"
          />
        </div>
      </section>

      <!-- Snoozed Section -->
      <section v-if="instancesByStatus.snoozed.length > 0" class="mb-8">
        <h2 class="text-sm font-bold text-tertiary uppercase tracking-wider mb-3">
          Snoozed
        </h2>
        <div class="space-y-3">
          <MedicationCard
            v-for="instance in instancesByStatus.snoozed"
            :key="instance.id"
            :instance="instance"
            status="snoozed"
            @confirm="instancesStore.confirmInstance(instance.id)"
          />
        </div>
      </section>

      <!-- Upcoming Section -->
      <section v-if="instancesByStatus.upcoming.length > 0" class="mb-8">
        <h2 class="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3">
          Coming Up
        </h2>
        <div class="space-y-3">
          <MedicationCard
            v-for="instance in instancesByStatus.upcoming"
            :key="instance.id"
            :instance="instance"
            status="upcoming"
          />
        </div>
      </section>

      <!-- Completed Section -->
      <section v-if="instancesByStatus.confirmed.length > 0" class="mb-8">
        <h2 class="text-sm font-bold text-quaternary uppercase tracking-wider mb-3">
          Completed
        </h2>
        <div class="space-y-3">
          <MedicationCard
            v-for="instance in instancesByStatus.confirmed"
            :key="instance.id"
            :instance="instance"
            status="confirmed"
          />
        </div>
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
