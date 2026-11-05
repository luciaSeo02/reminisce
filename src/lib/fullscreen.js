// Element fullscreen with feature detection. Older iPadOS Safari only has
// the webkit-prefixed API, and iPhone Safari has no element fullscreen at
// all, so every helper degrades to "not supported" instead of throwing.
// `doc` is a parameter so the tests can pass a fake document.

export const FULLSCREEN_CHANGE_EVENTS = ['fullscreenchange', 'webkitfullscreenchange']

export function canRequestFullscreen(element, doc = document) {
  if (!element) return false
  if (doc.fullscreenEnabled && typeof element.requestFullscreen === 'function') return true
  return Boolean(
    doc.webkitFullscreenEnabled && typeof element.webkitRequestFullscreen === 'function',
  )
}

export function getFullscreenElement(doc = document) {
  return doc.fullscreenElement ?? doc.webkitFullscreenElement ?? null
}

// Must be called from inside a user gesture (a click handler): browsers
// refuse the request otherwise. Resolves to true if the request was made
// and not rejected, false when unsupported or refused.
export async function requestElementFullscreen(element, doc = document) {
  if (!canRequestFullscreen(element, doc)) return false
  try {
    if (doc.fullscreenEnabled && typeof element.requestFullscreen === 'function') {
      await element.requestFullscreen({ navigationUI: 'hide' })
    } else {
      // The prefixed version returns nothing; success shows up later as a
      // webkitfullscreenchange event.
      element.webkitRequestFullscreen()
    }
    return true
  } catch {
    return false
  }
}

// Only leaves fullscreen when `element` is the one in fullscreen, so it
// never undoes fullscreen that something else started.
export function exitElementFullscreen(element, doc = document) {
  if (!element || getFullscreenElement(doc) !== element) return
  try {
    if (typeof doc.exitFullscreen === 'function') {
      doc.exitFullscreen().catch(() => {})
    } else if (typeof doc.webkitExitFullscreen === 'function') {
      doc.webkitExitFullscreen()
    }
  } catch {
    // Already leaving fullscreen; the change event keeps the state in sync.
  }
}
