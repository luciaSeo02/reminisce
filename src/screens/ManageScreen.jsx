import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import {
  addPhoto,
  deletePhoto,
  getAllPhotos,
  savePhotoOrder,
  updatePhotoCaption,
} from '../lib/photoStore.js'
import { MAX_CAPTION_LENGTH, normalizeCaption } from '../lib/photoCaption.js'
import { getStoredPin, removeStoredPin, setStoredPin } from '../lib/managePin.js'
import { extendUnlock, isUnlocked, lock, unlock } from '../lib/manageUnlock.js'
import {
  PLAY_ORDERS,
  addSelectedSong,
  getSelectedSongs,
  getStoredPlayOrder,
  removeSelectedSong,
  saveSongOrder,
  setStoredPlayOrder,
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
import { decodeTitle } from '../lib/decodeTitle.js'
import { LANGUAGE_NAMES, useLanguage, useStrings } from '../i18n/LanguageContext.jsx'
import { THEMES, useDisplaySettings } from '../settings/DisplaySettingsContext.jsx'
import ScreenHeader from './shared/ScreenHeader.jsx'
import SortableList from './shared/SortableList.jsx'
import SongPreview from './SongPreview.jsx'
import {
  CheckIcon,
  DownloadIcon,
  GlobeIcon,
  ListeningIcon,
  LockIcon,
  MusicIcon,
  PaletteIcon,
  PauseIcon,
  PhotosIcon,
  PlayIcon,
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

const PLAY_ORDER_LABEL_KEYS = {
  'in-order': 'managePlayOrderInOrder',
  shuffle: 'managePlayOrderShuffle',
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

// The example caption sits in a visible line above the pending photos
// instead of in the placeholder, where it did not fit on a phone.
const CAPTION_HINT_ID = 'manage-caption-hint'

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
        aria-describedby={CAPTION_HINT_ID}
      />
    </li>
  )
}

// How long the small "Saved" note stays after a caption is saved.
const CAPTION_SAVED_NOTE_MS = 3000

// Row content inside SortableList, which supplies the <li> and the handle.
// The caption is saved when the field loses focus or on Enter. Enter never
// adds a line break, since the caption is shown as one line.
function SavedPhoto({ photo, position, onCaptionSaved, onRemove }) {
  const strings = useStrings()
  const url = useObjectUrl(photo.blob)
  const [text, setText] = useState(photo.caption ?? '')
  const [status, setStatus] = useState('')
  // The caption as last stored (or being stored), so Enter followed by the
  // blur that comes after it does not write the same text twice.
  const storedRef = useRef(photo.caption ?? '')
  const fieldRef = useRef(null)
  const fieldId = `manage-photo-caption-${photo.id}`

  // The field grows with its text, so a long caption is never cut off or
  // hidden behind a scroll bar inside the field.
  useLayoutEffect(() => {
    const field = fieldRef.current
    if (!field) return
    function fit() {
      field.style.height = 'auto'
      field.style.height = `${field.scrollHeight}px`
    }
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [text])

  useEffect(() => {
    if (status !== 'saved') return
    const timer = setTimeout(() => setStatus(''), CAPTION_SAVED_NOTE_MS)
    return () => clearTimeout(timer)
  }, [status])

  async function save() {
    const normalized = normalizeCaption(text)
    if (normalized === storedRef.current) {
      setText(normalized)
      return
    }
    const previous = storedRef.current
    storedRef.current = normalized
    try {
      const stored = await updatePhotoCaption(photo.id, text)
      storedRef.current = stored
      setText(stored)
      setStatus('saved')
      onCaptionSaved(photo.id, stored)
    } catch (error) {
      // The typed text stays in the field, so nothing is lost and the next
      // blur or Enter tries again.
      console.error('Saving the caption failed:', error)
      storedRef.current = previous
      setStatus('error')
    }
  }

  function handleKeyDown(event) {
    if (event.key !== 'Enter') return
    // Enter while an input method (Japanese, Chinese, some Android
    // keyboards) is composing a word confirms the word, not the caption.
    if (event.nativeEvent.isComposing || event.keyCode === 229) return
    event.preventDefault()
    save()
  }

  return (
    <>
      <span className="manage-song-position" aria-hidden="true">
        {position}
      </span>
      {url ? (
        <img src={url} alt="" className="manage-thumb" />
      ) : (
        <span className="manage-thumb" aria-hidden="true" />
      )}
      <div className="manage-photo-field">
        <label htmlFor={fieldId} className="manage-photo-label">
          {strings.managePhotoCaptionLabel}
        </label>
        <textarea
          ref={fieldRef}
          id={fieldId}
          className="manage-input manage-photo-caption"
          rows={2}
          value={text}
          maxLength={MAX_CAPTION_LENGTH}
          enterKeyHint="done"
          placeholder={strings.manageCaptionPlaceholder}
          onChange={(event) => {
            setText(event.target.value)
            if (status === 'error') setStatus('')
          }}
          onKeyDown={handleKeyDown}
          onBlur={save}
        />
        <p className="manage-photo-status" aria-live="polite">
          {status === 'saved' && (
            <span className="manage-photo-saved">
              <CheckIcon />
              {strings.managePhotoCaptionSaved}
            </span>
          )}
          {status === 'error' && (
            <span className="manage-notice">{strings.managePhotoCaptionSaveError}</span>
          )}
        </p>
      </div>
      <button type="button" className="manage-row-button" onClick={() => onRemove(photo.id)}>
        {strings.commonRemove}
      </button>
    </>
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
  const [confirmingReset, setConfirmingReset] = useState(false)
  const forgotLinkRef = useRef(null)
  const returnFocusRef = useRef(false)

  useEffect(() => {
    if (!confirmingReset && returnFocusRef.current) {
      returnFocusRef.current = false
      forgotLinkRef.current?.focus()
    }
  }, [confirmingReset])

  function handleSubmit(event) {
    event.preventDefault()
    onSubmit(pin)
    setPin('')
  }

  function cancelReset() {
    returnFocusRef.current = true
    setConfirmingReset(false)
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
      {confirmingReset ? (
        <div
          className="manage-backup-confirm pin-reset-confirm"
          role="alertdialog"
          aria-labelledby="pin-reset-message"
        >
          <p id="pin-reset-message">{strings.managePinResetConfirm}</p>
          <div className="manage-backup-confirm-actions">
            {/* Focus starts on Cancel, the safe choice, not on the reset. */}
            <button
              type="button"
              className="pill-button pill-button-primary"
              autoFocus
              onClick={cancelReset}
            >
              {strings.managePinResetCancel}
            </button>
            <button type="button" className="pill-button" onClick={onForgot}>
              {strings.managePinResetConfirmButton}
            </button>
          </div>
        </div>
      ) : (
        <p className="pin-hint">
          {strings.managePinForgotPrompt}{' '}
          <button
            ref={forgotLinkRef}
            type="button"
            className="pin-forgot-link"
            onClick={() => setConfirmingReset(true)}
          >
            {strings.managePinForgotAction}
          </button>
          . {strings.managePinForgotNote}
        </p>
      )}
    </PinCard>
  )
}

const PREVIEW_ERROR_KEYS = {
  unavailable: 'managePreviewUnavailable',
  failed: 'managePreviewFailed',
}

// Tapping Listen while a row higher up is playing removes that row's
// player, which would move the tapped row up and out from under the
// finger. Scrolling by the same amount keeps the button where it was. If
// the page cannot scroll that far, the button is at least brought back on
// screen, without animation.
function keepInPlace(element, topBefore) {
  const shift = element.getBoundingClientRect().top - topBefore
  if (shift !== 0) window.scrollBy({ top: shift, behavior: 'instant' })
  const rect = element.getBoundingClientRect()
  if (rect.top < 0 || rect.bottom > window.innerHeight) {
    element.scrollIntoView({ block: 'nearest', behavior: 'instant' })
  }
}

// `playing` and `previewError` are only ever set on one row at a time;
// ManageMusic owns that state. A row with an error shows Listen again, so
// tapping it retries.
function SearchResult({
  result,
  added,
  playing,
  previewError,
  onListen,
  onStop,
  onAdd,
  onPreviewEnded,
  onPreviewError,
}) {
  const strings = useStrings()
  const listenButtonRef = useRef(null)
  const topBeforeListenRef = useRef(null)

  function handleListen() {
    topBeforeListenRef.current = listenButtonRef.current.getBoundingClientRect().top
    onListen(result.videoId)
  }

  useLayoutEffect(() => {
    const topBefore = topBeforeListenRef.current
    topBeforeListenRef.current = null
    if (playing && topBefore != null && listenButtonRef.current) {
      keepInPlace(listenButtonRef.current, topBefore)
    }
  }, [playing])

  return (
    <li className={playing ? 'manage-song manage-song-playing' : 'manage-song'}>
      {result.thumbnailUrl && (
        <img src={result.thumbnailUrl} alt="" className="manage-thumb" />
      )}
      <span className="manage-caption">
        {decodeTitle(result.title)}
        {playing && (
          <span className="manage-preview-listening" aria-hidden="true">
            <ListeningIcon />
            {strings.managePreviewListening}
          </span>
        )}
      </span>
      <div className="manage-song-actions">
        <button
          ref={listenButtonRef}
          type="button"
          className="manage-row-button"
          onClick={playing ? onStop : handleListen}
        >
          {playing ? <PauseIcon /> : <PlayIcon />}
          <span>{playing ? strings.managePreviewStop : strings.managePreviewListen}</span>
        </button>
        <button
          type="button"
          className="manage-row-button"
          onClick={() => onAdd(result)}
          disabled={added}
        >
          {added ? <CheckIcon /> : <PlusIcon />}
          <span>{added ? strings.manageAdded : strings.manageAdd}</span>
        </button>
      </div>
      {playing && (
        <SongPreview
          videoId={result.videoId}
          onEnded={onPreviewEnded}
          onError={onPreviewError}
        />
      )}
      {previewError && (
        <p className="manage-notice manage-preview-message">
          {strings[PREVIEW_ERROR_KEYS[previewError]]}
        </p>
      )}
    </li>
  )
}

// Row content inside SortableList, which supplies the <li> and the handle.
// The position badge is visual only: screen readers already hear the
// position from the list itself and from the move announcements. In
// shuffle mode there is no badge, since the list order is not the play order.
function SelectedSong({ song, position, onRemove }) {
  const strings = useStrings()
  return (
    <>
      {position != null && (
        <span className="manage-song-position" aria-hidden="true">
          {position}
        </span>
      )}
      {song.thumbnailUrl && (
        <img src={song.thumbnailUrl} alt="" className="manage-thumb" />
      )}
      <span className="manage-caption">{decodeTitle(song.title)}</span>
      <button type="button" className="manage-row-button" onClick={() => onRemove(song.videoId)}>
        {strings.commonRemove}
      </button>
    </>
  )
}

function ManageMusic() {
  const strings = useStrings()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState(() => getSelectedSongs())
  const [reorderError, setReorderError] = useState('')
  const [playOrder, setPlayOrder] = useState(() => getStoredPlayOrder())
  // The one search result being previewed: { videoId, error }. While error
  // is null that row is playing; otherwise it shows the error message.
  // Never stored.
  const [preview, setPreview] = useState(null)
  const previewing = preview !== null && preview.error === null

  // A preview never plays on in the background: hiding the tab, turning
  // off the tablet screen or leaving the page stops it.
  useEffect(() => {
    if (!previewing) return
    function stop() {
      setPreview(null)
    }
    function handleVisibilityChange() {
      if (document.visibilityState === 'hidden') stop()
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('pagehide', stop)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('pagehide', stop)
    }
  }, [previewing])

  function handleQueryChange(event) {
    const value = event.target.value
    setQuery(value)
    if (value.trim() === '') setPreview(null)
  }

  async function handleSearch(event) {
    event.preventDefault()
    const term = query.trim()
    if (!term) return

    setPreview(null)
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
    setPreview(null)
    setSelected(
      addSelectedSong({
        videoId: song.videoId,
        title: song.title,
        thumbnailUrl: song.thumbnailUrl,
      }),
    )
  }

  function handleRemove(videoId) {
    setReorderError('')
    setSelected(removeSelectedSong(videoId))
  }

  // Called once, on drop. The on-screen list only changes after the write
  // succeeds, so a failed save leaves both storage and the screen in the
  // old order.
  function handleReorder(newOrder) {
    try {
      setSelected(saveSongOrder(newOrder))
      setReorderError('')
      return true
    } catch (err) {
      console.error('Saving the song order failed:', err)
      setReorderError(strings.manageReorderSaveError)
      return false
    }
  }

  // The screen only changes once the write has succeeded, so it never
  // shows a mode that Music would not use.
  function handlePlayOrder(value) {
    try {
      setStoredPlayOrder(value)
      setPlayOrder(value)
    } catch (err) {
      console.error('Saving the play order failed:', err)
    }
  }

  const songTitle = (song) => decodeTitle(song.title)
  const reorderAnnouncements = {
    pickedUp: (song, position, total) =>
      strings.manageReorderPickedUp(songTitle(song), position, total),
    moved: (song, position, total) => strings.manageReorderMoved(songTitle(song), position, total),
    dropped: (song, position, total) =>
      strings.manageReorderDropped(songTitle(song), position, total),
    cancelled: (song, position) => strings.manageReorderCancelled(songTitle(song), position),
  }

  const selectedIds = new Set(selected.map((song) => song.videoId))

  // One live region for the whole result list: rows mount and unmount
  // their player and message, and a region that appears together with its
  // text is often not read out.
  const previewResult = preview && results.find((result) => result.videoId === preview.videoId)
  let previewAnnouncement = ''
  if (previewResult && preview.error) {
    previewAnnouncement = strings[PREVIEW_ERROR_KEYS[preview.error]]
  } else if (previewResult) {
    previewAnnouncement = strings.managePreviewNowListening(songTitle(previewResult))
  }

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
            onChange={handleQueryChange}
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
            {results.map((result) => {
              const isPreviewRow = preview?.videoId === result.videoId
              return (
                <SearchResult
                  key={result.videoId}
                  result={result}
                  added={selectedIds.has(result.videoId)}
                  playing={isPreviewRow && preview.error === null}
                  previewError={isPreviewRow ? preview.error : null}
                  onListen={(videoId) => setPreview({ videoId, error: null })}
                  onStop={() => setPreview(null)}
                  onAdd={handleAdd}
                  onPreviewEnded={() => setPreview(null)}
                  onPreviewError={(kind) =>
                    setPreview({ videoId: result.videoId, error: kind })
                  }
                />
              )
            })}
          </ul>
        )}
        <p className="manage-visually-hidden" role="status">
          {previewAnnouncement}
        </p>
      </div>

      <div className="manage-subsection">
        <h3>{strings.manageSelectedSongsTitle}</h3>
        {selected.length === 0 ? (
          <p className="manage-muted">{strings.manageNoSongsSelected}</p>
        ) : (
          <>
            <div
              className="manage-play-order"
              role="group"
              aria-labelledby="manage-play-order-label"
            >
              <span id="manage-play-order-label" className="manage-label">
                {strings.managePlayOrderLabel}
              </span>
              <div className="manage-options">
                {PLAY_ORDERS.map((value) => (
                  <OptionButton
                    key={value}
                    selected={value === playOrder}
                    onClick={() => handlePlayOrder(value)}
                  >
                    {strings[PLAY_ORDER_LABEL_KEYS[value]]}
                  </OptionButton>
                ))}
              </div>
            </div>
            {playOrder === 'shuffle' ? (
              <>
                <p className="manage-muted">{strings.manageShuffleNote}</p>
                <ul className="manage-song-list">
                  {selected.map((song) => (
                    <li key={song.videoId} className="manage-song">
                      <SelectedSong song={song} onRemove={handleRemove} />
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <>
                <p className="manage-muted manage-reorder-hint">{strings.manageReorderHint}</p>
                {reorderError && (
                  <p className="manage-notice" role="status">
                    {reorderError}
                  </p>
                )}
                <SortableList
                  items={selected}
                  getKey={(song) => song.videoId}
                  renderItem={(song, index) => (
                    <SelectedSong song={song} position={index + 1} onRemove={handleRemove} />
                  )}
                  getHandleLabel={(song) => strings.manageReorderHandleLabel(songTitle(song))}
                  instructions={strings.manageReorderInstructions}
                  announcements={reorderAnnouncements}
                  onReorder={handleReorder}
                  className="manage-song-list manage-sortable-songs"
                  itemClassName="manage-song"
                />
              </>
            )}
          </>
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
  const [reorderError, setReorderError] = useState('')

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
    setReorderError('')
    await deletePhoto(id)
    refresh()
  }

  // Called once, on drop. The list shows the new order right away and is
  // saved in one transaction. If that fails, nothing was written, and the
  // list is read back from storage, so it shows the order that is kept.
  function handleReorder(newOrder) {
    setSaved(newOrder)
    setReorderError('')
    savePhotoOrder(newOrder.map((photo) => photo.id)).catch((error) => {
      console.error('Saving the photo order failed:', error)
      setReorderError(strings.manageReorderSaveError)
      refresh()
    })
  }

  function handleCaptionSaved(id, caption) {
    setSaved((current) => current.map((photo) => (photo.id === id ? { ...photo, caption } : photo)))
  }

  // Captions can be up to 2000 characters, too long to read out on every
  // move, so screen readers hear the start of it, or the photo's number.
  const photoName = (photo) => {
    const caption = photo.caption?.trim()
    if (caption) return caption.length > 60 ? `${caption.slice(0, 60)}...` : caption
    return strings.managePhotoName(saved.indexOf(photo) + 1)
  }
  const reorderAnnouncements = {
    pickedUp: (photo, position, total) =>
      strings.manageReorderPickedUp(photoName(photo), position, total),
    moved: (photo, position, total) =>
      strings.manageReorderMoved(photoName(photo), position, total),
    dropped: (photo, position, total) =>
      strings.manageReorderDropped(photoName(photo), position, total),
    cancelled: (photo, position) => strings.manageReorderCancelled(photoName(photo), position),
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
            <p id={CAPTION_HINT_ID} className="manage-muted manage-caption-hint">
              {strings.manageCaptionHint}
            </p>
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
        <div className="manage-photos-head">
          <h3>{strings.manageSavedPhotosTitle}</h3>
          {saved.length > 0 && (
            <span className="manage-muted">{strings.managePhotoCount(saved.length)}</span>
          )}
        </div>
        {loading ? (
          <p className="manage-muted">{strings.manageLoading}</p>
        ) : saved.length === 0 ? (
          <p className="manage-muted">{strings.manageNoSavedPhotos}</p>
        ) : (
          <>
            <p className="manage-muted manage-reorder-hint">{strings.managePhotosReorderHint}</p>
            {reorderError && (
              <p className="manage-notice" role="status">
                {reorderError}
              </p>
            )}
            <SortableList
              items={saved}
              getKey={(photo) => photo.id}
              renderItem={(photo, index) => (
                <SavedPhoto
                  photo={photo}
                  position={index + 1}
                  onCaptionSaved={handleCaptionSaved}
                  onRemove={handleRemove}
                />
              )}
              getHandleLabel={(photo) => strings.manageReorderHandleLabel(photoName(photo))}
              instructions={strings.managePhotosReorderInstructions}
              announcements={reorderAnnouncements}
              onReorder={handleReorder}
              className="manage-photo-list manage-sortable-photos"
              itemClassName="manage-photo"
            />
            <p className="manage-muted manage-photos-note">{strings.managePhotosCaptionNote}</p>
          </>
        )}
      </div>
    </SettingsCard>
  )
}

function LanguageSelector() {
  const strings = useStrings()
  const { locale, setLocale, locales } = useLanguage()

  return (
    <SettingsCard
      icon={<GlobeIcon />}
      tone="music"
      title={strings.manageLanguageTitle}
      className="manage-card-options"
    >
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
    <SettingsCard
      icon={<TextSizeIcon />}
      tone="game"
      title={strings.manageFontSizeTitle}
      className="manage-card-options"
    >
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
              {strings.manageBackupEstimatedSize(formatBytes(photosSizeBytes, locale))}
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

function ManageContent({ onLock }) {
  const strings = useStrings()
  return (
    <ManageLayout>
      <div className="manage-toolbar">
        <button type="button" className="pill-button" onClick={onLock}>
          <LockIcon />
          <span>{strings.manageLockNow}</span>
        </button>
      </div>
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

// Activity writes to sessionStorage at most this often. The re-check timer
// runs at the same pace, so an expired page locks within that much time.
const ACTIVITY_THROTTLE_MS = 15 * 1000
const RECHECK_INTERVAL_MS = 15 * 1000
const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'input']

// While unlocked, keeps the session unlock alive on activity and locks the
// page once it expires. visibilitychange and pageshow cover a tab coming
// back to the front and a page restored from the back/forward cache, where
// the interval may not have run for a long time.
function useSessionUnlock(unlocked, onExpire) {
  useEffect(() => {
    if (!unlocked) return

    let lastExtendAt = 0

    function recheck() {
      if (!isUnlocked()) onExpire()
    }

    function handleActivity() {
      const now = Date.now()
      if (now - lastExtendAt < ACTIVITY_THROTTLE_MS) return
      lastExtendAt = now
      if (!extendUnlock()) onExpire()
    }

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') recheck()
    }

    // Capture phase, so a handler that stops propagation can't hide activity.
    for (const type of ACTIVITY_EVENTS) {
      document.addEventListener(type, handleActivity, true)
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('pageshow', recheck)
    const timer = setInterval(recheck, RECHECK_INTERVAL_MS)

    return () => {
      for (const type of ACTIVITY_EVENTS) {
        document.removeEventListener(type, handleActivity, true)
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('pageshow', recheck)
      clearInterval(timer)
    }
  }, [unlocked, onExpire])
}

function ManageScreen() {
  const strings = useStrings()
  const [storedPin, setStoredPinValue] = useState(() => getStoredPin())
  const [unlocked, setUnlocked] = useState(() => Boolean(getStoredPin()) && isUnlocked())
  const [error, setError] = useState('')

  // Ask the browser to keep this origin's storage around rather than
  // evicting it under pressure. Feature-detected; no UI either way.
  useEffect(() => {
    requestPersistentStorage()
  }, [])

  const handleExpire = useCallback(() => setUnlocked(false), [])
  useSessionUnlock(unlocked, handleExpire)

  if (!storedPin) {
    return (
      <SetPinForm
        onSet={(pin) => {
          setStoredPin(pin)
          setStoredPinValue(pin)
          unlock()
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
            unlock()
            setUnlocked(true)
            setError('')
          } else {
            setError(strings.managePinWrongError)
          }
        }}
        onForgot={() => {
          removeStoredPin()
          lock()
          setStoredPinValue(null)
          setError('')
        }}
      />
    )
  }

  return (
    <ManageContent
      onLock={() => {
        lock()
        setUnlocked(false)
      }}
    />
  )
}

export default ManageScreen
