import { useEffect, useState } from 'react'
import { getAllPhotos } from '../lib/photoStore.js'
import { useStrings } from '../i18n/LanguageContext.jsx'
import './PhotosScreen.css'

const MANIFEST_URL = '/photos/manifest.json'
const SLIDE_INTERVAL_MS = 6000

function PhotosScreen() {
  const strings = useStrings()
  const [photos, setPhotos] = useState([])
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    let cancelled = false
    const objectUrls = []

    getAllPhotos()
      .then((saved) => {
        if (cancelled) return

        if (saved.length > 0) {
          const withUrls = saved.map((photo) => {
            const url = URL.createObjectURL(photo.blob)
            objectUrls.push(url)
            return { src: url, caption: photo.caption }
          })
          setPhotos(withUrls)
          return
        }

        return fetch(MANIFEST_URL)
          .then((response) => response.json())
          .then((data) => {
            if (!cancelled && Array.isArray(data)) setPhotos(data)
          })
      })
      .catch((error) => console.error('Failed to load photos:', error))

    return () => {
      cancelled = true
      objectUrls.forEach((url) => URL.revokeObjectURL(url))
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
        <h1>{strings.photosTitle}</h1>
      </div>
    )
  }

  const photo = photos[index % photos.length]

  return (
    <div className="placeholder-screen photos-screen">
      <h1>{strings.photosTitle}</h1>
      <button
        type="button"
        className="slideshow"
        onClick={() => setPaused((current) => !current)}
        aria-label={paused ? strings.photosResumeLabel : strings.photosPauseLabel}
      >
        <img
          key={photo.src}
          src={photo.src}
          alt={photo.caption}
          className="slideshow-photo"
        />
        <p className="slideshow-caption">{photo.caption}</p>
        <p className="slideshow-hint">
          {paused ? strings.commonTapHintPaused : strings.commonTapHintPlaying}
        </p>
      </button>
    </div>
  )
}

export default PhotosScreen
