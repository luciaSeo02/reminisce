// Keeps /manage unlocked for a while after the PIN is entered, so the
// caregiver can go Home and come back, or reload, without typing it again.
//
// The expiry lives in sessionStorage, so it is per tab: closing the tab or
// opening a new one starts locked. It is additive to the PIN itself (see
// managePin.js), which stays in localStorage untouched. A missing or
// unreadable value just means "locked", and it is never part of a backup.

export const UNLOCK_KEY = 'reminisce-manage-unlocked-until'
export const UNLOCK_WINDOW_MS = 10 * 60 * 1000

function readExpiry() {
  try {
    const raw = sessionStorage.getItem(UNLOCK_KEY)
    if (raw === null || !/^\d+$/.test(raw)) return null
    return Number(raw)
  } catch {
    return null
  }
}

function writeExpiry(expiresAt) {
  try {
    sessionStorage.setItem(UNLOCK_KEY, String(expiresAt))
  } catch {
    // Storage unavailable (private mode, blocked site data). The page then
    // asks for the PIN on every load, which is how it behaved before.
  }
}

export function isUnlocked() {
  const expiresAt = readExpiry()
  if (expiresAt === null) return false
  const now = Date.now()
  // A value further out than one full window can't have been written by
  // this code, so it is treated as tampered or corrupt.
  return expiresAt > now && expiresAt <= now + UNLOCK_WINDOW_MS
}

export function unlock() {
  writeExpiry(Date.now() + UNLOCK_WINDOW_MS)
}

// Pushes the expiry forward, but only while still unlocked, so activity on
// an already expired page can't silently reopen it.
export function extendUnlock() {
  if (!isUnlocked()) return false
  unlock()
  return true
}

export function lock() {
  try {
    sessionStorage.removeItem(UNLOCK_KEY)
  } catch {
    // Nothing stored means locked anyway.
  }
}
