import { describe, expect, it, vi } from 'vitest'
import {
  canRequestFullscreen,
  exitElementFullscreen,
  getFullscreenElement,
  requestElementFullscreen,
} from './fullscreen.js'

function standardDoc(overrides = {}) {
  return {
    fullscreenEnabled: true,
    fullscreenElement: null,
    exitFullscreen: vi.fn(() => Promise.resolve()),
    ...overrides,
  }
}

function standardElement(request = () => Promise.resolve()) {
  return { requestFullscreen: vi.fn(request) }
}

describe('canRequestFullscreen', () => {
  it('is true with the standard API', () => {
    expect(canRequestFullscreen(standardElement(), standardDoc())).toBe(true)
  })

  it('is true with only the webkit API (older iPadOS)', () => {
    const doc = { webkitFullscreenEnabled: true }
    const element = { webkitRequestFullscreen: vi.fn() }
    expect(canRequestFullscreen(element, doc)).toBe(true)
  })

  it('is false without any API (iPhone)', () => {
    expect(canRequestFullscreen({}, {})).toBe(false)
  })

  it('is false when the document disables fullscreen', () => {
    const doc = standardDoc({ fullscreenEnabled: false })
    expect(canRequestFullscreen(standardElement(), doc)).toBe(false)
  })

  it('is false without an element', () => {
    expect(canRequestFullscreen(null, standardDoc())).toBe(false)
  })
})

describe('requestElementFullscreen', () => {
  it('calls the standard API and resolves true', async () => {
    const element = standardElement()
    await expect(requestElementFullscreen(element, standardDoc())).resolves.toBe(true)
    expect(element.requestFullscreen).toHaveBeenCalledOnce()
  })

  it('falls back to the webkit API', async () => {
    const element = { webkitRequestFullscreen: vi.fn() }
    const doc = { webkitFullscreenEnabled: true }
    await expect(requestElementFullscreen(element, doc)).resolves.toBe(true)
    expect(element.webkitRequestFullscreen).toHaveBeenCalledOnce()
  })

  it('resolves false when unsupported, without throwing', async () => {
    await expect(requestElementFullscreen({}, {})).resolves.toBe(false)
  })

  it('resolves false when the browser refuses the request', async () => {
    const element = standardElement(() => Promise.reject(new Error('denied')))
    await expect(requestElementFullscreen(element, standardDoc())).resolves.toBe(false)
  })
})

describe('getFullscreenElement', () => {
  it('reads the standard and the webkit property', () => {
    const element = {}
    expect(getFullscreenElement({ fullscreenElement: element })).toBe(element)
    expect(getFullscreenElement({ webkitFullscreenElement: element })).toBe(element)
    expect(getFullscreenElement({})).toBe(null)
  })
})

describe('exitElementFullscreen', () => {
  it('exits when the element is in fullscreen', () => {
    const element = {}
    const doc = standardDoc({ fullscreenElement: element })
    exitElementFullscreen(element, doc)
    expect(doc.exitFullscreen).toHaveBeenCalledOnce()
  })

  it('uses the webkit API when that is the only one', () => {
    const element = {}
    const doc = { webkitFullscreenElement: element, webkitExitFullscreen: vi.fn() }
    exitElementFullscreen(element, doc)
    expect(doc.webkitExitFullscreen).toHaveBeenCalledOnce()
  })

  it('does nothing when another element is in fullscreen', () => {
    const doc = standardDoc({ fullscreenElement: {} })
    exitElementFullscreen({}, doc)
    expect(doc.exitFullscreen).not.toHaveBeenCalled()
  })

  it('does nothing when nothing is in fullscreen', () => {
    const doc = standardDoc()
    exitElementFullscreen({}, doc)
    expect(doc.exitFullscreen).not.toHaveBeenCalled()
  })
})
