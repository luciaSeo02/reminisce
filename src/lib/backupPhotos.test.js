import { beforeEach, describe, expect, it } from 'vitest'
import { IDBFactory } from 'fake-indexeddb'
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate'
import { CURRENT_SCHEMA_VERSION, createBackupZip, restoreBackup } from './backupStore.js'
import { addPhoto, getAllPhotos, savePhotoOrder, updatePhotoCaption } from './photoStore.js'

// Backups with photos, end to end through a fake IndexedDB: what a
// caregiver saves after reordering and editing captions must restore with
// the same order and captions, and backups made before this existed must
// keep restoring as they did.

function createMemoryStorage() {
  const store = new Map()
  return {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear(),
  }
}

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]

// A distinct PNG-signed blob per photo, so each can be told apart by size.
function pngBytes(extra) {
  return new Uint8Array([...PNG_SIGNATURE, ...Array.from({ length: extra }, (_, i) => i % 256)])
}

const summary = (photos) =>
  photos.map((photo) => ({ caption: photo.caption, size: photo.blob.size, type: photo.blob.type }))

beforeEach(() => {
  global.localStorage = createMemoryStorage()
  globalThis.indexedDB = new IDBFactory()
})

describe('backup with photos', () => {
  it('restores the order and captions saved after a reorder and a caption edit', async () => {
    for (const [caption, extra] of [
      ['Beach', 1],
      ['', 2],
      ['Garden', 3],
      ['Kitchen', 4],
    ]) {
      await addPhoto({ caption, blob: new Blob([pngBytes(extra)], { type: 'image/png' }) })
    }
    const [beach, untitled, garden, kitchen] = (await getAllPhotos()).map((photo) => photo.id)
    await savePhotoOrder([garden, beach, kitchen, untitled])
    await updatePhotoCaption(untitled, 'The wedding\nin the village')
    const expected = summary(await getAllPhotos())
    expect(expected.map((photo) => photo.caption)).toEqual([
      'Garden',
      'Beach',
      'Kitchen',
      'The wedding in the village',
    ])

    const { blob, manifest } = await createBackupZip({ includePhotos: true })
    expect(manifest.photos.map((photo) => photo.caption)).toEqual(expected.map((p) => p.caption))

    // A new device, or a cleared browser.
    globalThis.indexedDB = new IDBFactory()
    await restoreBackup(blob)

    expect(summary(await getAllPhotos())).toEqual(expected)
  })

  it('still restores a backup made before photos could be reordered, in its file order', async () => {
    const oldManifest = {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      createdAt: '2026-03-01T10:00:00.000Z',
      language: 'es',
      fontSize: 'large',
      theme: 'warm',
      songs: [],
      includesPhotos: true,
      photos: [
        { file: 'photos/0.png', caption: 'First' },
        { file: 'photos/1.png' },
        { file: 'photos/2.png', caption: 'Third' },
      ],
    }
    const zip = zipSync({
      'manifest.json': strToU8(JSON.stringify(oldManifest)),
      'photos/0.png': pngBytes(10),
      'photos/1.png': pngBytes(20),
      'photos/2.png': pngBytes(30),
    })
    await restoreBackup(new Blob([zip]))

    expect(summary(await getAllPhotos())).toEqual([
      { caption: 'First', size: 18, type: 'image/png' },
      { caption: '', size: 28, type: 'image/png' },
      { caption: 'Third', size: 38, type: 'image/png' },
    ])
  })

  it('writes no new field into the backup manifest', async () => {
    await addPhoto({ caption: 'a', blob: new Blob([pngBytes(1)], { type: 'image/png' }) })
    await addPhoto({ caption: 'b', blob: new Blob([pngBytes(2)], { type: 'image/png' }) })
    const ids = (await getAllPhotos()).map((photo) => photo.id)
    await savePhotoOrder(ids.reverse())

    const { blob } = await createBackupZip({ includePhotos: true })
    const files = unzipSync(new Uint8Array(await blob.arrayBuffer()))
    const manifest = JSON.parse(strFromU8(files['manifest.json']))
    expect(manifest.photos).toEqual([
      { file: 'photos/0.png', caption: 'b' },
      { file: 'photos/1.png', caption: 'a' },
    ])
  })
})
