<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import BottomTabBar from './BottomTabBar.vue'

const route = useRoute()

// Hide tab bar on login page
const showTabBar = computed(() => route.name !== 'login')
</script>

<template>
  <div class="min-h-screen bg-background flex flex-col">
    <!-- Main content area with padding for tab bar -->
    <main class="flex-1 pb-20" :class="{ 'pb-0': !showTabBar }">
      <slot />
    </main>

    <!-- Bottom Tab Bar -->
    <BottomTabBar v-if="showTabBar" />
  </div>
</template>
