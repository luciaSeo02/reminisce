import { useEffect, useRef, useState } from 'react'
import { getSelectedSongs } from '../lib/musicStore.js'
import { loadYouTubeIframeApi } from '../lib/youtubeIframeApi.js'
import { useStrings } from '../i18n/LanguageContext.jsx'
import './GameScreen.css'

// Picks a target song, excluding excludeTargetId so the same song never
// becomes the target twice in a row (it can still appear as a distractor).
function pickRound(songs, excludeTargetId) {
  const targetPool = songs.filter((song) => song.videoId !== excludeTargetId)
  const candidates = targetPool.length > 0 ? targetPool : songs
  const target = candidates[Math.floor(Math.random() * candidates.length)]

  const distractorPool = songs.filter((song) => song.videoId !== target.videoId)
  const distractor = distractorPool[Math.floor(Math.random() * distractorPool.length)]

  const options = Math.random() < 0.5 ? [target, distractor] : [distractor, target]
  return { target, options }
}

function GameScreen() {
  const strings = useStrings()
  const [songs] = useState(() => getSelectedSongs())
  const previousTargetIdRef = useRef(null)
  const [round, setRound] = useState(() => {
    if (songs.length < 2) return null
    const firstRound = pickRound(songs, null)
    previousTargetIdRef.current = firstRound.target.videoId
    return firstRound
  })
  const [phase, setPhase] = useState('picking')
  const [paused, setPaused] = useState(false)
  const [allFailed, setAllFailed] = useState(false)
  const containerRef = useRef(null)
  const playerRef = useRef(null)
  const failCountRef = useRef(0)

  function nextRound() {
    const newRound = pickRound(songs, previousTargetIdRef.current)
    previousTargetIdRef.current = newRound.target.videoId
    return newRound
  }

  // One player per round: created hidden so the target song's audio can
  // start as soon as the picking phase begins, then simply revealed (no
  // reload) when an option is tapped, so audio and video stay continuous.
  useEffect(() => {
    if (!round) return
    let cancelled = false

    loadYouTubeIframeApi()
      .then((YT) => {
        if (cancelled || !containerRef.current) return
        if (playerRef.current) return

        playerRef.current = new YT.Player(containerRef.current, {
          width: '100%',
          height: '100%',
          playerVars: {
            controls: 0,
            rel: 0,
            modestbranding: 1,
            playsinline: 1,
            disablekb: 1,
          },
          events: {
            onReady: (event) => {
              event.target.loadVideoById(round.target.videoId)
            },
            onStateChange: (event) => {
              if (event.data === YT.PlayerState.PLAYING) {
                failCountRef.current = 0
                setPaused(false)
                return
              }
              if (event.data === YT.PlayerState.PAUSED) setPaused(true)
            },
            onError: () => {
              // Same approach as Music: skip to a fresh round rather than
              // freezing, and only give up with a calm placeholder if
              // failures keep happening without a single success.
              failCountRef.current += 1
              if (failCountRef.current >= songs.length) {
                setAllFailed(true)
                return
              }
              setPhase('picking')
              setPaused(false)
              setRound(nextRound())
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
  }, [round, songs])

  if (songs.length < 2 || allFailed) {
    return (
      <div className="placeholder-screen game-screen">
        <h1>{strings.gameTitleReveal}</h1>
        <p>{strings.gameEmptyState}</p>
      </div>
    )
  }

  function handleNext() {
    setPhase('picking')
    setPaused(false)
    setRound(nextRound())
  }

  function handleTap() {
    const player = playerRef.current
    if (!player) return
    if (paused) {
      player.playVideo()
    } else {
      player.pauseVideo()
    }
  }

  return (
    <div className="placeholder-screen game-screen">
      <h1>{phase === 'reveal' ? strings.gameTitleReveal : strings.gameTitlePicking}</h1>

      {phase === 'picking' && (
        <div className="game-options">
          {round.options.map((song) => (
            <button
              type="button"
              key={song.videoId}
              className="game-option"
              onClick={() => setPhase('reveal')}
            >
              {song.thumbnailUrl ? (
                <img src={song.thumbnailUrl} alt="" className="game-option-thumb" />
              ) : (
                <div className="game-option-thumb game-option-thumb-placeholder" />
              )}
              <span className="game-option-title">{song.title}</span>
            </button>
          ))}
        </div>
      )}

      <button
        type="button"
        className={`game-video-tap ${phase === 'reveal' ? '' : 'game-video-tap-hidden'}`}
        onClick={phase === 'reveal' ? handleTap : undefined}
        tabIndex={phase === 'reveal' ? 0 : -1}
        aria-hidden={phase === 'picking'}
        aria-label={
          phase === 'reveal'
            ? paused
              ? strings.gameResumeLabel
              : strings.gamePauseLabel
            : undefined
        }
      >
        <div className="game-video">
          <div ref={containerRef} />
        </div>
        {phase === 'reveal' && (
          <>
            <p className="game-reveal-title">{round.target.title}</p>
            <p className="game-hint">
              {paused ? strings.commonTapHintPaused : strings.commonTapHintPlaying}
            </p>
          </>
        )}
      </button>

      {phase === 'reveal' && (
        <button type="button" className="game-next-button" onClick={handleNext}>
          {strings.gameNext}
        </button>
      )}
    </div>
  )
}

export default GameScreen
