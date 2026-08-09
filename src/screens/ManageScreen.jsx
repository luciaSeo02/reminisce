import { useEffect, useState } from 'react'
import { addPhoto, deletePhoto, getAllPhotos } from '../lib/photoStore.js'
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

function ManageScreen() {
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

export default ManageScreen
