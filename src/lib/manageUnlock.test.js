import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  UNLOCK_KEY,
  UNLOCK_WINDOW_MS,
  extendUnlock,
  isUnlocked,
  lock,
  unlock,
} from './manageUnlock.js'

function createMemoryStorage() {
  const store = new Map()
  return {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear(),
  }
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-01-01T10:00:00Z'))
  global.sessionStorage = createMemoryStorage()
  global.localStorage = createMemoryStorage()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('manageUnlock', () => {
  it('starts locked', () => {
    expect(isUnlocked()).toBe(false)
  })

  it('unlocks for the window', () => {
    unlock()
    expect(isUnlocked()).toBe(true)
    vi.advanceTimersByTime(UNLOCK_WINDOW_MS - 1)
    expect(isUnlocked()).toBe(true)
  })

  it('expires after the window', () => {
    unlock()
    vi.advanceTimersByTime(UNLOCK_WINDOW_MS)
    expect(isUnlocked()).toBe(false)
  })

  it('activity extends the window', () => {
    unlock()
    vi.advanceTimersByTime(UNLOCK_WINDOW_MS - 1000)
    expect(extendUnlock()).toBe(true)
    vi.advanceTimersByTime(UNLOCK_WINDOW_MS - 1000)
    expect(isUnlocked()).toBe(true)
  })

  it('activity does not reopen an expired unlock', () => {
    unlock()
    vi.advanceTimersByTime(UNLOCK_WINDOW_MS + 1)
    expect(extendUnlock()).toBe(false)
    expect(isUnlocked()).toBe(false)
  })

  it('lock clears the unlock', () => {
    unlock()
    lock()
    expect(isUnlocked()).toBe(false)
    expect(sessionStorage.getItem(UNLOCK_KEY)).toBeNull()
  })

  it('ignores invalid values', () => {
    for (const value of ['', 'abc', '-5', '1.5e12', 'NaN', 'true']) {
      sessionStorage.setItem(UNLOCK_KEY, value)
      expect(isUnlocked()).toBe(false)
    }
  })

  it('ignores a value further out than one window', () => {
    sessionStorage.setItem(UNLOCK_KEY, String(Date.now() + UNLOCK_WINDOW_MS + 1))
    expect(isUnlocked()).toBe(false)
  })

  it('treats unavailable storage as locked', () => {
    global.sessionStorage = {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('blocked')
      },
      removeItem: () => {
        throw new Error('blocked')
      },
    }
    expect(() => unlock()).not.toThrow()
    expect(isUnlocked()).toBe(false)
    expect(() => lock()).not.toThrow()
  })

  it('never touches the stored PIN', () => {
    localStorage.setItem('reminisce-manage-pin', '1234')
    unlock()
    extendUnlock()
    lock()
    expect(localStorage.getItem('reminisce-manage-pin')).toBe('1234')
  })
})
