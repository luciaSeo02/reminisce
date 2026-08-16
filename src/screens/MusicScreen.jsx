import { useEffect, useRef, useState } from 'react'
import { getSelectedSongs } from '../lib/musicStore.js'
import { loadYouTubeIframeApi } from '../lib/youtubeIframeApi.js'
import './MusicScreen.css'

function MusicScreen() {
  const [songs] = useState(() => getSelectedSongs())
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [allFailed, setAllFailed] = useState(false)
  const containerRef = useRef(null)
  const playerRef = useRef(null)
  const indexRef = useRef(0)
  const failCountRef = useRef(0)

  // Loads a song and advances the on-screen title in the same call, so
  // there is no gap between the player switching video and the title
  // updating to match. Shared by auto-advance-on-end, auto-advance-on-
  // error, and the manual Skip button.
  function playAt(nextIndex) {
    indexRef.current = nextIndex
    setIndex(nextIndex)
    playerRef.current?.loadVideoById(songs[nextIndex].videoId)
  }

  function advanceToNext() {
    playAt((indexRef.current + 1) % songs.length)
  }

  useEffect(() => {
    if (songs.length === 0) return
    let cancelled = false

    loadYouTubeIframeApi()
      .then((YT) => {
        if (cancelled || !containerRef.current) return
        // Never let two player instances exist at once: `cancelled`
        // already filters out a stale async callback from a superseded
        // effect run (e.g. React StrictMode's dev-only double effect
        // invocation), but this is a second, unconditional line of
        // defense against ever creating a second live instance.
        if (playerRef.current) return

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
                failCountRef.current = 0
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
                advanceToNext()
              }
            },
            onError: () => {
              // A song that fails to play (embedding disabled,
              // age-restricted, removed, region-blocked, ...) should never
              // surface a visible error: skip it the same way the end of
              // a song does. If every selected song fails in a row
              // without a single successful play in between, stop trying
              // and fall back to the calm empty-state message instead of
              // looping errors forever.
              failCountRef.current += 1
              if (failCountRef.current >= songs.length) {
                playerRef.current?.destroy()
                playerRef.current = null
                setAllFailed(true)
                return
              }
              advanceToNext()
            },
          },
        })
      })
      .catch((error) => console.error('Failed to load YouTube player:', error))

    return () => {
      cancelled = true
      if (playerRef.current) {
        playerRef.current.destroy()
        playerRef.current = null
      }
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

  function handleSkip() {
    if (!playerRef.current) return
    advanceToNext()
  }

  if (songs.length === 0 || allFailed) {
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
      <button type="button" className="music-skip-button" onClick={handleSkip}>
        Skip
      </button>
    </div>
  )
}

export default MusicScreen
