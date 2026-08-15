import { useEffect, useRef, useState } from 'react'
import { getSelectedSongs } from '../lib/musicStore.js'
import { loadYouTubeIframeApi } from '../lib/youtubeIframeApi.js'
import './MusicScreen.css'

function MusicScreen() {
  const [songs] = useState(() => getSelectedSongs())
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [playerReady, setPlayerReady] = useState(false)
  const containerRef = useRef(null)
  const playerRef = useRef(null)

  useEffect(() => {
    if (songs.length === 0) return
    let cancelled = false

    loadYouTubeIframeApi()
      .then((YT) => {
        if (cancelled || !containerRef.current) return

        playerRef.current = new YT.Player(containerRef.current, {
          width: '100%',
          height: '100%',
          playerVars: {
            autoplay: 1,
            controls: 0,
            rel: 0,
            modestbranding: 1,
            playsinline: 1,
            disablekb: 1,
          },
          events: {
            onReady: () => setPlayerReady(true),
            onStateChange: (event) => {
              if (event.data === YT.PlayerState.PLAYING) setPaused(false)
              if (event.data === YT.PlayerState.PAUSED) setPaused(true)
              if (event.data === YT.PlayerState.ENDED) {
                if (songs.length <= 1) {
                  event.target.seekTo(0)
                  event.target.playVideo()
                  return
                }
                setIndex((current) => (current + 1) % songs.length)
              }
            },
          },
        })
      })
      .catch((error) => console.error('Failed to load YouTube player:', error))

    return () => {
      cancelled = true
      playerRef.current?.destroy?.()
      playerRef.current = null
    }
  }, [songs])

  useEffect(() => {
    if (!playerReady || !playerRef.current) return
    playerRef.current.loadVideoById(songs[index].videoId)
  }, [index, playerReady, songs])

  function handleTap() {
    const player = playerRef.current
    if (!player) return
    if (paused) {
      player.playVideo()
    } else {
      player.pauseVideo()
    }
  }

  if (songs.length === 0) {
    return (
      <div className="placeholder-screen music-screen">
        <h1>Music</h1>
        <p>No music has been added yet. Ask a family member to add some songs.</p>
      </div>
    )
  }

  return (
    <div className="placeholder-screen music-screen">
      <h1>Music</h1>
      <button
        type="button"
        className="music-player-tap"
        onClick={handleTap}
        aria-label={paused ? 'Resume music' : 'Pause music'}
      >
        <div className="music-player">
          <div ref={containerRef} />
        </div>
        <p className="music-title">{songs[index].title}</p>
        <p className="music-hint">{paused ? 'Paused. Tap to continue.' : 'Tap to pause.'}</p>
      </button>
    </div>
  )
}

export default MusicScreen
