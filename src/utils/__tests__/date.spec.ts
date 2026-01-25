import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  formatLocalDate,
  getToday,
  parseLocalDate,
  formatTime,
  formatTimeString,
  getStartOfToday,
  getEndOfToday,
  combineDateAndTime,
  isToday,
  isTomorrow,
  getTomorrow,
  getDateFromToday,
  getRelativeTime,
  getTimeSlotFromHour,
  formatDisplayDate,
  formatFutureDisplayDate,
} from '../date'

describe('date utilities', () => {
  describe('formatLocalDate', () => {
    it('formats date as YYYY-MM-DD', () => {
      const date = new Date(2024, 0, 15) // Jan 15, 2024
      expect(formatLocalDate(date)).toBe('2024-01-15')
    })

    it('pads single digit months and days', () => {
      const date = new Date(2024, 0, 5) // Jan 5, 2024
      expect(formatLocalDate(date)).toBe('2024-01-05')
    })
  })

  describe('getToday', () => {
    it('returns today in YYYY-MM-DD format', () => {
      const today = getToday()
      const expected = formatLocalDate(new Date())
      expect(today).toBe(expected)
    })
  })

  describe('parseLocalDate', () => {
    it('parses YYYY-MM-DD string to date at midnight', () => {
      const date = parseLocalDate('2024-01-15')
      expect(date.getFullYear()).toBe(2024)
      expect(date.getMonth()).toBe(0) // January
      expect(date.getDate()).toBe(15)
      expect(date.getHours()).toBe(0)
      expect(date.getMinutes()).toBe(0)
    })
  })

  describe('formatTime', () => {
    it('formats time in 12-hour format', () => {
      const morning = new Date(2024, 0, 1, 9, 30)
      expect(formatTime(morning)).toMatch(/9:30\s*AM/i)

      const afternoon = new Date(2024, 0, 1, 14, 45)
      expect(formatTime(afternoon)).toMatch(/2:45\s*PM/i)
    })
  })

  describe('formatTimeString', () => {
    it('converts HH:MM to 12-hour format', () => {
      expect(formatTimeString('08:00')).toMatch(/8:00\s*AM/i)
      expect(formatTimeString('13:30')).toMatch(/1:30\s*PM/i)
    })
  })

  describe('getStartOfToday', () => {
    it('returns midnight of today', () => {
      const start = getStartOfToday()
      expect(start.getHours()).toBe(0)
      expect(start.getMinutes()).toBe(0)
      expect(start.getSeconds()).toBe(0)
      expect(start.getMilliseconds()).toBe(0)
    })
  })

  describe('getEndOfToday', () => {
    it('returns 23:59:59.999 of today', () => {
      const end = getEndOfToday()
      expect(end.getHours()).toBe(23)
      expect(end.getMinutes()).toBe(59)
      expect(end.getSeconds()).toBe(59)
      expect(end.getMilliseconds()).toBe(999)
    })
  })

  describe('combineDateAndTime', () => {
    it('combines date string and time string into Date', () => {
      const result = combineDateAndTime('2024-01-15', '14:30')
      expect(result.getFullYear()).toBe(2024)
      expect(result.getMonth()).toBe(0)
      expect(result.getDate()).toBe(15)
      expect(result.getHours()).toBe(14)
      expect(result.getMinutes()).toBe(30)
    })
  })

  describe('isToday', () => {
    it('returns true for today', () => {
      const today = new Date()
      expect(isToday(today)).toBe(true)
    })

    it('returns false for yesterday', () => {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      expect(isToday(yesterday)).toBe(false)
    })

    it('returns false for tomorrow', () => {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      expect(isToday(tomorrow)).toBe(false)
    })
  })

  describe('getRelativeTime', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date(2024, 0, 15, 12, 0, 0))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('returns "now" for times within 1 minute', () => {
      const now = new Date()
      expect(getRelativeTime(now)).toBe('now')
    })

    it('returns "X min ago" for past times under an hour', () => {
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000)
      expect(getRelativeTime(fiveMinAgo)).toBe('5 min ago')
    })

    it('returns "in X min" for future times under an hour', () => {
      const inTenMin = new Date(Date.now() + 10 * 60 * 1000)
      expect(getRelativeTime(inTenMin)).toBe('in 10 min')
    })

    it('returns hours for times over an hour away', () => {
      const twoHoursAgo = new Date(Date.now() - 120 * 60 * 1000)
      expect(getRelativeTime(twoHoursAgo)).toBe('2h ago')

      const inThreeHours = new Date(Date.now() + 180 * 60 * 1000)
      expect(getRelativeTime(inThreeHours)).toBe('in 3h')
    })
  })

  describe('getTimeSlotFromHour', () => {
    it('returns morning for hours 5-11', () => {
      expect(getTimeSlotFromHour(5)).toBe('morning')
      expect(getTimeSlotFromHour(8)).toBe('morning')
      expect(getTimeSlotFromHour(11)).toBe('morning')
    })

    it('returns midday for hours 12-16', () => {
      expect(getTimeSlotFromHour(12)).toBe('midday')
      expect(getTimeSlotFromHour(14)).toBe('midday')
      expect(getTimeSlotFromHour(16)).toBe('midday')
    })

    it('returns evening for hours 17-20', () => {
      expect(getTimeSlotFromHour(17)).toBe('evening')
      expect(getTimeSlotFromHour(19)).toBe('evening')
      expect(getTimeSlotFromHour(20)).toBe('evening')
    })

    it('returns night for hours 21-4', () => {
      expect(getTimeSlotFromHour(21)).toBe('night')
      expect(getTimeSlotFromHour(0)).toBe('night')
      expect(getTimeSlotFromHour(4)).toBe('night')
    })
  })

  describe('formatDisplayDate', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date(2024, 0, 15, 12, 0, 0))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('returns "Today" for today', () => {
      const today = new Date(2024, 0, 15)
      expect(formatDisplayDate(today)).toBe('Today')
    })

    it('returns "Yesterday" for yesterday', () => {
      const yesterday = new Date(2024, 0, 14)
      expect(formatDisplayDate(yesterday)).toBe('Yesterday')
    })

    it('returns formatted date for other days', () => {
      const otherDay = new Date(2024, 0, 10)
      expect(formatDisplayDate(otherDay)).toBe('Jan 10')
    })
  })

  describe('isTomorrow', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date(2024, 0, 15, 12, 0, 0))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('returns true for tomorrow', () => {
      const tomorrow = new Date(2024, 0, 16)
      expect(isTomorrow(tomorrow)).toBe(true)
    })

    it('returns false for today', () => {
      const today = new Date(2024, 0, 15)
      expect(isTomorrow(today)).toBe(false)
    })

    it('returns false for day after tomorrow', () => {
      const dayAfter = new Date(2024, 0, 17)
      expect(isTomorrow(dayAfter)).toBe(false)
    })
  })

  describe('getTomorrow', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date(2024, 0, 15, 12, 0, 0))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('returns tomorrow in YYYY-MM-DD format', () => {
      expect(getTomorrow()).toBe('2024-01-16')
    })
  })

  describe('getDateFromToday', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date(2024, 0, 15, 12, 0, 0))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('returns today for 0 days', () => {
      expect(getDateFromToday(0)).toBe('2024-01-15')
    })

    it('returns tomorrow for 1 day', () => {
      expect(getDateFromToday(1)).toBe('2024-01-16')
    })

    it('returns date 3 days from now', () => {
      expect(getDateFromToday(3)).toBe('2024-01-18')
    })

    it('returns yesterday for -1 day', () => {
      expect(getDateFromToday(-1)).toBe('2024-01-14')
    })
  })

  describe('formatFutureDisplayDate', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date(2024, 0, 15, 12, 0, 0)) // Monday Jan 15, 2024
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('returns "Today" for today', () => {
      const today = new Date(2024, 0, 15)
      expect(formatFutureDisplayDate(today)).toBe('Today')
    })

    it('returns "Tomorrow" for tomorrow', () => {
      const tomorrow = new Date(2024, 0, 16)
      expect(formatFutureDisplayDate(tomorrow)).toBe('Tomorrow')
    })

    it('returns weekday name for dates within 7 days', () => {
      const threeDaysAhead = new Date(2024, 0, 18) // Thursday
      expect(formatFutureDisplayDate(threeDaysAhead)).toBe('Thursday')

      const sixDaysAhead = new Date(2024, 0, 21) // Sunday
      expect(formatFutureDisplayDate(sixDaysAhead)).toBe('Sunday')
    })

    it('returns formatted date for dates more than 7 days away', () => {
      const twoWeeksAhead = new Date(2024, 0, 29)
      expect(formatFutureDisplayDate(twoWeeksAhead)).toBe('Jan 29')
    })
  })
})
