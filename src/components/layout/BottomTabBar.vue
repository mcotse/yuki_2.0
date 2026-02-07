<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Home, Clock, Settings } from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()

interface TabItem {
  name: string
  path: string
  icon: typeof Home
  label: string
}

const tabs: TabItem[] = [
  { name: 'dashboard', path: '/', icon: Home, label: 'Dashboard' },
  { name: 'history', path: '/history', icon: Clock, label: 'History' },
  { name: 'settings', path: '/settings', icon: Settings, label: 'Settings' },
]

const activeTab = computed(() => route.name as string)

function navigateTo(path: string) {
  router.push(path)
}
</script>

<template>
  <nav
    class="fixed bottom-0 left-0 right-0 z-50 bg-card border-t-2 border-foreground safe-area-bottom"
  >
    <div class="flex justify-around items-center h-16 max-w-lg mx-auto">
      <button
        v-for="tab in tabs"
        :key="tab.name"
        class="flex flex-col items-center justify-center flex-1 h-full transition-all duration-300"
        :class="[
          activeTab === tab.name
            ? 'text-accent'
            : 'text-muted-foreground hover:text-foreground',
        ]"
        @click="navigateTo(tab.path)"
      >
        <!-- Icon container with active indicator -->
        <div
          class="relative flex items-center justify-center w-12 h-8 rounded-full transition-all duration-300"
          :class="[
            activeTab === tab.name
              ? 'bg-accent/10'
              : '',
          ]"
        >
          <component
            :is="tab.icon"
            :size="24"
            :stroke-width="activeTab === tab.name ? 2.5 : 2"
          />
        </div>

        <!-- Label -->
        <span
          class="text-xs font-medium mt-0.5 transition-all duration-300"
          :class="[
            activeTab === tab.name
              ? 'font-bold'
              : '',
          ]"
        >
          {{ tab.label }}
        </span>
      </button>
    </div>
  </nav>
</template>

<style scoped>
/* Safe area padding for iOS devices with home indicator */
.safe-area-bottom {
  padding-bottom: env(safe-area-inset-bottom, 0);
}
</style>
