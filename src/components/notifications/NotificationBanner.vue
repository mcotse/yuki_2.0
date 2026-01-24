<script setup lang="ts">
import { useNotifications } from '@/composables/useNotifications'
import { Bell, BellOff, X } from 'lucide-vue-next'

const {
  isSupported,
  isGranted,
  isDenied,
  shouldPrompt,
  isRequesting,
  requestPermission,
  enableInAppFallback,
} = useNotifications()

const emit = defineEmits<{
  dismiss: []
}>()

async function handleEnable() {
  await requestPermission()
}

function handleDismiss() {
  enableInAppFallback()
  emit('dismiss')
}
</script>

<template>
  <!-- Permission Prompt Banner -->
  <div
    v-if="shouldPrompt"
    class="card p-4 bg-accent/10 border-accent/30"
  >
    <div class="flex items-start gap-3">
      <div class="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center flex-shrink-0">
        <Bell class="w-5 h-5 text-accent" />
      </div>
      <div class="flex-1">
        <h3 class="font-semibold text-foreground">Enable Notifications</h3>
        <p class="text-sm text-muted-foreground mt-1">
          Get reminders when medications are due
        </p>
        <div class="flex gap-2 mt-3">
          <button
            class="px-4 py-2 rounded-lg bg-accent text-white font-medium text-sm hover:bg-accent/90 transition-colors disabled:opacity-50"
            :disabled="isRequesting"
            @click="handleEnable"
          >
            {{ isRequesting ? 'Enabling...' : 'Enable' }}
          </button>
          <button
            class="px-4 py-2 rounded-lg text-muted-foreground text-sm hover:bg-muted/50 transition-colors"
            @click="handleDismiss"
          >
            Not now
          </button>
        </div>
      </div>
      <button
        class="p-1 rounded-lg hover:bg-muted/50 transition-colors"
        @click="handleDismiss"
      >
        <X class="w-4 h-4 text-muted-foreground" />
      </button>
    </div>
  </div>

  <!-- Denied State Banner -->
  <div
    v-else-if="isDenied && isSupported"
    class="card p-4 bg-tertiary/10 border-tertiary/30"
  >
    <div class="flex items-start gap-3">
      <div class="w-10 h-10 rounded-xl bg-tertiary/20 flex items-center justify-center flex-shrink-0">
        <BellOff class="w-5 h-5 text-tertiary" />
      </div>
      <div class="flex-1">
        <h3 class="font-semibold text-foreground">Notifications Blocked</h3>
        <p class="text-sm text-muted-foreground mt-1">
          To enable notifications, check your browser settings for this site
        </p>
      </div>
      <button
        class="p-1 rounded-lg hover:bg-muted/50 transition-colors"
        @click="handleDismiss"
      >
        <X class="w-4 h-4 text-muted-foreground" />
      </button>
    </div>
  </div>

  <!-- Granted Confirmation (optional, shows briefly) -->
  <div
    v-else-if="isGranted"
    class="hidden"
  >
    <!-- Notifications enabled, no banner needed -->
  </div>
</template>
