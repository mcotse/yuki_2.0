import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '../auth'

// Mock Firebase Auth
vi.mock('firebase/auth', () => ({
  signInWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChanged: vi.fn(() => {
    // Return unsubscribe function
    return () => {}
  }),
}))

// Mock Firebase Firestore
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  getDoc: vi.fn(),
}))

// Mock Firebase instances
vi.mock('@/lib/firebase', () => ({
  auth: {},
  db: {},
}))

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
  }
})()

Object.defineProperty(window, 'localStorage', { value: localStorageMock })

describe('auth store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  describe('initial state', () => {
    it('starts with no authenticated user', () => {
      const store = useAuthStore()
      expect(store.user).toBeNull()
      expect(store.isAuthenticated).toBe(false)
      expect(store.isAdmin).toBe(false)
    })
  })

  describe('login', () => {
    it('logs in successfully with valid credentials', async () => {
      const { signInWithEmailAndPassword } = await import('firebase/auth')
      const { getDoc } = await import('firebase/firestore')

      // Mock successful sign in
      vi.mocked(signInWithEmailAndPassword).mockResolvedValue({
        user: { uid: 'test-uid', email: 'yuki2026@yuki.app' },
      } as never)

      // Mock user profile fetch
      vi.mocked(getDoc).mockResolvedValue({
        exists: () => true,
        data: () => ({
          username: 'matthew',
          display_name: 'Matthew',
          role: 'admin',
        }),
      } as never)

      const store = useAuthStore()
      const result = await store.login('yuki2026')

      expect(result.success).toBe(true)
      expect(store.isAuthenticated).toBe(true)
      expect(store.user?.username).toBe('matthew')
      expect(store.user?.role).toBe('admin')
    })

    it('fails with invalid credentials', async () => {
      const { signInWithEmailAndPassword } = await import('firebase/auth')

      // Mock failed sign in
      vi.mocked(signInWithEmailAndPassword).mockRejectedValue({
        code: 'auth/invalid-credential',
      })

      const store = useAuthStore()
      const result = await store.login('wrongpassword')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid password')
      expect(store.isAuthenticated).toBe(false)
    })

    it('sets admin status for admin users', async () => {
      const { signInWithEmailAndPassword } = await import('firebase/auth')
      const { getDoc } = await import('firebase/firestore')

      vi.mocked(signInWithEmailAndPassword).mockResolvedValue({
        user: { uid: 'test-uid', email: 'yuki2026@yuki.app' },
      } as never)

      vi.mocked(getDoc).mockResolvedValue({
        exists: () => true,
        data: () => ({
          username: 'matthew',
          display_name: 'Matthew',
          role: 'admin',
        }),
      } as never)

      const store = useAuthStore()
      await store.login('yuki2026')

      expect(store.isAdmin).toBe(true)
    })
  })

  describe('logout', () => {
    it('clears user session', async () => {
      const { signInWithEmailAndPassword, signOut } = await import('firebase/auth')
      const { getDoc } = await import('firebase/firestore')

      // Set up logged in state
      vi.mocked(signInWithEmailAndPassword).mockResolvedValue({
        user: { uid: 'test-uid', email: 'yuki2026@yuki.app' },
      } as never)

      vi.mocked(getDoc).mockResolvedValue({
        exists: () => true,
        data: () => ({
          username: 'matthew',
          display_name: 'Matthew',
          role: 'admin',
        }),
      } as never)

      vi.mocked(signOut).mockResolvedValue(undefined)

      const store = useAuthStore()
      await store.login('yuki2026')
      expect(store.isAuthenticated).toBe(true)

      await store.logout()

      expect(store.isAuthenticated).toBe(false)
      expect(store.user).toBeNull()
      expect(store.sessionExpiresAt).toBeNull()
    })
  })

  describe('session persistence', () => {
    it('persists session to localStorage on login', async () => {
      const { signInWithEmailAndPassword } = await import('firebase/auth')
      const { getDoc } = await import('firebase/firestore')

      vi.mocked(signInWithEmailAndPassword).mockResolvedValue({
        user: { uid: 'test-uid', email: 'yuki2026@yuki.app' },
      } as never)

      vi.mocked(getDoc).mockResolvedValue({
        exists: () => true,
        data: () => ({
          username: 'matthew',
          display_name: 'Matthew',
          role: 'admin',
        }),
      } as never)

      const store = useAuthStore()
      await store.login('yuki2026')

      expect(localStorageMock.setItem).toHaveBeenCalled()
    })

    it('restores session from localStorage on initialize', () => {
      const sessionData = {
        user: {
          id: 'matthew-uuid',
          username: 'matthew',
          displayName: 'Matthew',
          role: 'admin',
        },
        lastActivity: new Date().toISOString(),
      }

      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(sessionData))

      const store = useAuthStore()
      store.initialize()

      expect(store.isAuthenticated).toBe(true)
      expect(store.user?.username).toBe('matthew')
    })
  })

  describe('session validation', () => {
    it('returns true for valid session', async () => {
      const { signInWithEmailAndPassword } = await import('firebase/auth')
      const { getDoc } = await import('firebase/firestore')

      vi.mocked(signInWithEmailAndPassword).mockResolvedValue({
        user: { uid: 'test-uid', email: 'yuki2026@yuki.app' },
      } as never)

      vi.mocked(getDoc).mockResolvedValue({
        exists: () => true,
        data: () => ({
          username: 'matthew',
          display_name: 'Matthew',
          role: 'admin',
        }),
      } as never)

      const store = useAuthStore()
      await store.login('yuki2026')

      expect(store.isSessionValid()).toBe(true)
    })

    it('returns false for no session', () => {
      const store = useAuthStore()
      expect(store.isSessionValid()).toBe(false)
    })
  })

  describe('refreshSession', () => {
    it('persists session on activity', async () => {
      const { signInWithEmailAndPassword } = await import('firebase/auth')
      const { getDoc } = await import('firebase/firestore')

      vi.mocked(signInWithEmailAndPassword).mockResolvedValue({
        user: { uid: 'test-uid', email: 'yuki2026@yuki.app' },
      } as never)

      vi.mocked(getDoc).mockResolvedValue({
        exists: () => true,
        data: () => ({
          username: 'matthew',
          display_name: 'Matthew',
          role: 'admin',
        }),
      } as never)

      const store = useAuthStore()
      await store.login('yuki2026')
      localStorageMock.setItem.mockClear()

      store.refreshSession()

      expect(localStorageMock.setItem).toHaveBeenCalled()
      // Session expiry is managed by Firebase, sessionExpiresAt is always null
      expect(store.sessionExpiresAt).toBeNull()
    })

    it('does nothing if not logged in', () => {
      const store = useAuthStore()
      store.refreshSession()

      expect(store.sessionExpiresAt).toBeNull()
      expect(localStorageMock.setItem).not.toHaveBeenCalled()
    })
  })
})
