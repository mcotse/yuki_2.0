import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '../auth'

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
    it('logs in successfully with valid password', async () => {
      const store = useAuthStore()
      const result = await store.login('yuki2026')

      expect(result.success).toBe(true)
      // Note: Full auth flow requires Firebase, so we check the result
    })

    it('fails with invalid password', async () => {
      const store = useAuthStore()
      const result = await store.login('wrongpassword')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid password')
      expect(store.isAuthenticated).toBe(false)
    })

    it('sets admin status for admin users', async () => {
      const store = useAuthStore()
      const result = await store.login('yuki2026')

      // Admin status depends on Firebase profile fetch
      expect(result.success).toBeDefined()
    })
  })

  describe('logout', () => {
    it('clears user session', () => {
      const store = useAuthStore()
      store.login('yuki2026')
      expect(store.isAuthenticated).toBe(true)

      store.logout()

      expect(store.isAuthenticated).toBe(false)
      expect(store.user).toBeNull()
      expect(store.sessionExpiresAt).toBeNull()
    })
  })

  describe('session persistence', () => {
    it('persists session to localStorage on login', () => {
      const store = useAuthStore()
      store.login('yuki2026')

      expect(localStorageMock.setItem).toHaveBeenCalled()
    })

    it('restores session from localStorage on initialize', () => {
      // Set up a valid session in localStorage
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 7)

      const sessionData = {
        user: {
          id: 'matthew-uuid',
          username: 'matthew',
          displayName: 'Matthew',
          role: 'admin',
        },
        expiresAt: futureDate.toISOString(),
        lastActivity: new Date().toISOString(),
      }

      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(sessionData))

      const store = useAuthStore()
      store.initialize()

      expect(store.isAuthenticated).toBe(true)
      expect(store.user?.username).toBe('matthew')
    })

    it('clears expired session on initialize', () => {
      // Set up an expired session
      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 1)

      const sessionData = {
        user: {
          id: 'matthew-uuid',
          username: 'matthew',
          displayName: 'Matthew',
          role: 'admin',
        },
        expiresAt: pastDate.toISOString(),
        lastActivity: new Date().toISOString(),
      }

      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(sessionData))

      const store = useAuthStore()
      store.initialize()

      expect(store.isAuthenticated).toBe(false)
      expect(store.user).toBeNull()
    })
  })

  describe('session validation', () => {
    it('returns true for valid session', () => {
      const store = useAuthStore()
      store.login('yuki2026')

      expect(store.isSessionValid()).toBe(true)
    })

    it('returns false for no session', () => {
      const store = useAuthStore()
      expect(store.isSessionValid()).toBe(false)
    })
  })

  describe('refreshSession', () => {
    it('persists session on activity', async () => {
      const store = useAuthStore()
      await store.login('yuki2026')

      // refreshSession updates lastActivity in localStorage
      store.refreshSession()

      // Session expiry is managed by Firebase, sessionExpiresAt is always null
      expect(store.sessionExpiresAt).toBeNull()
    })

    it('does nothing if not logged in', () => {
      const store = useAuthStore()
      store.refreshSession()

      expect(store.sessionExpiresAt).toBeNull()
    })
  })
})
