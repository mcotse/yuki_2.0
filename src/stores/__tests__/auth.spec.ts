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
    it('logs in successfully with valid password', () => {
      const store = useAuthStore()
      const result = store.login('yuki2026')

      expect(result.success).toBe(true)
      expect(store.isAuthenticated).toBe(true)
      expect(store.user?.username).toBe('matthew')
      expect(store.user?.role).toBe('admin')
    })

    it('fails with invalid password', () => {
      const store = useAuthStore()
      const result = store.login('wrongpassword')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid password')
      expect(store.isAuthenticated).toBe(false)
    })

    it('sets admin status for admin users', () => {
      const store = useAuthStore()
      store.login('yuki2026')

      expect(store.isAdmin).toBe(true)
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
    it('extends session expiry', () => {
      vi.useFakeTimers()
      const store = useAuthStore()
      store.login('yuki2026')

      const initialExpiry = store.sessionExpiresAt?.getTime()
      vi.advanceTimersByTime(1000)

      store.refreshSession()

      expect(store.sessionExpiresAt?.getTime()).toBeGreaterThan(initialExpiry ?? 0)
      vi.useRealTimers()
    })

    it('does nothing if not logged in', () => {
      const store = useAuthStore()
      store.refreshSession()

      expect(store.sessionExpiresAt).toBeNull()
    })
  })
})
