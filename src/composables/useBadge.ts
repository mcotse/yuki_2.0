import { watch, ref } from 'vue'
import { useInstancesStore } from '@/stores/instances'

/**
 * Badge API composable for PWA app badge
 * Updates the app badge with count of pending (due + overdue) items
 * Handles iOS gracefully (no native support)
 */
export function useBadge() {
  const instancesStore = useInstancesStore()
  const isSupported = ref(false)
  const lastCount = ref(0)

  // Check for Badge API support
  if ('setAppBadge' in navigator) {
    isSupported.value = true
  }

  /**
   * Set the app badge count
   * Falls back silently on unsupported platforms
   */
  async function setBadge(count: number): Promise<boolean> {
    if (!isSupported.value) return false

    try {
      if (count > 0) {
        await navigator.setAppBadge(count)
      } else {
        await navigator.clearAppBadge()
      }
      lastCount.value = count
      return true
    } catch (error) {
      // Permission denied or other error - fail silently
      console.warn('Badge API error:', error)
      return false
    }
  }

  /**
   * Clear the app badge
   */
  async function clearBadge(): Promise<boolean> {
    return setBadge(0)
  }

  /**
   * Update badge from store state
   * Called automatically when pendingCount changes
   */
  async function updateFromStore(): Promise<void> {
    const count =
      instancesStore.instancesByStatus.overdue.length +
      instancesStore.instancesByStatus.due.length

    await setBadge(count)
  }

  /**
   * Initialize badge watching
   * Sets up reactive updates when pending count changes
   */
  function initBadgeWatch(): void {
    // Watch the computed values that make up the badge count
    watch(
      () =>
        instancesStore.instancesByStatus.overdue.length +
        instancesStore.instancesByStatus.due.length,
      async (newCount) => {
        await setBadge(newCount)
      },
      { immediate: true }
    )
  }

  return {
    isSupported,
    lastCount,
    setBadge,
    clearBadge,
    updateFromStore,
    initBadgeWatch,
  }
}
