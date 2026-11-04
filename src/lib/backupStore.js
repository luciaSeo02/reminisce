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
import { LANGUAGE_NAMES } from '../i18n/LanguageContext.jsx'
import { FONT_SCALES, THEMES } from '../settings/DisplaySettingsContext.jsx'
import { sniffImageType } from './imageSniff.js'

export const CURRENT_SCHEMA_VERSION = 1

const LAST_BACKUP_KEY = 'reminisce-last-backup-at'
const MANIFEST_FILE = 'manifest.json'
const PHOTOS_FOLDER = 'photos'

// Everything below this point in the module deals with data that came from
// outside the app (a restored .zip can be any file a caregiver was handed,
// not necessarily one this app produced), so it is treated as untrusted:
// validated before use, never trusted to shape storage keys or markup.

// Real YouTube video ids are exactly 11 characters from this set.
const YOUTUBE_VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/
// The only file names a backup is ever allowed to reference or contain.
// Anchored and with no ".." or "/" wildcards, so this also rules out path
// traversal ("../x") and absolute paths ("/x") by construction.
const PHOTO_FILE_PATTERN = /^photos\/\d+\.(jpg|jpeg|png|gif|webp)$/
const KNOWN_LANGUAGES = Object.keys(LANGUAGE_NAMES)
const KNOWN_FONT_SIZES = Object.keys(FONT_SCALES)
const KNOWN_THEMES = Object.keys(THEMES)

const MAX_TITLE_LENGTH = 300
const MAX_URL_LENGTH = 2000
const MAX_CAPTION_LENGTH = 2000
// A real caregiver's song list runs to at most a few hundred songs; this
// leaves a wide margin above that (checked against a 1000+ song list).
export const MAX_SONGS = 5000
// Generous for a reminiscence photo set, which in practice is a curated
// handful to a few hundred photos, not a full camera roll.
export const MAX_PHOTOS = 2000
// Whole uploaded file, and the running total of what the zip's own entries
// declare they'll decompress to. A zip can declare a huge "original size"
// for an entry while actually shipping very few compressed bytes (a "zip
// bomb"); checking declared sizes before decompressing anything, and capping
// their running total, keeps a crafted or corrupted backup from being able
// to force a huge allocation.
//
// Photos aren't resized before being stored (see issue #55), so a backup
// with photos needs real headroom: a caregiver with a few hundred unresized
// phone photos (commonly 3-8 MB each, occasionally more for panoramas or
// high-resolution cameras) can land a backup several hundred MB in size.
// 2 GB stays well above that, while still bounding a crafted file. A single
// photo is capped separately (below) so a huge total can't come from one
// implausible file; 50 MB comfortably covers even an unusually large single
// phone photo. Note this is a defensive ceiling, not a guarantee that any
// given device has enough memory to hold a backup that large; very large
// backups remain limited by the device itself regardless of this cap.
export const MAX_BACKUP_FILE_BYTES = 2 * 1024 * 1024 * 1024
// Plenty for thousands of songs (a realistic manifest with 1000 songs is
// well under 1 MB); kept well above that for long titles and multi-byte
// (accented, non-Latin) text.
export const MAX_MANIFEST_BYTES = 5 * 1024 * 1024
export const MAX_PHOTO_BYTES = 50 * 1024 * 1024

function hasOwn(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key)
}

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

function isNonEmptyString(value, maxLength) {
  return typeof value === 'string' && value.length > 0 && value.length <= maxLength
}

function validateSong(song) {
  if (!song || typeof song !== 'object') {
    throw new BackupError('invalid', 'A song entry is malformed.')
  }
  if (typeof song.videoId !== 'string' || !YOUTUBE_VIDEO_ID_PATTERN.test(song.videoId)) {
    throw new BackupError('invalid', 'A song has an invalid video id.')
  }
  if (!isNonEmptyString(song.title, MAX_TITLE_LENGTH)) {
    throw new BackupError('invalid', 'A song has an invalid title.')
  }
  if (
    song.thumbnailUrl != null &&
    (!isNonEmptyString(song.thumbnailUrl, MAX_URL_LENGTH) || !/^https:\/\//.test(song.thumbnailUrl))
  ) {
    throw new BackupError('invalid', 'A song has an invalid thumbnail URL.')
  }
}

function validatePhotoEntry(entry) {
  if (!entry || typeof entry !== 'object' || !PHOTO_FILE_PATTERN.test(entry.file ?? '')) {
    throw new BackupError('invalid', 'A photo entry has an invalid file reference.')
  }
  // Captions may legitimately be empty; anything present must be a bounded
  // plain string (never an object or markup to be interpreted later).
  const caption = entry.caption
  if (caption != null && caption !== '' && !isNonEmptyString(caption, MAX_CAPTION_LENGTH)) {
    throw new BackupError('invalid', 'A photo has an invalid caption.')
  }
}

// Validates everything about the manifest's shape and content: every field
// coming from the backup file is untrusted until checked here. schemaVersion
// is checked first, since nothing else about an unsupported future format
// can be assumed safe to read.
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
  if (!Array.isArray(manifest.songs) || manifest.songs.length > MAX_SONGS) {
    throw new BackupError('invalid', 'Manifest songs list is missing, malformed, or too long.')
  }
  manifest.songs.forEach(validateSong)

  if (manifest.includesPhotos) {
    if (!Array.isArray(manifest.photos) || manifest.photos.length > MAX_PHOTOS) {
      throw new BackupError('invalid', 'Manifest photo list is missing, malformed, or too long.')
    }
    manifest.photos.forEach(validatePhotoEntry)
  }

  if (manifest.language != null && !KNOWN_LANGUAGES.includes(manifest.language)) {
    throw new BackupError('invalid', 'Manifest language is not recognized.')
  }
  if (manifest.fontSize != null && !KNOWN_FONT_SIZES.includes(manifest.fontSize)) {
    throw new BackupError('invalid', 'Manifest font size is not recognized.')
  }
  if (manifest.theme != null && !KNOWN_THEMES.includes(manifest.theme)) {
    throw new BackupError('invalid', 'Manifest theme is not recognized.')
  }
}

// Reads and validates a backup file without changing any stored data. Throws
// a BackupError (code 'invalid' or 'unsupported-version') if the file can't
// be used as a backup. On success, returns everything needed to apply it.
export async function parseBackupFile(file) {
  if (typeof file.size === 'number' && file.size > MAX_BACKUP_FILE_BYTES) {
    throw new BackupError('invalid', `Backup file is larger than the ${formatBytes(MAX_BACKUP_FILE_BYTES)} limit.`)
  }

  // Only ever decompress the exact files this app can use (manifest.json, or
  // a photo path matching PHOTO_FILE_PATTERN); this is what keeps a crafted
  // entry name like "../../x" or "/etc/x" from ever being extracted at all,
  // since it simply never matches. Declared (pre-decompression) sizes are
  // also checked here, and a running total kept, so a zip that lies about
  // how large its entries are can't force a huge allocation.
  let declaredTotalBytes = 0
  let rejectedForSize = false
  let photoEntryCount = 0
  function filterEntry(entry) {
    if (entry.name === MANIFEST_FILE) {
      declaredTotalBytes += entry.originalSize
      if (entry.originalSize > MAX_MANIFEST_BYTES || declaredTotalBytes > MAX_BACKUP_FILE_BYTES) {
        rejectedForSize = true
        return false
      }
      return true
    }
    if (PHOTO_FILE_PATTERN.test(entry.name)) {
      photoEntryCount += 1
      declaredTotalBytes += entry.originalSize
      if (
        photoEntryCount > MAX_PHOTOS ||
        entry.originalSize > MAX_PHOTO_BYTES ||
        declaredTotalBytes > MAX_BACKUP_FILE_BYTES
      ) {
        rejectedForSize = true
        return false
      }
      return true
    }
    return false
  }

  let archive
  try {
    const buffer = await file.arrayBuffer()
    archive = unzipSync(new Uint8Array(buffer), { filter: filterEntry })
  } catch {
    throw new BackupError('invalid', 'Could not read this file as a zip archive.')
  }

  if (rejectedForSize) {
    throw new BackupError('invalid', 'This backup is too large, or has too many photos, to restore.')
  }

  if (!hasOwn(archive, MANIFEST_FILE)) {
    throw new BackupError('invalid', 'This zip has no manifest.json.')
  }

  let manifest
  try {
    manifest = JSON.parse(strFromU8(archive[MANIFEST_FILE]))
  } catch {
    throw new BackupError('invalid', 'manifest.json is not valid JSON.')
  }

  validateManifestShape(manifest)

  const photos = []
  if (manifest.includesPhotos) {
    for (const entry of manifest.photos) {
      // entry.file already passed PHOTO_FILE_PATTERN in validatePhotoEntry
      // above; hasOwn guards against a prototype-chain lookup (e.g. a file
      // name of "constructor") resolving to something other than real zip
      // content.
      if (!hasOwn(archive, entry.file)) {
        throw new BackupError('invalid', `Missing photo file referenced in manifest: ${entry.file}`)
      }
      const bytes = archive[entry.file]
      const sniffed = sniffImageType(bytes)
      if (!sniffed) {
        throw new BackupError('invalid', `Photo file is not a recognized image: ${entry.file}`)
      }
      photos.push({
        caption: entry.caption ?? '',
        blob: new Blob([bytes], { type: sniffed.mime }),
      })
    }
  }

  return { manifest, photos }
}

// Applies a parsed, already-validated backup. Everything about its content
// (schemaVersion, song and photo shapes, image bytes, size limits) has
// already been checked by parseBackupFile before this runs. Replaces photos
// first (that write is a single IndexedDB transaction, so it is
// all-or-nothing on its own); only once that has succeeded do we touch
// localStorage. If anything after the photo replace fails, the photos are
// rolled back to what they were before, so a failure never leaves a mix of
// old and new data.
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
