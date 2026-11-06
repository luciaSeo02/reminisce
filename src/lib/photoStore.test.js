import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { IDBFactory, IDBObjectStore } from 'fake-indexeddb'
import {
  addPhoto,
  deletePhoto,
  getAllPhotos,
  replaceAllPhotos,
  savePhotoOrder,
  sortPhotos,
  updatePhotoCaption,
} from './photoStore.js'
import { MAX_CAPTION_LENGTH, normalizeCaption } from './photoCaption.js'

function photoBlob(bytes, type = 'image/png') {
  return new Blob([new Uint8Array(bytes)], { type })
}

async function addPhotos(specs) {
  for (const { caption, size, type } of specs) {
    await addPhoto({ caption, blob: photoBlob(Array.from({ length: size }, (_, i) => i % 256), type) })
  }
  return getAllPhotos()
}

const blobFacts = (photos) =>
  Object.fromEntries(photos.map((photo) => [photo.id, { size: photo.blob.size, type: photo.blob.type }]))

beforeEach(() => {
  // A fresh, empty IndexedDB for every test.
  globalThis.indexedDB = new IDBFactory()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('sortPhotos', () => {
  it('keeps id order when no photo has a position (photos saved before reordering existed)', () => {
    const photos = [{ id: 3 }, { id: 1 }, { id: 2 }]
    expect(sortPhotos(photos).map((p) => p.id)).toEqual([1, 2, 3])
  })

  it('puts photos with a position first, by position, then the rest by id', () => {
    const photos = [{ id: 5 }, { id: 1, position: 2 }, { id: 4 }, { id: 2, position: 0 }, { id: 3, position: 1 }]
    expect(sortPhotos(photos).map((p) => p.id)).toEqual([2, 3, 1, 4, 5])
  })

  it('breaks position ties by id and ignores a position that is not a number', () => {
    const photos = [{ id: 2, position: 0 }, { id: 1, position: 0 }, { id: 3, position: 'x' }]
    expect(sortPhotos(photos).map((p) => p.id)).toEqual([1, 2, 3])
  })

  it('does not change the list it is given', () => {
    const photos = [{ id: 2 }, { id: 1 }]
    sortPhotos(photos)
    expect(photos.map((p) => p.id)).toEqual([2, 1])
  })
})

describe('normalizeCaption', () => {
  it('turns line breaks into single spaces and trims', () => {
    expect(normalizeCaption('  The beach\n\nwith  the family \r\n in 1975 ')).toBe(
      'The beach with  the family in 1975',
    )
  })

  it('cuts the caption to the backup limit', () => {
    expect(normalizeCaption('a'.repeat(MAX_CAPTION_LENGTH + 50))).toHaveLength(MAX_CAPTION_LENGTH)
  })

  it('treats a missing caption as empty', () => {
    expect(normalizeCaption(undefined)).toBe('')
  })
})

describe('savePhotoOrder', () => {
  it('stores the new order, which getAllPhotos then returns', async () => {
    const photos = await addPhotos([
      { caption: 'Beach', size: 10 },
      { caption: 'Wedding', size: 20 },
      { caption: 'Garden', size: 30 },
    ])
    const [a, b, c] = photos.map((p) => p.id)
    await savePhotoOrder([c, a, b])
    expect((await getAllPhotos()).map((p) => p.caption)).toEqual(['Garden', 'Beach', 'Wedding'])
  })

  it('keeps every other field and the same blob type and size', async () => {
    const before = await addPhotos([
      { caption: 'Beach', size: 10, type: 'image/jpeg' },
      { caption: 'Wedding', size: 2048, type: 'image/png' },
      { caption: '', size: 7, type: 'image/webp' },
    ])
    await savePhotoOrder(before.map((p) => p.id).reverse())
    const after = await getAllPhotos()
    expect(blobFacts(after)).toEqual(blobFacts(before))
    for (const photo of after) {
      const original = before.find((p) => p.id === photo.id)
      expect(photo.caption).toBe(original.caption)
      expect(photo.createdAt).toBe(original.createdAt)
      expect(new Uint8Array(await photo.blob.arrayBuffer())).toEqual(
        new Uint8Array(await original.blob.arrayBuffer()),
      )
    }
  })

  it('only writes records whose position changes', async () => {
    const photos = await addPhotos([
      { caption: 'a', size: 1 },
      { caption: 'b', size: 1 },
      { caption: 'c', size: 1 },
      { caption: 'd', size: 1 },
    ])
    const ids = photos.map((p) => p.id)
    await savePhotoOrder(ids)
    const put = vi.spyOn(IDBObjectStore.prototype, 'put')
    await savePhotoOrder([ids[0], ids[2], ids[1], ids[3]])
    expect(put).toHaveBeenCalledTimes(2)
  })

  it('leaves new photos at the end after a reorder', async () => {
    const photos = await addPhotos([
      { caption: 'a', size: 1 },
      { caption: 'b', size: 1 },
    ])
    await savePhotoOrder(photos.map((p) => p.id).reverse())
    await addPhotos([{ caption: 'new', size: 1 }])
    expect((await getAllPhotos()).map((p) => p.caption)).toEqual(['b', 'a', 'new'])
  })

  it('leaves the stored order and captions unchanged when a write fails part way', async () => {
    const photos = await addPhotos([
      { caption: 'a', size: 1 },
      { caption: 'b', size: 2 },
      { caption: 'c', size: 3 },
    ])
    const originalPut = IDBObjectStore.prototype.put
    let calls = 0
    vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(function (...args) {
      calls += 1
      if (calls === 2) throw new DOMException('Quota exceeded', 'QuotaExceededError')
      return originalPut.apply(this, args)
    })
    await expect(savePhotoOrder(photos.map((p) => p.id).reverse())).rejects.toThrow()
    vi.restoreAllMocks()

    const after = await getAllPhotos()
    expect(after.map((p) => p.caption)).toEqual(['a', 'b', 'c'])
    expect(after.every((p) => p.position === undefined)).toBe(true)
    expect(blobFacts(after)).toEqual(blobFacts(photos))
  })

  it('refuses an order that does not match the saved photos', async () => {
    const photos = await addPhotos([
      { caption: 'a', size: 1 },
      { caption: 'b', size: 1 },
    ])
    await deletePhoto(photos[0].id)
    await expect(savePhotoOrder(photos.map((p) => p.id).reverse())).rejects.toThrow()
    expect((await getAllPhotos()).map((p) => p.caption)).toEqual(['b'])
  })
})

describe('updatePhotoCaption', () => {
  it('stores the normalized caption and keeps the blob and order', async () => {
    const before = await addPhotos([
      { caption: 'a', size: 5, type: 'image/jpeg' },
      { caption: 'b', size: 6, type: 'image/gif' },
    ])
    const stored = await updatePhotoCaption(before[1].id, 'At the river\nwith Carmen')
    expect(stored).toBe('At the river with Carmen')
    const after = await getAllPhotos()
    expect(after.map((p) => p.caption)).toEqual(['a', 'At the river with Carmen'])
    expect(blobFacts(after)).toEqual(blobFacts(before))
  })

  it('leaves the caption unchanged when the write fails', async () => {
    const before = await addPhotos([{ caption: 'Original', size: 4 }])
    vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(() => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError')
    })
    await expect(updatePhotoCaption(before[0].id, 'New text')).rejects.toThrow()
    vi.restoreAllMocks()
    const after = await getAllPhotos()
    expect(after[0].caption).toBe('Original')
    expect(blobFacts(after)).toEqual(blobFacts(before))
  })

  it('rejects when the photo is no longer saved', async () => {
    await expect(updatePhotoCaption(999, 'x')).rejects.toThrow()
  })
})

describe('replaceAllPhotos', () => {
  it('restores photos in the given order, without positions', async () => {
    await replaceAllPhotos([
      { caption: 'second', blob: photoBlob([1]) },
      { caption: 'first', blob: photoBlob([2]) },
    ])
    const photos = await getAllPhotos()
    expect(photos.map((p) => p.caption)).toEqual(['second', 'first'])
    expect(photos.every((p) => p.position === undefined)).toBe(true)
  })
})
