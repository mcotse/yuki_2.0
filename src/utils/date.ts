/**
 * Date and time utility functions
 * All operations use device timezone as per spec
 */

/**
 * Format a date as YYYY-MM-DD in local timezone
 */
export function formatLocalDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Get today's date as YYYY-MM-DD in local timezone
 */
export function getToday(): string {
  return formatLocalDate(new Date())
}

/**
 * Parse a YYYY-MM-DD string as a local date at midnight
 */
export function parseLocalDate(dateString: string): Date {
  const parts = dateString.split('-')
  const year = parseInt(parts[0] ?? '0', 10)
  const month = parseInt(parts[1] ?? '0', 10)
  const day = parseInt(parts[2] ?? '0', 10)
  return new Date(year, month - 1, day)
}

/**
 * Format a time as HH:MM AM/PM
 */
export function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

/**
 * Format a time string (HH:MM) as 12-hour format
 */
export function formatTimeString(time: string): string {
  const parts = time.split(':')
  const hours = parseInt(parts[0] ?? '0', 10)
  const minutes = parseInt(parts[1] ?? '0', 10)
  const date = new Date()
  date.setHours(hours, minutes, 0, 0)
  return formatTime(date)
}

/**
 * Get the start of today (midnight local time)
 */
export function getStartOfToday(): Date {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return now
}

/**
 * Get the end of today (23:59:59.999 local time)
 */
export function getEndOfToday(): Date {
  const now = new Date()
  now.setHours(23, 59, 59, 999)
  return now
}

/**
 * Combine a date string (YYYY-MM-DD) and time string (HH:MM) into a Date
 */
export function combineDateAndTime(dateString: string, timeString: string): Date {
  const date = parseLocalDate(dateString)
  const parts = timeString.split(':')
  const hours = parseInt(parts[0] ?? '0', 10)
  const minutes = parseInt(parts[1] ?? '0', 10)
  date.setHours(hours, minutes, 0, 0)
  return date
}

/**
 * Check if a date is today
 */
export function isToday(date: Date): boolean {
  const today = new Date()
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  )
}

/**
 * Get relative time string (e.g., "5 min ago", "in 10 min")
 */
export function getRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = date.getTime() - now.getTime()
  const diffMin = Math.round(diffMs / 60000)

  if (Math.abs(diffMin) < 1) return 'now'

  if (diffMin < 0) {
    const absDiff = Math.abs(diffMin)
    if (absDiff < 60) return `${absDiff} min ago`
    if (absDiff < 1440) return `${Math.round(absDiff / 60)}h ago`
    return formatTime(date)
  } else {
    if (diffMin < 60) return `in ${diffMin} min`
    if (diffMin < 1440) return `in ${Math.round(diffMin / 60)}h`
    return formatTime(date)
  }
}

/**
 * Get time slot name based on hour
 */
export function getTimeSlotFromHour(hour: number): string {
  if (hour >= 5 && hour < 12) return 'morning'
  if (hour >= 12 && hour < 17) return 'midday'
  if (hour >= 17 && hour < 21) return 'evening'
  return 'night'
}

/**
 * Format a date for display (e.g., "Today", "Yesterday", "Jan 15")
 */
export function formatDisplayDate(date: Date): string {
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (isToday(date)) return 'Today'

  if (
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate()
  ) {
    return 'Yesterday'
  }

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/**
 * Check if a date is tomorrow
 */
export function isTomorrow(date: Date): boolean {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return (
    date.getFullYear() === tomorrow.getFullYear() &&
    date.getMonth() === tomorrow.getMonth() &&
    date.getDate() === tomorrow.getDate()
  )
}

/**
 * Get tomorrow's date as YYYY-MM-DD
 */
export function getTomorrow(): string {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return formatLocalDate(tomorrow)
}

/**
 * Get a date N days from today as YYYY-MM-DD
 */
export function getDateFromToday(daysFromNow: number): string {
  const date = new Date()
  date.setDate(date.getDate() + daysFromNow)
  return formatLocalDate(date)
}

/**
 * Format a future date for display (e.g., "Tomorrow", "Wednesday", "Jan 20")
 */
export function formatFutureDisplayDate(date: Date): string {
  const today = new Date()

  if (isToday(date)) return 'Today'
  if (isTomorrow(date)) return 'Tomorrow'

  // Check if within the next 7 days - show weekday name
  const daysUntil = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  if (daysUntil > 0 && daysUntil <= 7) {
    return date.toLocaleDateString('en-US', { weekday: 'long' })
  }

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
