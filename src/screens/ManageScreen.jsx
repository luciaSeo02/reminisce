import { useEffect, useRef, useState } from 'react'
import { addPhoto, deletePhoto, getAllPhotos } from '../lib/photoStore.js'
import { getStoredPin, removeStoredPin, setStoredPin } from '../lib/managePin.js'
import {
  addSelectedSong,
  getSelectedSongs,
  removeSelectedSong,
} from '../lib/musicStore.js'
import {
  BackupError,
  backupFileName,
  createBackupZip,
  estimatePhotosBackupSize,
  formatBytes,
  getLastBackupAt,
  requestPersistentStorage,
  restoreBackup,
  saveOrShareBackup,
} from '../lib/backupStore.js'
import { ACCEPT_ATTRIBUTE, isSupportedImageFile } from '../lib/imageSniff.js'
import { LANGUAGE_NAMES, useLanguage, useStrings } from '../i18n/LanguageContext.jsx'
import { THEMES, useDisplaySettings } from '../settings/DisplaySettingsContext.jsx'
import ScreenHeader from './shared/ScreenHeader.jsx'
import {
  CheckIcon,
  DownloadIcon,
  GlobeIcon,
  LockIcon,
  MusicIcon,
  PaletteIcon,
  PhotosIcon,
  PlusIcon,
  SearchIcon,
  ShieldIcon,
  TextSizeIcon,
  UploadIcon,
} from './shared/icons.jsx'
import './ManageScreen.css'

const FONT_SIZE_LABEL_KEYS = {
  normal: 'manageFontSizeNormal',
  large: 'manageFontSizeLarge',
  xlarge: 'manageFontSizeExtraLarge',
}

const THEME_LABEL_KEYS = {
  warm: 'manageThemeWarm',
  sky: 'manageThemeSky',
  contrast: 'manageThemeContrast',
  sunset: 'manageThemeSunset',
}

// Page frame for Settings and the PIN screens. The backdrop, Home link and
// title come from the header shared with the other inner screens.
function ManageLayout({ children }) {
  return (
    <div className="manage-page section-manage">
      <ScreenHeader section="manage" homeHref="/" />
      <main className="manage-screen">{children}</main>
    </div>
  )
}

// A card with a round tinted icon and a Fraunces title. `tone` picks the
// icon colors (see ManageScreen.css). A .section-* class in `className`
// makes the pill buttons inside use that section's color.
function SettingsCard({ icon, tone, title, className = '', children }) {
  return (
    <section className={`manage-card manage-tone-${tone} ${className}`.trim()}>
      <div className="manage-card-head">
        <span className="manage-card-icon" aria-hidden="true">
          {icon}
        </span>
        <h2>{title}</h2>
      </div>
      <div className="manage-card-body">{children}</div>
    </section>
  )
}

function OptionButton({ selected, onClick, children }) {
  return (
    <button
      type="button"
      className={selected ? 'manage-option selected' : 'manage-option'}
      aria-pressed={selected}
      onClick={onClick}
    >
      {selected && <CheckIcon />}
      <span>{children}</span>
    </button>
  )
}

function useObjectUrl(blob) {
  const [url, setUrl] = useState('')

  useEffect(() => {
    if (!blob) return
    const objectUrl = URL.createObjectURL(blob)
    setUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [blob])

  return url
}

function PendingPhoto({ file, caption, onCaptionChange }) {
  const strings = useStrings()
  const url = useObjectUrl(file)

  return (
    <li className="manage-photo">
      {url && <img src={url} alt="" className="manage-thumb" />}
      <input
        type="text"
        className="manage-input"
        value={caption}
        onChange={(event) => onCaptionChange(event.target.value)}
        placeholder={strings.manageCaptionPlaceholder}
      />
    </li>
  )
}

function SavedPhoto({ photo, onRemove }) {
  const strings = useStrings()
  const url = useObjectUrl(photo.blob)

  return (
    <li className="manage-photo">
      {url && <img src={url} alt="" className="manage-thumb" />}
      <span className="manage-caption">{photo.caption || strings.manageNoCaption}</span>
      <button type="button" className="manage-row-button" onClick={() => onRemove(photo.id)}>
        {strings.commonRemove}
      </button>
    </li>
  )
}

function PinCard({ title, description, children }) {
  return (
    <ManageLayout>
      <div className="manage-card pin-card">
        <span className="pin-card-icon" aria-hidden="true">
          <LockIcon />
        </span>
        <h2>{title}</h2>
        <p className="pin-description">{description}</p>
        {children}
      </div>
    </ManageLayout>
  )
}

function SetPinForm({ onSet }) {
  const strings = useStrings()
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(event) {
    event.preventDefault()
    if (!/^\d{4,}$/.test(pin)) {
      setError(strings.managePinTooShortError)
      return
    }
    if (pin !== confirmPin) {
      setError(strings.managePinMismatchError)
      return
    }
    onSet(pin)
  }

  return (
    <PinCard title={strings.managePinSetTitle} description={strings.managePinSetDescription}>
      <form onSubmit={handleSubmit} className="pin-form">
        <input
          type="password"
          inputMode="numeric"
          autoComplete="off"
          className="manage-input pin-input"
          value={pin}
          onChange={(event) => setPin(event.target.value)}
          placeholder={strings.managePinNewPlaceholder}
        />
        <input
          type="password"
          inputMode="numeric"
          autoComplete="off"
          className="manage-input pin-input"
          value={confirmPin}
          onChange={(event) => setConfirmPin(event.target.value)}
          placeholder={strings.managePinConfirmPlaceholder}
        />
        {error && <p className="manage-notice">{error}</p>}
        <button type="submit" className="pill-button pill-button-primary">
          {strings.managePinSetSubmit}
        </button>
      </form>
    </PinCard>
  )
}

function EnterPinForm({ onSubmit, onForgot, error }) {
  const strings = useStrings()
  const [pin, setPin] = useState('')

  function handleSubmit(event) {
    event.preventDefault()
    onSubmit(pin)
    setPin('')
  }

  return (
    <PinCard title={strings.managePinEnterTitle} description={strings.managePinEnterDescription}>
      <form onSubmit={handleSubmit} className="pin-form">
        <input
          type="password"
          inputMode="numeric"
          autoComplete="off"
          autoFocus
          className="manage-input pin-input"
          value={pin}
          onChange={(event) => setPin(event.target.value)}
          placeholder={strings.managePinPlaceholder}
        />
        {error && <p className="manage-notice">{error}</p>}
        <button type="submit" className="pill-button pill-button-primary">
          {strings.managePinUnlock}
        </button>
      </form>
      <p className="pin-hint">
        {strings.managePinForgotPrompt}{' '}
        <button type="button" className="pin-forgot-link" onClick={onForgot}>
          {strings.managePinForgotAction}
        </button>
        . {strings.managePinForgotNote}
      </p>
    </PinCard>
  )
}

function SearchResult({ result, added, onAdd }) {
  const strings = useStrings()
  return (
    <li className="manage-song">
      {result.thumbnailUrl && (
        <img src={result.thumbnailUrl} alt="" className="manage-thumb" />
      )}
      <span className="manage-caption">{result.title}</span>
      <button
        type="button"
        className="manage-row-button"
        onClick={() => onAdd(result)}
        disabled={added}
      >
        {added ? <CheckIcon /> : <PlusIcon />}
        <span>{added ? strings.manageAdded : strings.manageAdd}</span>
      </button>
    </li>
  )
}

function SelectedSong({ song, onRemove }) {
  const strings = useStrings()
  return (
    <li className="manage-song">
      {song.thumbnailUrl && (
        <img src={song.thumbnailUrl} alt="" className="manage-thumb" />
      )}
      <span className="manage-caption">{song.title}</span>
      <button type="button" className="manage-row-button" onClick={() => onRemove(song.videoId)}>
        {strings.commonRemove}
      </button>
    </li>
  )
}

function ManageMusic() {
  const strings = useStrings()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState(() => getSelectedSongs())

  async function handleSearch(event) {
    event.preventDefault()
    const term = query.trim()
    if (!term) return

    setSearching(true)
    setError('')
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(term)}`)
      if (!response.ok) {
        throw new Error(`Search failed with status ${response.status}`)
      }
      const data = await response.json()
      setResults(data.results ?? [])
    } catch (err) {
      console.error('Music search failed:', err)
      setError(strings.manageSearchError)
      setResults([])
    } finally {
      setSearching(false)
    }
  }

  function handleAdd(song) {
    setSelected(
      addSelectedSong({
        videoId: song.videoId,
        title: song.title,
        thumbnailUrl: song.thumbnailUrl,
      }),
    )
  }

  function handleRemove(videoId) {
    setSelected(removeSelectedSong(videoId))
  }

  const selectedIds = new Set(selected.map((song) => song.videoId))

  return (
    <SettingsCard
      icon={<MusicIcon />}
      tone="section"
      title={strings.musicTitle}
      className="section-music"
    >
      <div className="manage-subsection">
        <label htmlFor="manage-search-input" className="manage-label">
          {strings.manageSearchMusicTitle}
        </label>
        <form onSubmit={handleSearch} className="manage-search-form">
          <input
            id="manage-search-input"
            type="text"
            className="manage-input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={strings.manageSearchPlaceholder}
          />
          <button
            type="submit"
            className="pill-button pill-button-primary"
            disabled={searching}
          >
            <SearchIcon />
            <span>{searching ? strings.manageSearching : strings.manageSearch}</span>
          </button>
        </form>
        {error && <p className="manage-notice">{error}</p>}
        {results.length > 0 && (
          <ul className="manage-song-list">
            {results.map((result) => (
              <SearchResult
                key={result.videoId}
                result={result}
                added={selectedIds.has(result.videoId)}
                onAdd={handleAdd}
              />
            ))}
          </ul>
        )}
      </div>

      <div className="manage-subsection">
        <h3>{strings.manageSelectedSongsTitle}</h3>
        {selected.length === 0 ? (
          <p className="manage-muted">{strings.manageNoSongsSelected}</p>
        ) : (
          <ul className="manage-song-list">
            {selected.map((song) => (
              <SelectedSong key={song.videoId} song={song} onRemove={handleRemove} />
            ))}
          </ul>
        )}
      </div>
    </SettingsCard>
  )
}

function ManagePhotos() {
  const strings = useStrings()
  const [saved, setSaved] = useState([])
  const [pending, setPending] = useState([])
  const [loading, setLoading] = useState(true)
  const [rejectedCount, setRejectedCount] = useState(0)

  function refresh() {
    getAllPhotos()
      .then((photos) => setSaved(photos))
      .catch((error) => console.error('Failed to load saved photos:', error))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    refresh()
  }, [])

  async function handleFileSelect(event) {
    const files = Array.from(event.target.files ?? [])
    // The accept attribute is only a hint to the file picker; the actual
    // bytes are checked too, since what's accepted here must be exactly
    // what a backup can also save and restore (see imageSniff.js).
    const checked = await Promise.all(
      files.map(async (file) => ({ file, isImage: await isSupportedImageFile(file) })),
    )
    setPending(checked.filter((item) => item.isImage).map(({ file }) => ({ file, caption: '' })))
    setRejectedCount(checked.filter((item) => !item.isImage).length)
  }

  function updatePendingCaption(fileIndex, caption) {
    setPending((current) =>
      current.map((item, i) => (i === fileIndex ? { ...item, caption } : item)),
    )
  }

  async function handleSave() {
    for (const item of pending) {
      await addPhoto({ caption: item.caption.trim(), blob: item.file })
    }
    setPending([])
    setRejectedCount(0)
    refresh()
  }

  async function handleRemove(id) {
    await deletePhoto(id)
    refresh()
  }

  return (
    <SettingsCard
      icon={<PhotosIcon />}
      tone="section"
      title={strings.photosTitle}
      className="section-photos"
    >
      <div className="manage-subsection">
        {/* The real file input sits inside the label, visually hidden but
            not display:none, so it stays focusable and a tap on the label
            opens the picker (Chrome for Android included). */}
        <label className="pill-button pill-button-primary manage-file-pill">
          <input
            type="file"
            className="manage-visually-hidden"
            accept={ACCEPT_ATTRIBUTE}
            multiple
            onChange={handleFileSelect}
          />
          <PlusIcon />
          <span>{strings.manageAddPhotosTitle}</span>
        </label>
        {rejectedCount > 0 && (
          <p className="manage-notice">{strings.manageAddPhotosRejected(rejectedCount)}</p>
        )}
        {pending.length > 0 && (
          <>
            <ul className="manage-photo-list">
              {pending.map((item, i) => (
                <PendingPhoto
                  key={i}
                  file={item.file}
                  caption={item.caption}
                  onCaptionChange={(caption) => updatePendingCaption(i, caption)}
                />
              ))}
            </ul>
            <button type="button" className="pill-button pill-button-primary" onClick={handleSave}>
              <CheckIcon />
              <span>{strings.manageSavePhotos(pending.length)}</span>
            </button>
          </>
        )}
      </div>

      <div className="manage-subsection">
        <h3>{strings.manageSavedPhotosTitle}</h3>
        {loading ? (
          <p className="manage-muted">{strings.manageLoading}</p>
        ) : saved.length === 0 ? (
          <p className="manage-muted">{strings.manageNoSavedPhotos}</p>
        ) : (
          <ul className="manage-photo-list">
            {saved.map((photo) => (
              <SavedPhoto key={photo.id} photo={photo} onRemove={handleRemove} />
            ))}
          </ul>
        )}
      </div>
    </SettingsCard>
  )
}

function LanguageSelector() {
  const strings = useStrings()
  const { locale, setLocale, locales } = useLanguage()

  return (
    <SettingsCard icon={<GlobeIcon />} tone="music" title={strings.manageLanguageTitle}>
      <div className="manage-options">
        {locales.map((code) => (
          <OptionButton key={code} selected={code === locale} onClick={() => setLocale(code)}>
            {LANGUAGE_NAMES[code]}
          </OptionButton>
        ))}
      </div>
    </SettingsCard>
  )
}

function FontSizeSelector() {
  const strings = useStrings()
  const { fontSize, setFontSize, fontSizes } = useDisplaySettings()

  return (
    <SettingsCard icon={<TextSizeIcon />} tone="game" title={strings.manageFontSizeTitle}>
      <div className="manage-options">
        {fontSizes.map((size) => (
          <OptionButton key={size} selected={size === fontSize} onClick={() => setFontSize(size)}>
            {strings[FONT_SIZE_LABEL_KEYS[size]]}
          </OptionButton>
        ))}
      </div>
    </SettingsCard>
  )
}

function ThemeSelector() {
  const strings = useStrings()
  const { theme, setTheme, themes } = useDisplaySettings()

  return (
    <SettingsCard
      icon={<PaletteIcon />}
      tone="sage"
      title={strings.manageThemeTitle}
      className="manage-card-stacked"
    >
      <div className="manage-theme-options">
        {themes.map((id) => {
          const palette = THEMES[id]
          const selected = id === theme
          // Each option previews its own theme, so its colors are fixed
          // instead of following the current theme.
          return (
            <button
              key={id}
              type="button"
              className={selected ? 'manage-theme-option selected' : 'manage-theme-option'}
              style={{
                '--preview-bg': palette.bg,
                '--preview-border': palette.border,
                '--preview-text': palette.text,
                '--preview-accent': palette.accent,
              }}
              aria-pressed={selected}
              onClick={() => setTheme(id)}
            >
              <span className="manage-theme-swatches" aria-hidden="true">
                <span style={{ background: palette.card }} />
                <span style={{ background: palette.accentSoft }} />
                <span style={{ background: palette.accent }} />
              </span>
              <span className="manage-theme-label">
                {selected && <CheckIcon />}
                <span>{strings[THEME_LABEL_KEYS[id]]}</span>
              </span>
            </button>
          )
        })}
      </div>
    </SettingsCard>
  )
}

function BackupSection() {
  const strings = useStrings()
  const { locale } = useLanguage()
  const fileInputRef = useRef(null)
  const [photosSizeBytes, setPhotosSizeBytes] = useState(null)
  const [lastBackupAt, setLastBackupAt] = useState(() => getLastBackupAt())
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState(null) // { kind: 'success' | 'error', message }
  const [pendingFile, setPendingFile] = useState(null)

  useEffect(() => {
    estimatePhotosBackupSize()
      .then(setPhotosSizeBytes)
      .catch(() => setPhotosSizeBytes(null))
  }, [])

  async function handleSave(includePhotos) {
    setStatus(null)
    setBusy(true)
    try {
      const { blob, manifest } = await createBackupZip({ includePhotos })
      await saveOrShareBackup(blob, backupFileName(manifest))
      setLastBackupAt(getLastBackupAt())
    } catch (error) {
      console.error('Failed to create backup:', error)
      setStatus({ kind: 'error', message: strings.manageBackupSaveError })
    } finally {
      setBusy(false)
    }
  }

  function handleFileChosen(event) {
    const file = event.target.files?.[0] ?? null
    event.target.value = ''
    if (file) setPendingFile(file)
  }

  async function confirmRestore() {
    const file = pendingFile
    setPendingFile(null)
    if (!file) return

    setStatus(null)
    setBusy(true)
    try {
      await restoreBackup(file)
      setStatus({ kind: 'success', message: strings.manageBackupRestoreSuccess })
      setTimeout(() => window.location.reload(), 1500)
    } catch (error) {
      const message =
        error instanceof BackupError && error.code === 'unsupported-version'
          ? strings.manageBackupRestoreErrorFutureVersion
          : strings.manageBackupRestoreErrorInvalid
      setStatus({ kind: 'error', message })
      setBusy(false)
    }
  }

  return (
    <SettingsCard
      icon={<ShieldIcon />}
      tone="solid"
      title={strings.manageBackupTitle}
      className="section-backup manage-card-stacked manage-backup-card"
    >
      <p className="manage-backup-description">{strings.manageBackupDescription}</p>

      <div className="manage-backup-actions">
        <button
          type="button"
          className="pill-button pill-button-primary"
          disabled={busy}
          onClick={() => handleSave(false)}
        >
          <DownloadIcon />
          <span>{strings.manageBackupSaveSongs}</span>
        </button>

        <div className="manage-backup-with-photos">
          <button
            type="button"
            className="pill-button"
            disabled={busy}
            onClick={() => handleSave(true)}
          >
            <DownloadIcon />
            <span>{strings.manageBackupSaveWithPhotos}</span>
          </button>
          {photosSizeBytes !== null && (
            <p className="manage-backup-size">
              {strings.manageBackupEstimatedSize(formatBytes(photosSizeBytes))}
            </p>
          )}
        </div>

        <button
          type="button"
          className="pill-button"
          disabled={busy}
          onClick={() => fileInputRef.current?.click()}
        >
          <UploadIcon />
          <span>{strings.manageBackupRestore}</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".zip"
          className="manage-backup-file-input"
          onChange={handleFileChosen}
        />
      </div>

      <p className="manage-backup-last">
        {lastBackupAt
          ? strings.manageBackupLastBackup(lastBackupAt.toLocaleString(locale))
          : strings.manageBackupNoBackupYet}
      </p>

      {status && (
        <p
          className={
            status.kind === 'error'
              ? 'manage-notice manage-backup-error'
              : 'manage-notice manage-backup-success'
          }
        >
          {status.message}
        </p>
      )}

      {pendingFile && (
        <div className="manage-backup-confirm" role="alertdialog">
          <p>{strings.manageBackupConfirmRestore}</p>
          <div className="manage-backup-confirm-actions">
            <button
              type="button"
              className="pill-button pill-button-primary"
              onClick={confirmRestore}
            >
              <UploadIcon />
              <span>{strings.manageBackupConfirmRestoreButton}</span>
            </button>
            <button type="button" className="pill-button" onClick={() => setPendingFile(null)}>
              {strings.manageBackupCancel}
            </button>
          </div>
        </div>
      )}
    </SettingsCard>
  )
}

function ManageContent() {
  return (
    <ManageLayout>
      <div className="manage-cards">
        <LanguageSelector />
        <FontSizeSelector />
        <ThemeSelector />
        <ManagePhotos />
        <ManageMusic />
        <BackupSection />
      </div>
    </ManageLayout>
  )
}

function ManageScreen() {
  const strings = useStrings()
  const [storedPin, setStoredPinValue] = useState(() => getStoredPin())
  const [unlocked, setUnlocked] = useState(false)
  const [error, setError] = useState('')

  // Ask the browser to keep this origin's storage around rather than
  // evicting it under pressure. Feature-detected; no UI either way.
  useEffect(() => {
    requestPersistentStorage()
  }, [])

  if (!storedPin) {
    return (
      <SetPinForm
        onSet={(pin) => {
          setStoredPin(pin)
          setStoredPinValue(pin)
          setUnlocked(true)
        }}
      />
    )
  }

  if (!unlocked) {
    return (
      <EnterPinForm
        error={error}
        onSubmit={(pin) => {
          if (pin === storedPin) {
            setUnlocked(true)
            setError('')
          } else {
            setError(strings.managePinWrongError)
          }
        }}
        onForgot={() => {
          removeStoredPin()
          setStoredPinValue(null)
          setError('')
        }}
      />
    )
  }

  return <ManageContent />
}

export default ManageScreen
