// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setStoredPin } from '../lib/managePin.js'
import { unlock } from '../lib/manageUnlock.js'

// The real store is covered with fake-indexeddb in photoStore.test.js.
// Here it is an in-memory stand-in, so the screen's behavior can be checked
// on its own (jsdom Blobs cannot be stored by fake-indexeddb).
const store = vi.hoisted(() => ({ photos: [] }))

vi.mock('../lib/photoStore.js', async () => {
  const { normalizeCaption } = await import('../lib/photoCaption.js')
  return {
    getAllPhotos: vi.fn(async () => store.photos.map((photo) => ({ ...photo }))),
    addPhoto: vi.fn(async () => {}),
    deletePhoto: vi.fn(async (id) => {
      store.photos = store.photos.filter((photo) => photo.id !== id)
    }),
    savePhotoOrder: vi.fn(async (ids) => {
      store.photos = ids.map((id) => store.photos.find((photo) => photo.id === id))
    }),
    updatePhotoCaption: vi.fn(async (id, caption) => {
      const normalized = normalizeCaption(caption)
      store.photos = store.photos.map((photo) =>
        photo.id === id ? { ...photo, caption: normalized } : photo,
      )
      return normalized
    }),
  }
})

const photoStore = await import('../lib/photoStore.js')
const { default: ManageScreen } = await import('./ManageScreen.jsx')

globalThis.IS_REACT_ACT_ENVIRONMENT = true

let container
let root

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  URL.createObjectURL = vi.fn(() => 'blob:test')
  URL.revokeObjectURL = vi.fn()
  setStoredPin('1234')
  unlock()
  store.photos = [
    { id: 1, caption: 'Beach', blob: new Blob(['a']) },
    { id: 2, caption: '', blob: new Blob(['b']) },
    { id: 3, caption: 'Garden', blob: new Blob(['c']) },
  ]
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
  vi.clearAllMocks()
  vi.restoreAllMocks()
})

async function renderManage() {
  await act(async () => {
    root.render(<ManageScreen />)
  })
}

const photoRows = () => [...container.querySelectorAll('.manage-sortable-photos .manage-photo')]
const captionFields = () => photoRows().map((row) => row.querySelector('textarea'))

function typeInto(field, value) {
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set
  act(() => {
    setter.call(field, value)
    field.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

async function blur(field) {
  await act(async () => {
    field.focus()
    field.blur()
  })
}

async function pressKey(element, key, init = {}) {
  let event
  await act(async () => {
    event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init })
    element.dispatchEvent(event)
  })
  return event
}

describe('Settings saved photos', () => {
  it('shows each saved photo with a labeled caption field, in the stored order', async () => {
    await renderManage()
    expect(captionFields().map((field) => field.value)).toEqual(['Beach', '', 'Garden'])
    const field = captionFields()[0]
    expect(container.querySelector(`label[for="${field.id}"]`).textContent).toBe('Who and where')
    expect(field.getAttribute('placeholder')).toBe('Caption')
    expect(field.getAttribute('enterkeyhint')).toBe('done')
    expect(field.maxLength).toBe(2000)
    expect(container.textContent).toContain('3 photos')
  })

  it('saves an edited caption on blur, with line breaks as spaces, and says so in a live region', async () => {
    await renderManage()
    const field = captionFields()[1]
    typeInto(field, 'The wedding\nin the village ')
    await blur(field)

    expect(photoStore.updatePhotoCaption).toHaveBeenCalledWith(2, 'The wedding\nin the village ')
    expect(store.photos[1].caption).toBe('The wedding in the village')
    expect(field.value).toBe('The wedding in the village')
    const status = photoRows()[1].querySelector('[aria-live="polite"]')
    expect(status.textContent).toBe('Saved')
  })

  it('does not write when the caption did not change', async () => {
    await renderManage()
    await blur(captionFields()[0])
    expect(photoStore.updatePhotoCaption).not.toHaveBeenCalled()
  })

  it('saves on Enter without adding a line break, and only writes once when blur follows', async () => {
    await renderManage()
    const field = captionFields()[0]
    typeInto(field, 'Beach in 1975')
    const event = await pressKey(field, 'Enter')
    expect(event.defaultPrevented).toBe(true)
    expect(store.photos[0].caption).toBe('Beach in 1975')
    await blur(field)
    expect(photoStore.updatePhotoCaption).toHaveBeenCalledTimes(1)
  })

  it('ignores Enter while an input method is composing', async () => {
    await renderManage()
    const field = captionFields()[0]
    typeInto(field, 'Beach and')
    const event = await pressKey(field, 'Enter', { isComposing: true })
    expect(event.defaultPrevented).toBe(false)
    expect(photoStore.updatePhotoCaption).not.toHaveBeenCalled()
  })

  it('keeps the typed text and shows a calm note when saving fails', async () => {
    photoStore.updatePhotoCaption.mockRejectedValueOnce(new Error('quota'))
    await renderManage()
    const field = captionFields()[2]
    typeInto(field, 'The garden with the roses')
    await blur(field)

    expect(field.value).toBe('The garden with the roses')
    expect(store.photos[2].caption).toBe('Garden')
    expect(photoRows()[2].querySelector('[aria-live="polite"]').textContent).toContain(
      'could not be saved',
    )

    await blur(field)
    expect(store.photos[2].caption).toBe('The garden with the roses')
  })

  it('saves a keyboard reorder once, on drop, and the slideshow order follows', async () => {
    await renderManage()
    const handle = photoRows()[0].querySelector('.sortable-handle')
    await pressKey(handle, ' ')
    await pressKey(handle, 'ArrowDown')
    await pressKey(handle, 'ArrowDown')
    expect(photoStore.savePhotoOrder).not.toHaveBeenCalled()
    await pressKey(handle, ' ')

    expect(photoStore.savePhotoOrder).toHaveBeenCalledTimes(1)
    expect(photoStore.savePhotoOrder).toHaveBeenCalledWith([2, 3, 1])
    expect(captionFields().map((field) => field.value)).toEqual(['', 'Garden', 'Beach'])
    const badges = container.querySelectorAll('.manage-sortable-photos .manage-song-position')
    expect([...badges].map((badge) => badge.textContent)).toEqual(['1', '2', '3'])
  })

  it('puts the list back as stored and shows a calm note when saving the order fails', async () => {
    photoStore.savePhotoOrder.mockRejectedValueOnce(new Error('quota'))
    await renderManage()
    const handle = photoRows()[0].querySelector('.sortable-handle')
    await pressKey(handle, ' ')
    await pressKey(handle, 'ArrowDown')
    await pressKey(handle, ' ')

    expect(captionFields().map((field) => field.value)).toEqual(['Beach', '', 'Garden'])
    expect(container.textContent).toContain('The new order could not be saved')
  })
})
