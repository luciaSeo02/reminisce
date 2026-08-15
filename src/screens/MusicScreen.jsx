import { useEffect, useRef, useState } from 'react'
import { getSelectedSongs } from '../lib/musicStore.js'
import { loadYouTubeIframeApi } from '../lib/youtubeIframeApi.js'
import './MusicScreen.css'

function MusicScreen() {
  const [songs] = useState(() => getSelectedSongs())
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const containerRef = useRef(null)
  const playerRef = useRef(null)
  const indexRef = useRef(0)

  useEffect(() => {
    if (songs.length === 0) return
    let cancelled = false

    // Loads a song and advances the on-screen title in the same call, so
    // there is no gap between the player switching video and the title
    // updating to match.
    function playAt(nextIndex) {
      indexRef.current = nextIndex
      setIndex(nextIndex)
      playerRef.current?.loadVideoById(songs[nextIndex].videoId)
    }

    loadYouTubeIframeApi()
      .then((YT) => {
        if (cancelled || !containerRef.current) return

        playerRef.current = new YT.Player(containerRef.current, {
          width: '100%',
          height: '100%',
          playerVars: {
            // Deliberately no `autoplay` playerVar: it also enables
            // YouTube's own "autoplay next" end-screen behavior, which can
            // start an unrelated suggested video the instant a song ends,
            // racing our ENDED handler below. Playback is started
            // explicitly via loadVideoById instead, which always plays.
            controls: 0,
            rel: 0,
            modestbranding: 1,
            playsinline: 1,
            disablekb: 1,
          },
          events: {
            onReady: (event) => {
              event.target.loadVideoById(songs[0].videoId)
            },
            onStateChange: (event) => {
              if (event.data === YT.PlayerState.PLAYING) {
                const expectedId = songs[indexRef.current].videoId
                const actualId = event.target.getVideoData()?.video_id
                if (actualId && actualId !== expectedId) {
                  // Belt-and-braces: YouTube's own player can occasionally
                  // start an unrelated "up next" suggested video around
                  // the end of a song, independently of the ENDED event
                  // below. If anything other than the expected song ever
                  // starts playing, force the correct one back on
                  // immediately instead of letting it continue.
                  event.target.loadVideoById(expectedId)
                  return
                }
                setPaused(false)
                return
              }
              if (event.data === YT.PlayerState.PAUSED) setPaused(true)
              if (event.data === YT.PlayerState.ENDED) {
                // Stop immediately, before doing anything else: this is
                // what closes the race window with YouTube's own
                // suggested-video autoplay, which otherwise can briefly
                // start playing before loadVideoById below takes over.
                event.target.stopVideo()
                const nextIndex = (indexRef.current + 1) % songs.length
                playAt(nextIndex)
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
