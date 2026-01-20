import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { localStorageWrapper } from '@/utils/storage'
import type { AuthUser } from '@/types'

const SESSION_DURATION_DAYS = 7
const SESSION_KEY = 'yuki-auth-session'

interface SessionData {
  user: AuthUser
  expiresAt: string
  lastActivity: string
}

/**
 * Simple user credentials mapping
 * In production, this would be validated against Supabase
 */
const USER_CREDENTIALS: Record<string, AuthUser> = {
  yuki2026: {
    id: 'matthew-uuid',
    username: 'matthew',
    displayName: 'Matthew',
    role: 'admin',
  },
  // Add more users as needed
}

export const useAuthStore = defineStore(
  'auth',
  () => {
    // State
    const user = ref<AuthUser | null>(null)
    const sessionExpiresAt = ref<Date | null>(null)
    const isInitialized = ref(false)

    // Getters
    const isAuthenticated = computed(() => !!user.value)
    const isAdmin = computed(() => user.value?.role === 'admin')
    const currentUser = computed(() => user.value)

    // Actions

    /**
     * Initialize auth state from stored session
     */
    function initialize() {
      if (isInitialized.value) return

      const stored = localStorageWrapper.getItem(SESSION_KEY)
      if (stored) {
        try {
          const session: SessionData = JSON.parse(stored)
          const expiresAt = new Date(session.expiresAt)

          if (expiresAt > new Date()) {
            // Session still valid
            user.value = session.user
            sessionExpiresAt.value = expiresAt
            // Refresh activity timestamp
            refreshSession()
          } else {
            // Session expired
            clearSession()
          }
        } catch {
          clearSession()
        }
      }

      isInitialized.value = true
    }

    /**
     * Login with password
     * Password maps directly to user identity
     */
    function login(password: string): { success: boolean; error?: string } {
      const credentials = USER_CREDENTIALS[password]

      if (!credentials) {
        return { success: false, error: 'Invalid password' }
      }

      // Set user
      user.value = credentials

      // Set session expiry (7 days from now)
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + SESSION_DURATION_DAYS)
      sessionExpiresAt.value = expiresAt

      // Persist session
      persistSession()

      return { success: true }
    }

    /**
     * Logout and clear session
     */
    function logout() {
      clearSession()
    }

    /**
     * Refresh session on activity
     * Extends expiry if user is active
     */
    function refreshSession() {
      if (!user.value) return

      // Extend session by 7 days from now
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + SESSION_DURATION_DAYS)
      sessionExpiresAt.value = expiresAt

      persistSession()
    }

    /**
     * Check if session is valid
     */
    function isSessionValid(): boolean {
      if (!user.value || !sessionExpiresAt.value) return false
      return sessionExpiresAt.value > new Date()
    }

    /**
     * Persist session to localStorage
     */
    function persistSession() {
      if (!user.value || !sessionExpiresAt.value) return

      const session: SessionData = {
        user: user.value,
        expiresAt: sessionExpiresAt.value.toISOString(),
        lastActivity: new Date().toISOString(),
      }

      localStorageWrapper.setItem(SESSION_KEY, JSON.stringify(session))
    }

    /**
     * Clear session from state and storage
     */
    function clearSession() {
      user.value = null
      sessionExpiresAt.value = null
      localStorage.removeItem(SESSION_KEY)
    }

    return {
      // State
      user,
      sessionExpiresAt,
      isInitialized,

      // Getters
      isAuthenticated,
      isAdmin,
      currentUser,

      // Actions
      initialize,
      login,
      logout,
      refreshSession,
      isSessionValid,
    }
  },
  {
    persist: false, // We handle persistence manually for more control
  },
)
