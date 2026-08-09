import { useEffect, useState } from 'react'
import './PhotosScreen.css'

const SLIDE_INTERVAL_MS = 6000

const EXAMPLE_PHOTOS = [
  { src: '/photos/photo-1.svg', caption: 'A quiet afternoon at home' },
  { src: '/photos/photo-2.svg', caption: 'A walk in the park' },
  { src: '/photos/photo-3.svg', caption: 'A sunny day by the water' },
  { src: '/photos/photo-4.svg', caption: 'A family gathering' },
]

function PhotosScreen() {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (paused) return

    const timer = setInterval(() => {
      setIndex((current) => (current + 1) % EXAMPLE_PHOTOS.length)
    }, SLIDE_INTERVAL_MS)

    return () => clearInterval(timer)
  }, [paused])

  const photo = EXAMPLE_PHOTOS[index]

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
