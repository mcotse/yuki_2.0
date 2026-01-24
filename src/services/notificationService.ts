import { getToken, onMessage, type MessagePayload } from 'firebase/messaging'
import { messaging } from '@/lib/firebase'
import type { DailyInstanceWithItem } from '@/types'

interface ScheduledNotification {
  instanceId: string
  timeoutId: ReturnType<typeof setTimeout>
}

/**
 * Notification Service
 * Schedules and manages push notifications for medication reminders
 * Integrates with Firebase Cloud Messaging for background notifications
 */
class NotificationService {
  private scheduledNotifications: Map<string, ScheduledNotification> = new Map()
  private permissionGranted = false
  private fcmToken: string | null = null

  /**
   * Check if notifications are supported in this browser
   */
  get isSupported(): boolean {
    return 'Notification' in window && 'serviceWorker' in navigator
  }

  /**
   * Check current permission status
   */
  get permissionStatus(): NotificationPermission {
    if (!this.isSupported) return 'denied'
    return Notification.permission
  }

  /**
   * Get the current FCM token
   */
  get token(): string | null {
    return this.fcmToken
  }

  /**
   * Request notification permission from the user
   */
  async requestPermission(): Promise<boolean> {
    if (!this.isSupported) {
      console.warn('Notifications not supported')
      return false
    }

    if (Notification.permission === 'granted') {
      this.permissionGranted = true
      return true
    }

    if (Notification.permission === 'denied') {
      return false
    }

    try {
      const result = await Notification.requestPermission()
      this.permissionGranted = result === 'granted'
      return this.permissionGranted
    } catch (error) {
      console.error('Error requesting notification permission:', error)
      return false
    }
  }

  /**
   * Initialize FCM and get token
   * Call this after permission is granted
   */
  async initializeFCM(): Promise<string | null> {
    if (!messaging) {
      console.warn('Firebase Messaging not available')
      return null
    }

    if (Notification.permission !== 'granted') {
      console.warn('Notification permission not granted')
      return null
    }

    try {
      const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY
      if (!vapidKey) {
        console.warn('VAPID key not configured')
        return null
      }

      // Get FCM token
      const token = await getToken(messaging, { vapidKey })
      this.fcmToken = token
      console.log('FCM token obtained')

      // Set up foreground message handler
      onMessage(messaging, (payload: MessagePayload) => {
        console.log('Foreground message received:', payload)
        this.handleForegroundMessage(payload)
      })

      return token
    } catch (error) {
      console.error('Error initializing FCM:', error)
      return null
    }
  }

  /**
   * Handle messages received while app is in foreground
   */
  private handleForegroundMessage(payload: MessagePayload): void {
    const { notification } = payload
    if (notification) {
      // Show notification using service worker
      this.showCustomNotification(
        notification.title || 'Yuki Reminder',
        notification.body || '',
        payload.data,
      )
    }
  }

  /**
   * Show a custom notification
   */
  async showCustomNotification(
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<void> {
    if (!this.permissionGranted && !(await this.requestPermission())) {
      return
    }

    try {
      const registration = await navigator.serviceWorker.ready
      await registration.showNotification(title, {
        body,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        data,
        requireInteraction: true,
        vibrate: [200, 100, 200],
      })
    } catch (error) {
      // Fallback to basic Notification API
      new Notification(title, {
        body,
        icon: '/icons/icon-192x192.png',
      })
    }
  }

  /**
   * Format notification content for an instance
   * Format: 'LEFT eye: Ofloxacin 0.3% due now'
   */
  formatNotificationContent(instance: DailyInstanceWithItem): { title: string; body: string } {
    const item = instance.item
    const location = item.location ?? ''
    const name = item.name
    const dose = item.dose ? ` ${item.dose}` : ''

    return {
      title: 'Medication Reminder',
      body: `${location}: ${name}${dose} due now`,
    }
  }

  /**
   * Show a notification immediately
   */
  async showNotification(instance: DailyInstanceWithItem): Promise<void> {
    if (!this.permissionGranted && !(await this.requestPermission())) {
      return
    }

    const { title, body } = this.formatNotificationContent(instance)

    try {
      // Try to use service worker for better reliability
      const registration = await navigator.serviceWorker.ready
      await registration.showNotification(title, {
        body,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        tag: `med-${instance.id}`,
        data: { instanceId: instance.id },
        requireInteraction: true, // Keep notification visible until user interacts
        vibrate: [200, 100, 200],
      })
    } catch (error) {
      // Fallback to basic Notification API
      new Notification(title, {
        body,
        icon: '/icons/icon-192x192.png',
        tag: `med-${instance.id}`,
      })
    }
  }

  /**
   * Schedule a notification for a specific instance
   */
  scheduleNotification(instance: DailyInstanceWithItem): void {
    if (!this.isSupported) return

    // Cancel any existing notification for this instance
    this.cancelNotification(instance.id)

    const scheduledTime = new Date(instance.scheduled_time)
    const now = new Date()
    const delay = scheduledTime.getTime() - now.getTime()

    // Only schedule if the time is in the future
    if (delay <= 0) return

    const timeoutId = setTimeout(() => {
      this.showNotification(instance)
      this.scheduledNotifications.delete(instance.id)
    }, delay)

    this.scheduledNotifications.set(instance.id, {
      instanceId: instance.id,
      timeoutId,
    })
  }

  /**
   * Cancel a scheduled notification
   */
  cancelNotification(instanceId: string): void {
    const scheduled = this.scheduledNotifications.get(instanceId)
    if (scheduled) {
      clearTimeout(scheduled.timeoutId)
      this.scheduledNotifications.delete(instanceId)
    }
  }

  /**
   * Schedule notifications for multiple instances
   * Typically called when loading the day's instances
   */
  scheduleAllNotifications(instances: DailyInstanceWithItem[]): void {
    // Clear all existing scheduled notifications
    this.clearAllNotifications()

    // Schedule notifications for pending instances
    for (const instance of instances) {
      if (instance.status === 'pending') {
        this.scheduleNotification(instance)
      }
    }
  }

  /**
   * Clear all scheduled notifications
   */
  clearAllNotifications(): void {
    for (const [, scheduled] of this.scheduledNotifications) {
      clearTimeout(scheduled.timeoutId)
    }
    this.scheduledNotifications.clear()
  }

  /**
   * Get the count of currently scheduled notifications
   */
  get scheduledCount(): number {
    return this.scheduledNotifications.size
  }
}

// Export singleton instance
export const notificationService = new NotificationService()
