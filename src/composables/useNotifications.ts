import { ref, computed, onMounted } from 'vue'
import { notificationService } from '@/services/notificationService'

/**
 * Composable for notification permission handling and UI state
 * Handles permission requests, denied states, and in-app fallbacks
 */
export function useNotifications() {
  const permissionState = ref<NotificationPermission>('default')
  const isRequesting = ref(false)
  const showInAppFallback = ref(false)

  // Check if notifications are supported
  const isSupported = computed(() => notificationService.isSupported)

  // Check if permission is granted
  const isGranted = computed(() => permissionState.value === 'granted')

  // Check if permission is denied
  const isDenied = computed(() => permissionState.value === 'denied')

  // Check if we should prompt for permission
  const shouldPrompt = computed(
    () => isSupported.value && permissionState.value === 'default'
  )

  /**
   * Update permission state from current browser state
   */
  function updatePermissionState() {
    if (!isSupported.value) {
      permissionState.value = 'denied'
      return
    }
    permissionState.value = Notification.permission
    showInAppFallback.value = permissionState.value === 'denied'
  }

  /**
   * Request notification permission from the user
   * Returns true if granted, false otherwise
   */
  async function requestPermission(): Promise<boolean> {
    if (!isSupported.value) return false
    if (permissionState.value === 'granted') return true
    if (permissionState.value === 'denied') return false

    isRequesting.value = true
    try {
      const granted = await notificationService.requestPermission()
      updatePermissionState()
      return granted
    } finally {
      isRequesting.value = false
    }
  }

  /**
   * Enable in-app fallback mode
   * Called when user acknowledges they can't enable notifications
   */
  function enableInAppFallback() {
    showInAppFallback.value = true
  }

  /**
   * Get permission status message for UI display
   */
  const statusMessage = computed(() => {
    if (!isSupported.value) {
      return 'Notifications are not supported in this browser'
    }
    if (isGranted.value) {
      return 'Notifications are enabled'
    }
    if (isDenied.value) {
      return 'Notifications are blocked. Enable them in your browser settings.'
    }
    return 'Enable notifications to get reminders'
  })

  // Initialize on mount
  onMounted(() => {
    updatePermissionState()
  })

  return {
    // State
    permissionState,
    isRequesting,
    showInAppFallback,

    // Computed
    isSupported,
    isGranted,
    isDenied,
    shouldPrompt,
    statusMessage,

    // Actions
    requestPermission,
    enableInAppFallback,
    updatePermissionState,
  }
}
