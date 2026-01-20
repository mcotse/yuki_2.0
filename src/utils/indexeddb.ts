import { get, set, del, keys } from 'idb-keyval'

/**
 * IndexedDB utilities for offline data storage
 * Used for larger data that needs async persistence:
 * - Offline action queue
 * - Cached medication data
 * - Daily instances cache
 */

// Prefixes for different data types
const PREFIX = {
  OFFLINE_QUEUE: 'offline-queue:',
  CACHE: 'cache:',
  INSTANCES: 'instances:',
}

/**
 * Offline Action Queue
 * Stores actions that need to be synced when online
 */
export interface OfflineAction {
  id: string
  type: 'confirm' | 'snooze' | 'edit' | 'create'
  payload: Record<string, unknown>
  timestamp: Date
  synced: boolean
}

export const offlineQueue = {
  async add(action: Omit<OfflineAction, 'id' | 'synced'>): Promise<string> {
    const id = crypto.randomUUID()
    const fullAction: OfflineAction = {
      ...action,
      id,
      synced: false,
    }
    await set(`${PREFIX.OFFLINE_QUEUE}${id}`, fullAction)
    return id
  },

  async get(id: string): Promise<OfflineAction | null> {
    return (await get<OfflineAction>(`${PREFIX.OFFLINE_QUEUE}${id}`)) ?? null
  },

  async getAll(): Promise<OfflineAction[]> {
    const allKeys = await keys()
    const queueKeys = allKeys.filter(
      (k) => typeof k === 'string' && k.startsWith(PREFIX.OFFLINE_QUEUE),
    )
    const actions = await Promise.all(
      queueKeys.map((k) => get<OfflineAction>(k as string)),
    )
    return actions.filter((a): a is OfflineAction => a !== undefined)
  },

  async getPending(): Promise<OfflineAction[]> {
    const all = await this.getAll()
    return all.filter((a) => !a.synced).sort((a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    )
  },

  async markSynced(id: string): Promise<void> {
    const action = await this.get(id)
    if (action) {
      action.synced = true
      await set(`${PREFIX.OFFLINE_QUEUE}${id}`, action)
    }
  },

  async remove(id: string): Promise<void> {
    await del(`${PREFIX.OFFLINE_QUEUE}${id}`)
  },

  async clearSynced(): Promise<void> {
    const all = await this.getAll()
    await Promise.all(
      all.filter((a) => a.synced).map((a) => this.remove(a.id)),
    )
  },
}

/**
 * Generic cache utilities
 */
export const cache = {
  async set<T>(key: string, data: T): Promise<void> {
    await set(`${PREFIX.CACHE}${key}`, data)
  },

  async get<T>(key: string): Promise<T | null> {
    return (await get<T>(`${PREFIX.CACHE}${key}`)) ?? null
  },

  async remove(key: string): Promise<void> {
    await del(`${PREFIX.CACHE}${key}`)
  },

  async clear(): Promise<void> {
    const allKeys = await keys()
    const cacheKeys = allKeys.filter(
      (k) => typeof k === 'string' && k.startsWith(PREFIX.CACHE),
    )
    await Promise.all(cacheKeys.map((k) => del(k)))
  },
}

/**
 * Check if the browser is online
 */
export function isOnline(): boolean {
  return navigator.onLine
}

/**
 * Listen for online/offline events
 */
export function onOnlineStatusChange(
  callback: (online: boolean) => void,
): () => void {
  const handleOnline = () => callback(true)
  const handleOffline = () => callback(false)

  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)

  return () => {
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
  }
}
