import type { StorageLike } from 'pinia-plugin-persistedstate'

/**
 * localStorage adapter for Pinia persistence
 * Uses localStorage for synchronous persistence of store state
 *
 * Note: For larger offline data (medication instances, history),
 * we'll use Supabase + IndexedDB directly in those stores.
 * This storage is for UI state and settings persistence.
 */
export const localStorageWrapper: StorageLike = {
  getItem: (key: string): string | null => {
    try {
      return localStorage.getItem(key)
    } catch {
      console.warn(`Failed to get ${key} from localStorage`)
      return null
    }
  },
  setItem: (key: string, value: string): void => {
    try {
      localStorage.setItem(key, value)
    } catch (error) {
      console.error(`Failed to set ${key} in localStorage:`, error)
    }
  },
}

/**
 * Default persistence options for stores
 */
export const persistOptions = {
  storage: localStorageWrapper,
}
