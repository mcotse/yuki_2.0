import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User as FirebaseUser,
} from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import { localStorageWrapper } from '@/utils/storage'
import type { AuthUser } from '@/types'
import { COLLECTIONS } from '@/types/database'

const SESSION_KEY = 'yuki-auth-session'

// Local users for development/testing when Firebase is not configured
const LOCAL_USERS: Record<string, AuthUser> = {
  yuki2026: {
    id: 'local-admin-uuid',
    username: 'matthew',
    displayName: 'Matthew',
    role: 'admin',
  },
  caretaker: {
    id: 'local-user-uuid',
    username: 'caretaker',
    displayName: 'Caretaker',
    role: 'user',
  },
}

interface SessionData {
  user: AuthUser
  lastActivity: string
}

export const useAuthStore = defineStore(
  'auth',
  () => {
    // State
    const user = ref<AuthUser | null>(null)
    const isInitialized = ref(false)
    const isLoading = ref(false)

    // Getters
    const isAuthenticated = computed(() => !!user.value)
    const isAdmin = computed(() => user.value?.role === 'admin')
    const currentUser = computed(() => user.value)
    const sessionExpiresAt = computed(() => null) // Firebase manages session expiry

    // Actions

    /**
     * Fetch user profile from Firestore
     */
    async function fetchUserProfile(firebaseUser: FirebaseUser): Promise<AuthUser | null> {
      if (!db) return null

      try {
        const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, firebaseUser.uid))
        if (userDoc.exists()) {
          const data = userDoc.data()
          return {
            id: firebaseUser.uid,
            username: data.username || firebaseUser.email?.split('@')[0] || 'user',
            displayName: data.display_name || firebaseUser.displayName || 'User',
            role: data.role || 'user',
          }
        }
        // User doc doesn't exist, create minimal profile
        return {
          id: firebaseUser.uid,
          username: firebaseUser.email?.split('@')[0] || 'user',
          displayName: firebaseUser.displayName || 'User',
          role: 'user',
        }
      } catch (error) {
        console.error('Error fetching user profile:', error)
        return null
      }
    }

    /**
     * Initialize auth state from Firebase
     * Sets up auth state listener for persistence
     */
    function initialize() {
      if (isInitialized.value) return

      // Try to restore from local storage first (for offline support)
      const stored = localStorageWrapper.getItem(SESSION_KEY)
      if (stored) {
        try {
          const session: SessionData = JSON.parse(stored)
          user.value = session.user
        } catch {
          // Invalid stored session
        }
      }

      // Set up Firebase auth state listener
      if (auth) {
        onAuthStateChanged(auth, async (firebaseUser) => {
          if (firebaseUser) {
            // User is signed in
            const profile = await fetchUserProfile(firebaseUser)
            if (profile) {
              user.value = profile
              persistSession()
            }
          } else {
            // User is signed out
            clearSession()
          }
        })
      }

      // Listen for storage events to sync logout across tabs
      window.addEventListener('storage', (event) => {
        if (event.key === SESSION_KEY && event.newValue === null) {
          user.value = null
        }
      })

      isInitialized.value = true
    }

    /**
     * Login with password
     * Uses local auth for development, Firebase for production
     */
    async function login(password: string): Promise<{ success: boolean; error?: string }> {
      isLoading.value = true

      try {
        // If Firebase is not configured, use local authentication
        if (!auth) {
          const localUser = LOCAL_USERS[password]
          if (localUser) {
            user.value = localUser
            persistSession()
            return { success: true }
          }
          return { success: false, error: 'Invalid password' }
        }

        // Firebase authentication
        const email = `${password}@yuki.app`
        const credential = await signInWithEmailAndPassword(auth, email, password)

        // Fetch user profile from Firestore
        const profile = await fetchUserProfile(credential.user)
        if (profile) {
          user.value = profile
          persistSession()
          return { success: true }
        }

        return { success: false, error: 'Failed to load user profile' }
      } catch (error: unknown) {
        const firebaseError = error as { code?: string }
        if (firebaseError.code === 'auth/user-not-found' || firebaseError.code === 'auth/wrong-password') {
          return { success: false, error: 'Invalid password' }
        }
        if (firebaseError.code === 'auth/invalid-credential') {
          return { success: false, error: 'Invalid password' }
        }
        console.error('Login error:', error)
        return { success: false, error: 'Login failed. Please try again.' }
      } finally {
        isLoading.value = false
      }
    }

    /**
     * Logout and clear session
     */
    async function logout() {
      if (auth) {
        try {
          await signOut(auth)
        } catch (error) {
          console.error('Logout error:', error)
        }
      }
      clearSession()
    }

    /**
     * Refresh session on activity
     */
    function refreshSession() {
      if (!user.value) return
      persistSession()
    }

    /**
     * Check if session is valid
     */
    function isSessionValid(): boolean {
      return !!user.value
    }

    /**
     * Persist session to localStorage (for offline support)
     */
    function persistSession() {
      if (!user.value) return

      const session: SessionData = {
        user: user.value,
        lastActivity: new Date().toISOString(),
      }

      localStorageWrapper.setItem(SESSION_KEY, JSON.stringify(session))
    }

    /**
     * Clear session from state and storage
     */
    function clearSession() {
      user.value = null
      localStorage.removeItem(SESSION_KEY)
    }

    return {
      // State
      user,
      sessionExpiresAt,
      isInitialized,
      isLoading,

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
