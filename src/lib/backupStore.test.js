import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate'
import {
  BackupError,
  CURRENT_SCHEMA_VERSION,
  MAX_MANIFEST_BYTES,
  MAX_PHOTO_BYTES,
  createBackupZip,
  getLastBackupAt,
  parseBackupFile,
  restoreBackup,
  saveOrShareBackup,
} from './backupStore.js'
import { getSelectedSongs, replaceSelectedSongs } from './musicStore.js'
import { getStoredPin, setStoredPin } from './managePin.js'
import { UNLOCK_KEY } from './manageUnlock.js'
import { getStoredLanguage, setStoredLanguage } from '../i18n/languageStore.js'
import {
  getStoredFontSize,
  getStoredTheme,
  setStoredFontSize,
  setStoredTheme,
} from '../settings/displaySettingsStore.js'

// backupStore reads/writes localStorage directly, like musicStore, so tests
// stand in a minimal in-memory implementation before each run. These tests
// only cover the songs-and-settings path (includePhotos: false) for the
// round trip, which never touches IndexedDB, so no fake IndexedDB is needed
// here. Photo-content checks below build their own zip bytes directly with
// fflate instead of going through IndexedDB.
function createMemoryStorage() {
  const store = new Map()
  return {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear(),
  }
}

// A real, well-formed 11-character YouTube video id, used wherever a test
// needs one that passes validation.
const VALID_VIDEO_ID = 'dQw4w9WgXcQ'
const OTHER_VALID_VIDEO_ID = 'oHg5SJYRHA0'

function baseManifest(overrides = {}) {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    createdAt: new Date().toISOString(),
    language: 'en',
    fontSize: 'normal',
    theme: 'warm',
    songs: [],
    includesPhotos: false,
    photos: [],
    ...overrides,
  }
}

function zipManifest(manifest, extraFiles = {}) {
  return new Blob([zipSync({ 'manifest.json': strToU8(JSON.stringify(manifest)), ...extraFiles })])
}

beforeEach(() => {
  global.localStorage = createMemoryStorage()
})

afterEach(() => {
  delete global.navigator
})

describe('backupStore', () => {
  it('round trip: export then import gives the same songs and settings', async () => {
    replaceSelectedSongs([
      { videoId: VALID_VIDEO_ID, title: 'Song A', thumbnailUrl: 'https://i.ytimg.com/a.jpg' },
    ])
    setStoredLanguage('es')
    setStoredFontSize('large')
    setStoredTheme('sky')

    const { blob } = await createBackupZip({ includePhotos: false })

    // Simulate the browser data being cleared before restoring.
    global.localStorage = createMemoryStorage()

    await restoreBackup(blob)

    expect(getSelectedSongs()).toEqual([
      { videoId: VALID_VIDEO_ID, title: 'Song A', thumbnailUrl: 'https://i.ytimg.com/a.jpg' },
    ])
    expect(getStoredLanguage()).toBe('es')
    expect(getStoredFontSize()).toBe('large')
    expect(getStoredTheme()).toBe('sky')
  })

  it('rejects an invalid or corrupted file and leaves existing data intact', async () => {
    replaceSelectedSongs([{ videoId: VALID_VIDEO_ID, title: 'Keep me' }])
    const corrupted = new Blob(['this is not a zip file'])

    await expect(restoreBackup(corrupted)).rejects.toBeInstanceOf(BackupError)
    expect(getSelectedSongs()).toEqual([{ videoId: VALID_VIDEO_ID, title: 'Keep me' }])
  })

  it('rejects a backup with an unknown future schemaVersion, with a clear reason', async () => {
    replaceSelectedSongs([{ videoId: VALID_VIDEO_ID, title: 'Keep me' }])
    const futureManifest = baseManifest({
      schemaVersion: CURRENT_SCHEMA_VERSION + 1,
      songs: [{ videoId: OTHER_VALID_VIDEO_ID, title: 'A song from a newer app' }],
    })
    const blob = zipManifest(futureManifest)

    let caught
    try {
      await restoreBackup(blob)
    } catch (error) {
      caught = error
    }

    expect(caught).toBeInstanceOf(BackupError)
    expect(caught.code).toBe('unsupported-version')
    // Rejected before anything was touched: the old song is still there.
    expect(getSelectedSongs()).toEqual([{ videoId: VALID_VIDEO_ID, title: 'Keep me' }])
  })

  it('never includes the PIN in the exported backup', async () => {
    setStoredPin('1234')
    replaceSelectedSongs([{ videoId: VALID_VIDEO_ID, title: 'Song A' }])

    const { blob } = await createBackupZip({ includePhotos: false })
    const buffer = await blob.arrayBuffer()
    const archive = unzipSync(new Uint8Array(buffer))
    const manifestText = strFromU8(archive['manifest.json'])

    expect(manifestText).not.toContain('1234')
    expect(manifestText.toLowerCase()).not.toContain('pin')
    // The PIN itself is untouched by taking a backup.
    expect(getStoredPin()).toBe('1234')
  })

  it('never includes the session unlock in a backup, and restoring leaves it alone', async () => {
    global.sessionStorage = createMemoryStorage()
    const expiresAt = String(Date.now() + 60_000)
    sessionStorage.setItem(UNLOCK_KEY, expiresAt)
    replaceSelectedSongs([{ videoId: VALID_VIDEO_ID, title: 'Song A' }])

    const { blob } = await createBackupZip({ includePhotos: false })
    const archive = unzipSync(new Uint8Array(await blob.arrayBuffer()))
    const manifestText = strFromU8(archive['manifest.json'])

    expect(manifestText).not.toContain(expiresAt)
    expect(manifestText).not.toContain('unlocked')

    // The page reloads after a restore; the unlock must still be there so
    // the caregiver is not asked for the PIN again within the window.
    await restoreBackup(blob)
    expect(sessionStorage.getItem(UNLOCK_KEY)).toBe(expiresAt)
    delete global.sessionStorage
  })

  describe('untrusted input in the restore path', () => {
    it('rejects a song whose video id is not a valid YouTube id', async () => {
      const manifest = baseManifest({
        songs: [{ videoId: 'not-a-real-id-at-all', title: 'Suspicious song' }],
      })
      await expect(parseBackupFile(zipManifest(manifest))).rejects.toBeInstanceOf(BackupError)
    })

    it('rejects a song thumbnail URL that is not https', async () => {
      const manifest = baseManifest({
        songs: [
          { videoId: VALID_VIDEO_ID, title: 'Song A', thumbnailUrl: 'javascript:alert(1)' },
        ],
      })
      await expect(parseBackupFile(zipManifest(manifest))).rejects.toBeInstanceOf(BackupError)
    })

    it('rejects a manifest with too many songs', async () => {
      const manifest = baseManifest({
        songs: Array.from({ length: 5001 }, (_, i) => ({
          videoId: VALID_VIDEO_ID,
          title: `Song ${i}`,
        })),
      })
      await expect(parseBackupFile(zipManifest(manifest))).rejects.toBeInstanceOf(BackupError)
    })

    it('rejects an unrecognized language, font size or theme', async () => {
      const manifest = baseManifest({ theme: '<script>evil</script>' })
      await expect(parseBackupFile(zipManifest(manifest))).rejects.toBeInstanceOf(BackupError)
    })

    it('rejects a photo entry whose file path tries to escape the photos folder', async () => {
      const manifest = baseManifest({
        includesPhotos: true,
        photos: [{ file: '../../etc/passwd', caption: 'escape attempt' }],
      })
      await expect(parseBackupFile(zipManifest(manifest))).rejects.toBeInstanceOf(BackupError)
    })

    it('rejects a photo entry with an absolute file path', async () => {
      const manifest = baseManifest({
        includesPhotos: true,
        photos: [{ file: '/etc/passwd', caption: 'absolute path' }],
      })
      await expect(parseBackupFile(zipManifest(manifest))).rejects.toBeInstanceOf(BackupError)
    })

    it('rejects a manifest with too many photo entries', async () => {
      const manifest = baseManifest({
        includesPhotos: true,
        photos: Array.from({ length: 2001 }, (_, i) => ({
          file: `photos/${i}.jpg`,
          caption: '',
        })),
      })
      await expect(parseBackupFile(zipManifest(manifest))).rejects.toBeInstanceOf(BackupError)
    })

    it('never extracts a zip entry whose name escapes the expected files, even if present in the archive', async () => {
      const manifest = baseManifest()
      const malicious = zipSync({
        'manifest.json': strToU8(JSON.stringify(manifest)),
        '../../escape.txt': strToU8('should never be read'),
        '/etc/passwd': strToU8('should never be read either'),
      })
      const blob = new Blob([malicious])

      const { manifest: parsed } = await parseBackupFile(blob)
      expect(parsed.schemaVersion).toBe(CURRENT_SCHEMA_VERSION)
      // The archive itself is internal to parseBackupFile; what matters is
      // that restoring this file never throws trying to use the escaping
      // entries, and nothing about them leaks into the parsed result.
      expect(JSON.stringify(parsed)).not.toContain('escape')
    })

    it('rejects a photo file that is not a real image, even with a valid name and extension', async () => {
      const manifest = baseManifest({
        includesPhotos: true,
        photos: [{ file: 'photos/0.jpg', caption: 'not actually a photo' }],
      })
      const blob = zipManifest(manifest, {
        'photos/0.jpg': strToU8('this is plain text, not JPEG bytes'),
      })

      await expect(parseBackupFile(blob)).rejects.toBeInstanceOf(BackupError)
    })

    it('accepts a photo file with a real PNG signature', async () => {
      const pngSignature = new Uint8Array([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0,
      ])
      const manifest = baseManifest({
        includesPhotos: true,
        photos: [{ file: 'photos/0.png', caption: 'a real photo' }],
      })
      const blob = zipManifest(manifest, { 'photos/0.png': pngSignature })

      const { photos } = await parseBackupFile(blob)
      expect(photos).toHaveLength(1)
      expect(photos[0].blob.type).toBe('image/png')
    })

    it('rejects a manifest.json larger than the size limit before parsing it', async () => {
      const manifest = baseManifest({ padding: 'x'.repeat(MAX_MANIFEST_BYTES + 1024) })
      const blob = zipManifest(manifest)

      await expect(parseBackupFile(blob)).rejects.toBeInstanceOf(BackupError)
    })

    it('accepts a single photo well under the per-photo size limit', async () => {
      // A realistic large, unresized phone photo (see issue #55): comfortably
      // under the cap, so this should restore, not be rejected for size.
      const largePhoto = new Uint8Array(10 * 1024 * 1024)
      largePhoto.set([0xff, 0xd8, 0xff, 0xe0], 0)
      const manifest = baseManifest({
        includesPhotos: true,
        photos: [{ file: 'photos/0.jpg', caption: 'a large, real phone photo' }],
      })
      const blob = zipManifest(manifest, { 'photos/0.jpg': [largePhoto, { level: 0 }] })

      const { photos } = await parseBackupFile(blob)
      expect(photos).toHaveLength(1)
      expect(photos[0].blob.size).toBe(largePhoto.length)
    })

    it('rejects a single photo over the per-photo size limit', async () => {
      const oversizedPhoto = new Uint8Array(MAX_PHOTO_BYTES + 1024)
      oversizedPhoto.set([0xff, 0xd8, 0xff, 0xe0], 0)
      const manifest = baseManifest({
        includesPhotos: true,
        photos: [{ file: 'photos/0.jpg', caption: 'too big' }],
      })
      const blob = zipManifest(manifest, { 'photos/0.jpg': [oversizedPhoto, { level: 0 }] })

      await expect(parseBackupFile(blob)).rejects.toBeInstanceOf(BackupError)
    })

    it('rejects the whole restore if one photo among several is not a real image, with a calm reason and no data changed', async () => {
      replaceSelectedSongs([{ videoId: VALID_VIDEO_ID, title: 'Keep me' }])
      const pngSignature = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
      const manifest = baseManifest({
        includesPhotos: true,
        photos: [
          { file: 'photos/0.png', caption: 'a real photo' },
          { file: 'photos/1.png', caption: 'this one is not a real photo' },
        ],
      })
      const blob = zipManifest(manifest, {
        'photos/0.png': pngSignature,
        'photos/1.png': strToU8('plain text, not a PNG'),
      })

      let caught
      try {
        await restoreBackup(blob)
      } catch (error) {
        caught = error
      }

      expect(caught).toBeInstanceOf(BackupError)
      // code 'invalid' (not 'unsupported-version') is what the Manage screen
      // maps to its calm "could not be used as a backup, nothing changed"
      // message, so this is the part of the contract worth pinning down.
      expect(caught.code).toBe('invalid')
      expect(getSelectedSongs()).toEqual([{ videoId: VALID_VIDEO_ID, title: 'Keep me' }])
    })

    it('restores a realistic large song list (1000+ songs)', async () => {
      const manySongs = Array.from({ length: 1200 }, (_, i) => ({
        videoId: VALID_VIDEO_ID,
        title: `Song number ${i}`,
        thumbnailUrl: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/mqdefault.jpg',
      }))
      replaceSelectedSongs(manySongs)

      const { blob, manifest } = await createBackupZip({ includePhotos: false })
      expect(manifest.songs).toHaveLength(1200)

      global.localStorage = createMemoryStorage()
      await restoreBackup(blob)

      expect(getSelectedSongs()).toHaveLength(1200)
    })
  })

  describe('cancelling the share sheet', () => {
    it('does not throw or record a backup when the caregiver cancels sharing', async () => {
      const abortError = Object.assign(new Error('cancelled'), { name: 'AbortError' })
      global.navigator = {
        canShare: () => true,
        share: () => Promise.reject(abortError),
      }

      await expect(
        saveOrShareBackup(new Blob(['zip bytes']), 'backup.zip'),
      ).resolves.toBeUndefined()
      expect(getLastBackupAt()).toBeNull()
    })
  })
})
