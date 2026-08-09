import { useEffect, useState } from 'react'
import { addPhoto, deletePhoto, getAllPhotos } from '../lib/photoStore.js'
import { getStoredPin, removeStoredPin, setStoredPin } from '../lib/managePin.js'
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
  const url = useObjectUrl(file)

  return (
    <li className="manage-photo">
      {url && <img src={url} alt="" className="manage-thumb" />}
      <input
        type="text"
        value={caption}
        onChange={(event) => onCaptionChange(event.target.value)}
        placeholder="Caption (e.g. A photo from your wedding)"
      />
    </li>
  )
}

function SavedPhoto({ photo, onRemove }) {
  const url = useObjectUrl(photo.blob)

  return (
    <li className="manage-photo">
      {url && <img src={url} alt="" className="manage-thumb" />}
      <span className="manage-caption">{photo.caption || '(no caption)'}</span>
      <button type="button" onClick={() => onRemove(photo.id)}>
        Remove
      </button>
    </li>
  )
}

function SetPinForm({ onSet }) {
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(event) {
    event.preventDefault()
    if (!/^\d{4,}$/.test(pin)) {
      setError('Use a numeric PIN of at least 4 digits.')
      return
    }
    if (pin !== confirmPin) {
      setError('PINs do not match.')
      return
    }
    onSet(pin)
  }

  return (
    <div className="manage-screen manage-pin-screen">
      <h1>Set a PIN</h1>
      <p>
        Choose a PIN to protect this page. You will need it to open Manage
        photos again.
      </p>
      <form onSubmit={handleSubmit} className="pin-form">
        <input
          type="password"
          inputMode="numeric"
          autoComplete="off"
          value={pin}
          onChange={(event) => setPin(event.target.value)}
          placeholder="New PIN"
        />
        <input
          type="password"
          inputMode="numeric"
          autoComplete="off"
          value={confirmPin}
          onChange={(event) => setConfirmPin(event.target.value)}
          placeholder="Confirm PIN"
        />
        {error && <p className="pin-error">{error}</p>}
        <button type="submit">Set PIN</button>
      </form>
    </div>
  )
}

function EnterPinForm({ onSubmit, onForgot, error }) {
  const [pin, setPin] = useState('')

  function handleSubmit(event) {
    event.preventDefault()
    onSubmit(pin)
    setPin('')
  }

  return (
    <div className="manage-screen manage-pin-screen">
      <h1>Enter PIN</h1>
      <p>This page is protected. Enter the PIN to continue.</p>
      <form onSubmit={handleSubmit} className="pin-form">
        <input
          type="password"
          inputMode="numeric"
          autoComplete="off"
          autoFocus
          value={pin}
          onChange={(event) => setPin(event.target.value)}
          placeholder="PIN"
        />
        {error && <p className="pin-error">{error}</p>}
        <button type="submit">Unlock</button>
      </form>
      <p className="pin-hint">
        Forgot the PIN?{' '}
        <button type="button" className="pin-forgot-link" onClick={onForgot}>
          Reset it
        </button>
        . Your saved photos will not be affected.
      </p>
    </div>
  )
}

function ManagePhotos() {
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
    <div className="manage-screen">
      <h1>Manage photos</h1>
      <p>
        This page is for the family caregiver. It is not linked from the main
        app and does not appear on the home screen.
      </p>

      <section>
        <h2>Add photos</h2>
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
              Save {pending.length} photo{pending.length === 1 ? '' : 's'}
            </button>
          </>
        )}
      </section>

      <section>
        <h2>Saved photos</h2>
        {loading ? (
          <p>Loading...</p>
        ) : saved.length === 0 ? (
          <p>
            No photos added yet. The slideshow shows the example photos until
            some are added here.
          </p>
        ) : (
          <ul className="manage-photo-list">
            {saved.map((photo) => (
              <SavedPhoto key={photo.id} photo={photo} onRemove={handleRemove} />
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function ManageScreen() {
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
            setError('Incorrect PIN.')
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

  return <ManagePhotos />
}

export default ManageScreen
