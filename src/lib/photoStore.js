import { normalizeCaption } from './photoCaption.js'

const DB_NAME = 'reminisce-photos'
const DB_VERSION = 1
const STORE_NAME = 'photos'

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME, {
        keyPath: 'id',
        autoIncrement: true,
      })
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function hasPosition(photo) {
  return Number.isFinite(photo.position)
}

// Slideshow order. `position` is an optional field, only written once the
// caregiver reorders the photos in Settings. Photos without it (every photo
// saved before reordering existed, and photos added after a reorder) keep
// the order they always had, by id, which is the order they were added, and
// come after the reordered ones.
export function sortPhotos(photos) {
  return photos.slice().sort((a, b) => {
    const aHas = hasPosition(a)
    const bHas = hasPosition(b)
    if (aHas && bHas && a.position !== b.position) return a.position - b.position
    if (aHas !== bHas) return aHas ? -1 : 1
    return a.id - b.id
  })
}

export async function getAllPhotos() {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const request = tx.objectStore(STORE_NAME).getAll()
    request.onsuccess = () => resolve(sortPhotos(request.result))
    request.onerror = () => reject(request.error)
  })
}

export async function addPhoto({ caption, blob }) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).add({ caption, blob, createdAt: Date.now() })
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function deletePhoto(id) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

// Runs `work(store, fail)` inside one readwrite transaction and settles only
// when the transaction has committed or been rolled back. `fail(error)`
// aborts it, so nothing written so far in it is kept.
async function writeTransaction(work) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    let failure = null
    let result
    function fail(error) {
      failure = error
      try {
        tx.abort()
      } catch {
        // Already finished or aborting; the error is reported below.
      }
    }
    tx.oncomplete = () => resolve(result)
    tx.onabort = () => reject(failure ?? tx.error ?? new Error('Photo transaction aborted'))
    try {
      work(tx.objectStore(STORE_NAME), fail, (value) => {
        result = value
      })
    } catch (error) {
      fail(error)
    }
  })
}

// Saves the slideshow order. `orderedIds` must be every saved photo's id,
// in the new order. Only `position` changes: each record is written back
// with all its other fields as they were, the blob included (the same Blob
// read from the store, never decoded or re-encoded). Records already at the
// right position are not written. All in one transaction, so a failure
// leaves the previous order exactly as it was.
export function savePhotoOrder(orderedIds) {
  return writeTransaction((store, fail) => {
    const request = store.getAll()
    request.onsuccess = () => {
      try {
        const byId = new Map(request.result.map((photo) => [photo.id, photo]))
        // The list on screen is out of date (a photo was added or removed
        // elsewhere). Never write an order computed from it.
        if (orderedIds.length !== byId.size || !orderedIds.every((id) => byId.has(id))) {
          fail(new Error('The photo list changed before the order was saved'))
          return
        }
        orderedIds.forEach((id, position) => {
          const photo = byId.get(id)
          if (photo.position !== position) store.put({ ...photo, position })
        })
      } catch (error) {
        fail(error)
      }
    }
  })
}

// Saves a new caption for one photo and resolves with the caption as
// stored (see normalizeCaption). Only `caption` changes; the blob is written
// back exactly as it was read.
export function updatePhotoCaption(id, caption) {
  const normalized = normalizeCaption(caption)
  return writeTransaction((store, fail, setResult) => {
    const request = store.get(id)
    request.onsuccess = () => {
      try {
        const photo = request.result
        if (!photo) {
          fail(new Error('That photo is no longer saved'))
          return
        }
        if (photo.caption !== normalized) store.put({ ...photo, caption: normalized })
        setResult(normalized)
      } catch (error) {
        fail(error)
      }
    }
  })
}

// Replaces every saved photo at once, in a single transaction: either all of
// it applies (old photos cleared, new ones added, in the given order) or
// none of it does. Used by backup restore, so a mid-way failure (e.g. quota)
// never leaves a mix of old and new photos.
export async function replaceAllPhotos(photos) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    store.clear()
    for (const photo of photos) {
      store.add({
        caption: photo.caption ?? '',
        blob: photo.blob,
        createdAt: photo.createdAt ?? Date.now(),
      })
    }
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })
}
