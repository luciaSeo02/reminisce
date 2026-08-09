import { useEffect, useState } from 'react'
import './PhotosScreen.css'

const MANIFEST_URL = '/photos/manifest.json'
const SLIDE_INTERVAL_MS = 6000

function PhotosScreen() {
  const [photos, setPhotos] = useState([])
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    let cancelled = false

    fetch(MANIFEST_URL)
      .then((response) => response.json())
      .then((data) => {
        if (!cancelled && Array.isArray(data)) setPhotos(data)
      })
      .catch((error) => console.error('Failed to load photo manifest:', error))

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (paused || photos.length === 0) return

    const timer = setInterval(() => {
      setIndex((current) => (current + 1) % photos.length)
    }, SLIDE_INTERVAL_MS)

    return () => clearInterval(timer)
  }, [paused, photos])

  if (photos.length === 0) {
    return (
      <div className="placeholder-screen photos-screen">
        <h1>Photos</h1>
      </div>
    )
  }

  const photo = photos[index % photos.length]

  return (
    <div className="placeholder-screen photos-screen">
      <h1>Photos</h1>
      <button
        type="button"
        className="slideshow"
        onClick={() => setPaused((current) => !current)}
        aria-label={paused ? 'Resume slideshow' : 'Pause slideshow'}
      >
        <img
          key={photo.src}
          src={photo.src}
          alt={photo.caption}
          className="slideshow-photo"
        />
        <p className="slideshow-caption">{photo.caption}</p>
        <p className="slideshow-hint">
          {paused ? 'Paused. Tap to continue.' : 'Tap to pause.'}
        </p>
      </button>
    </div>
  )
}

export default PhotosScreen
