import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'

/**
 * Auth composable for role-based access control
 * Provides reactive auth state and role checking utilities
 */
export function useAuth() {
  const authStore = useAuthStore()

  const isAuthenticated = computed(() => authStore.isAuthenticated)
  const isAdmin = computed(() => authStore.isAdmin)
  const currentUser = computed(() => authStore.currentUser)
  const displayName = computed(() => authStore.currentUser?.displayName ?? 'User')

  /**
   * Check if user has required role
   * Admin role includes access to all user-level features
   */
  function hasRole(role: 'admin' | 'user'): boolean {
    if (!authStore.isAuthenticated) return false
    if (role === 'user') return true // All authenticated users have user role
    return authStore.isAdmin
  }

  /**
   * Check if user can perform admin actions
   * Use this to guard admin-only UI elements
   */
  function canManageMedications(): boolean {
    return authStore.isAdmin
  }

  /**
   * Check if user can edit confirmation history
   * Only admins can edit past confirmations
   */
  function canEditHistory(): boolean {
    return authStore.isAdmin
  }

  return {
    isAuthenticated,
    isAdmin,
    currentUser,
    displayName,
    hasRole,
    canManageMedications,
    canEditHistory,
  }
}
