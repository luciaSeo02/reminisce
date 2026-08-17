import { useEffect, useState } from 'react'
import { addPhoto, deletePhoto, getAllPhotos } from '../lib/photoStore.js'
import { getStoredPin, removeStoredPin, setStoredPin } from '../lib/managePin.js'
import {
  addSelectedSong,
  getSelectedSongs,
  removeSelectedSong,
} from '../lib/musicStore.js'
import { LANGUAGE_NAMES, useLanguage, useStrings } from '../i18n/LanguageContext.jsx'
import './ManageScreen.css'

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
      <button type="button" onClick={() => onRemove(photo.id)}>
        {strings.commonRemove}
      </button>
    </li>
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
    <div className="manage-screen manage-pin-screen">
      <h1>{strings.managePinSetTitle}</h1>
      <p>{strings.managePinSetDescription}</p>
      <form onSubmit={handleSubmit} className="pin-form">
        <input
          type="password"
          inputMode="numeric"
          autoComplete="off"
          value={pin}
          onChange={(event) => setPin(event.target.value)}
          placeholder={strings.managePinNewPlaceholder}
        />
        <input
          type="password"
          inputMode="numeric"
          autoComplete="off"
          value={confirmPin}
          onChange={(event) => setConfirmPin(event.target.value)}
          placeholder={strings.managePinConfirmPlaceholder}
        />
        {error && <p className="pin-error">{error}</p>}
        <button type="submit">{strings.managePinSetSubmit}</button>
      </form>
      <a href="/" className="back-link">
        {strings.commonBackToApp}
      </a>
    </div>
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
    <div className="manage-screen manage-pin-screen">
      <h1>{strings.managePinEnterTitle}</h1>
      <p>{strings.managePinEnterDescription}</p>
      <form onSubmit={handleSubmit} className="pin-form">
        <input
          type="password"
          inputMode="numeric"
          autoComplete="off"
          autoFocus
          value={pin}
          onChange={(event) => setPin(event.target.value)}
          placeholder={strings.managePinPlaceholder}
        />
        {error && <p className="pin-error">{error}</p>}
        <button type="submit">{strings.managePinUnlock}</button>
      </form>
      <p className="pin-hint">
        {strings.managePinForgotPrompt}{' '}
        <button type="button" className="pin-forgot-link" onClick={onForgot}>
          {strings.managePinForgotAction}
        </button>
        . {strings.managePinForgotNote}
      </p>
      <a href="/" className="back-link">
        {strings.commonBackToApp}
      </a>
    </div>
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
      <button type="button" onClick={() => onAdd(result)} disabled={added}>
        {added ? strings.manageAdded : strings.manageAdd}
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
      <button type="button" onClick={() => onRemove(song.videoId)}>
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
    <>
      <section>
        <h2>{strings.manageSearchMusicTitle}</h2>
        <form onSubmit={handleSearch} className="manage-search-form">
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={strings.manageSearchPlaceholder}
          />
          <button type="submit" disabled={searching}>
            {searching ? strings.manageSearching : strings.manageSearch}
          </button>
        </form>
        {error && <p className="pin-error">{error}</p>}
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
      </section>

      <section>
        <h2>{strings.manageSelectedSongsTitle}</h2>
        {selected.length === 0 ? (
          <p>{strings.manageNoSongsSelected}</p>
        ) : (
          <ul className="manage-song-list">
            {selected.map((song) => (
              <SelectedSong key={song.videoId} song={song} onRemove={handleRemove} />
            ))}
          </ul>
        )}
      </section>
    </>
  )
}

function ManagePhotos() {
  const strings = useStrings()
  const [saved, setSaved] = useState([])
  const [pending, setPending] = useState([])
  const [loading, setLoading] = useState(true)

  function refresh() {
    getAllPhotos()
      .then((photos) => setSaved(photos))
      .catch((error) => console.error('Failed to load saved photos:', error))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    refresh()
  }, [])

  function handleFileSelect(event) {
    const files = Array.from(event.target.files ?? [])
    setPending(files.map((file) => ({ file, caption: '' })))
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
    refresh()
  }

  async function handleRemove(id) {
    await deletePhoto(id)
    refresh()
  }

  return (
    <>
      <section>
        <h2>{strings.manageAddPhotosTitle}</h2>
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
        />
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
            <button type="button" onClick={handleSave}>
              {strings.manageSavePhotos(pending.length)}
            </button>
          </>
        )}
      </section>

      <section>
        <h2>{strings.manageSavedPhotosTitle}</h2>
        {loading ? (
          <p>{strings.manageLoading}</p>
        ) : saved.length === 0 ? (
          <p>{strings.manageNoSavedPhotos}</p>
        ) : (
          <ul className="manage-photo-list">
            {saved.map((photo) => (
              <SavedPhoto key={photo.id} photo={photo} onRemove={handleRemove} />
            ))}
          </ul>
        )}
      </section>
    </>
  )
}

function LanguageSelector() {
  const strings = useStrings()
  const { locale, setLocale, locales } = useLanguage()

  return (
    <section>
      <h2>{strings.manageLanguageTitle}</h2>
      <div className="manage-language-options">
        {locales.map((code) => (
          <button
            key={code}
            type="button"
            className={code === locale ? 'manage-language-option selected' : 'manage-language-option'}
            aria-pressed={code === locale}
            onClick={() => setLocale(code)}
          >
            {LANGUAGE_NAMES[code]}
          </button>
        ))}
      </div>
    </section>
  )
}

function ManageContent() {
  const strings = useStrings()
  return (
    <div className="manage-screen">
      <a href="/" className="back-link">
        {strings.commonBackToApp}
      </a>
      <h1>{strings.manageContentTitle}</h1>
      <p>{strings.manageContentDescription}</p>

      <LanguageSelector />
      <ManagePhotos />
      <ManageMusic />
    </div>
  )
}

function ManageScreen() {
  const strings = useStrings()
  const [storedPin, setStoredPinValue] = useState(() => getStoredPin())
  const [unlocked, setUnlocked] = useState(false)
  const [error, setError] = useState('')

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
