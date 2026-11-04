// Backup and restore for everything a caregiver sets up: selected songs,
// language, text size, theme, and (optionally) photos. Packaged as a single
// .zip file so it can be saved outside the browser and brought back later.
//
// manifest.json is the source of truth inside the zip. schemaVersion exists
// so a future, incompatible format can be rejected cleanly instead of
// silently corrupting data; anything else (a new field) should just be read
// if present and skipped if absent, so old backups keep restoring after the
// app gains new fields.
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate'
import { getAllPhotos, replaceAllPhotos } from './photoStore.js'
import { getSelectedSongs, replaceSelectedSongs } from './musicStore.js'
import { getStoredLanguage, setStoredLanguage } from '../i18n/languageStore.js'
import {
  getStoredFontSize,
  getStoredTheme,
  setStoredFontSize,
  setStoredTheme,
} from '../settings/displaySettingsStore.js'

export const CURRENT_SCHEMA_VERSION = 1

const LAST_BACKUP_KEY = 'reminisce-last-backup-at'
const MANIFEST_FILE = 'manifest.json'
const PHOTOS_FOLDER = 'photos'

export class BackupError extends Error {
  constructor(code, message) {
    super(message)
    this.name = 'BackupError'
    this.code = code
  }
}

export function getLastBackupAt() {
  const raw = localStorage.getItem(LAST_BACKUP_KEY)
  return raw ? new Date(raw) : null
}

function recordBackupNow() {
  localStorage.setItem(LAST_BACKUP_KEY, new Date().toISOString())
}

function extensionFor(blob) {
  const type = blob?.type ?? ''
  if (type.includes('png')) return 'png'
  if (type.includes('webp')) return 'webp'
  if (type.includes('gif')) return 'gif'
  return 'jpg'
}

// photos is the already-fetched photo list (or [] when not included), so the
// manifest and the zip entries are always built from the exact same read.
function buildManifest({ includePhotos, photos }) {
  const songs = getSelectedSongs()

  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    createdAt: new Date().toISOString(),
    language: getStoredLanguage(),
    fontSize: getStoredFontSize(),
    theme: getStoredTheme(),
    songs: songs.map((song) => ({
      videoId: song.videoId,
      title: song.title,
      thumbnailUrl: song.thumbnailUrl ?? null,
    })),
    includesPhotos: includePhotos,
    photos: includePhotos
      ? photos.map((photo, index) => ({
          file: `${PHOTOS_FOLDER}/${index}.${extensionFor(photo.blob)}`,
          caption: photo.caption ?? '',
        }))
      : [],
  }
  // Note: the PIN (reminisce-manage-pin) is deliberately never read here.
}

// Returns the total bytes of every saved photo, for the "approximate size"
// line shown before saving a backup with photos. This is an estimate: photos
// are stored in the zip uncompressed (they're already JPEG/PNG), so the real
// zip ends up close to this number plus a small, fixed overhead for
// manifest.json and the zip index.
export async function estimatePhotosBackupSize() {
  const photos = await getAllPhotos()
  return photos.reduce((total, photo) => total + (photo.blob?.size ?? 0), 0)
}

export function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return ''
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB']
  let value = bytes / 1024
  let unitIndex = 0
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }
  return `${value.toFixed(1)} ${units[unitIndex]}`
}

// Builds the backup zip in memory and returns it as a Blob, ready to save or
// share. Does not touch any stored data or the "last backup" date.
export async function createBackupZip({ includePhotos }) {
  const photos = includePhotos ? await getAllPhotos() : []
  const manifest = buildManifest({ includePhotos, photos })
  const files = {
    [MANIFEST_FILE]: strToU8(JSON.stringify(manifest, null, 2)),
  }

  for (let i = 0; i < photos.length; i += 1) {
    const buffer = await photos[i].blob.arrayBuffer()
    // level 0: photos are already JPEG/PNG, compressing them again just
    // spends CPU for no size benefit.
    files[manifest.photos[i].file] = [new Uint8Array(buffer), { level: 0 }]
  }

  const zipped = zipSync(files)
  return {
    blob: new Blob([zipped], { type: 'application/zip' }),
    manifest,
  }
}

export function backupFileName(manifest) {
  const date = (manifest.createdAt ?? new Date().toISOString()).slice(0, 10)
  const suffix = manifest.includesPhotos ? '-with-photos' : ''
  return `reminisce-backup${suffix}-${date}.zip`
}

// Saves a blob as a file. Prefers the share sheet when the browser supports
// sharing files (useful on Android, to send the backup straight to Drive,
// WhatsApp or email); falls back to a normal download link otherwise. Both
// paths are widely supported, unlike the File System Access API.
export async function saveOrShareBackup(blob, filename) {
  const file = new File([blob], filename, { type: 'application/zip' })

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file] })
      recordBackupNow()
      return
    } catch (error) {
      // AbortError means the caregiver cancelled the share sheet; that is
      // not a failed backup, just fall through to a plain download.
      if (error?.name === 'AbortError') return
    }
  }

  const url = URL.createObjectURL(blob)
  try {
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    link.remove()
    recordBackupNow()
  } finally {
    URL.revokeObjectURL(url)
  }
}

function validateManifestShape(manifest) {
  if (!manifest || typeof manifest !== 'object') {
    throw new BackupError('invalid', 'Manifest is missing or malformed.')
  }
  if (!Number.isInteger(manifest.schemaVersion) || manifest.schemaVersion < 1) {
    throw new BackupError('invalid', 'Manifest has no valid schemaVersion.')
  }
  if (manifest.schemaVersion > CURRENT_SCHEMA_VERSION) {
    throw new BackupError(
      'unsupported-version',
      `Backup schemaVersion ${manifest.schemaVersion} is newer than this app supports (${CURRENT_SCHEMA_VERSION}).`,
    )
  }
  if (!Array.isArray(manifest.songs)) {
    throw new BackupError('invalid', 'Manifest songs list is missing or malformed.')
  }
  if (manifest.includesPhotos && !Array.isArray(manifest.photos)) {
    throw new BackupError('invalid', 'Manifest photo list is missing or malformed.')
  }
}

// Reads and validates a backup file without changing any stored data. Throws
// a BackupError (code 'invalid' or 'unsupported-version') if the file can't
// be used as a backup. On success, returns everything needed to apply it.
export async function parseBackupFile(file) {
  let archive
  try {
    const buffer = await file.arrayBuffer()
    archive = unzipSync(new Uint8Array(buffer))
  } catch {
    throw new BackupError('invalid', 'Could not read this file as a zip archive.')
  }

  const manifestBytes = archive[MANIFEST_FILE]
  if (!manifestBytes) {
    throw new BackupError('invalid', 'This zip has no manifest.json.')
  }

  let manifest
  try {
    manifest = JSON.parse(strFromU8(manifestBytes))
  } catch {
    throw new BackupError('invalid', 'manifest.json is not valid JSON.')
  }

  validateManifestShape(manifest)

  const photos = []
  if (manifest.includesPhotos) {
    for (const entry of manifest.photos) {
      const bytes = archive[entry?.file]
      if (!bytes) {
        throw new BackupError('invalid', `Missing photo file referenced in manifest: ${entry?.file}`)
      }
      photos.push({
        caption: entry.caption ?? '',
        blob: new Blob([bytes]),
      })
    }
  }

  return { manifest, photos }
}

// Applies a parsed, already-validated backup. Replaces photos first (that
// write is a single IndexedDB transaction, so it is all-or-nothing on its
// own); only once that has succeeded do we touch localStorage. If anything
// after the photo replace fails, the photos are rolled back to what they
// were before, so a failure never leaves a mix of old and new data.
export async function applyBackup({ manifest, photos }) {
  const previousPhotos = manifest.includesPhotos ? await getAllPhotos() : null

  if (manifest.includesPhotos) {
    await replaceAllPhotos(photos)
  }

  try {
    replaceSelectedSongs(
      manifest.songs.map((song) => ({
        videoId: song.videoId,
        title: song.title,
        thumbnailUrl: song.thumbnailUrl ?? null,
      })),
    )
    if (manifest.language) setStoredLanguage(manifest.language)
    if (manifest.fontSize) setStoredFontSize(manifest.fontSize)
    if (manifest.theme) setStoredTheme(manifest.theme)
  } catch (error) {
    if (previousPhotos) {
      await replaceAllPhotos(previousPhotos).catch(() => {
        // Best effort: the original failure is what we report. If the
        // rollback itself fails there is nothing more to undo safely.
      })
    }
    throw new BackupError('invalid', `Could not apply backup: ${error.message}`)
  }
}

// Convenience wrapper for the UI: validate the file, then apply it. Nothing
// is written until the file has been fully validated.
export async function restoreBackup(file) {
  const parsed = await parseBackupFile(file)
  await applyBackup(parsed)
  return parsed.manifest
}

export function requestPersistentStorage() {
  if (navigator.storage && typeof navigator.storage.persist === 'function') {
    navigator.storage.persist().catch(() => {
      // Nothing to show the caregiver either way; this is a best-effort ask.
    })
  }
}
