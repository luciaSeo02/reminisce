import { beforeEach, describe, expect, it } from 'vitest'
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate'
import {
  BackupError,
  CURRENT_SCHEMA_VERSION,
  createBackupZip,
  restoreBackup,
} from './backupStore.js'
import { getSelectedSongs, replaceSelectedSongs } from './musicStore.js'
import { getStoredPin, setStoredPin } from './managePin.js'
import { getStoredLanguage, setStoredLanguage } from '../i18n/languageStore.js'
import {
  getStoredFontSize,
  getStoredTheme,
  setStoredFontSize,
  setStoredTheme,
} from '../settings/displaySettingsStore.js'

// backupStore reads/writes localStorage directly, like musicStore, so tests
// stand in a minimal in-memory implementation before each run. These tests
// only cover the songs-and-settings path (includePhotos: false), which never
// touches IndexedDB, so no fake IndexedDB is needed here.
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
  global.localStorage = createMemoryStorage()
})

describe('backupStore', () => {
  it('round trip: export then import gives the same songs and settings', async () => {
    replaceSelectedSongs([{ videoId: 'a', title: 'Song A', thumbnailUrl: 'thumb.jpg' }])
    setStoredLanguage('es')
    setStoredFontSize('large')
    setStoredTheme('sky')

    const { blob } = await createBackupZip({ includePhotos: false })

    // Simulate the browser data being cleared before restoring.
    global.localStorage = createMemoryStorage()

    await restoreBackup(blob)

    expect(getSelectedSongs()).toEqual([
      { videoId: 'a', title: 'Song A', thumbnailUrl: 'thumb.jpg' },
    ])
    expect(getStoredLanguage()).toBe('es')
    expect(getStoredFontSize()).toBe('large')
    expect(getStoredTheme()).toBe('sky')
  })

  it('rejects an invalid or corrupted file and leaves existing data intact', async () => {
    replaceSelectedSongs([{ videoId: 'keep', title: 'Keep me' }])
    const corrupted = new Blob(['this is not a zip file'])

    await expect(restoreBackup(corrupted)).rejects.toBeInstanceOf(BackupError)
    expect(getSelectedSongs()).toEqual([{ videoId: 'keep', title: 'Keep me' }])
  })

  it('rejects a backup with an unknown future schemaVersion, with a clear reason', async () => {
    replaceSelectedSongs([{ videoId: 'keep', title: 'Keep me' }])
    const futureManifest = {
      schemaVersion: CURRENT_SCHEMA_VERSION + 1,
      createdAt: new Date().toISOString(),
      language: 'en',
      fontSize: 'normal',
      theme: 'warm',
      songs: [{ videoId: 'from-the-future', title: 'A song from a newer app' }],
      includesPhotos: false,
      photos: [],
    }
    const zipped = zipSync({ 'manifest.json': strToU8(JSON.stringify(futureManifest)) })
    const blob = new Blob([zipped])

    let caught
    try {
      await restoreBackup(blob)
    } catch (error) {
      caught = error
    }

    expect(caught).toBeInstanceOf(BackupError)
    expect(caught.code).toBe('unsupported-version')
    // Rejected before anything was touched: the old song is still there.
    expect(getSelectedSongs()).toEqual([{ videoId: 'keep', title: 'Keep me' }])
  })

  it('never includes the PIN in the exported backup', async () => {
    setStoredPin('1234')
    replaceSelectedSongs([{ videoId: 'a', title: 'Song A' }])

    const { blob } = await createBackupZip({ includePhotos: false })
    const buffer = await blob.arrayBuffer()
    const archive = unzipSync(new Uint8Array(buffer))
    const manifestText = strFromU8(archive['manifest.json'])

    expect(manifestText).not.toContain('1234')
    expect(manifestText.toLowerCase()).not.toContain('pin')
    // The PIN itself is untouched by taking a backup.
    expect(getStoredPin()).toBe('1234')
  })
})
