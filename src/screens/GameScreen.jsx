import { useEffect, useRef, useState } from 'react'
import { getSelectedSongs } from '../lib/musicStore.js'
import { decodeTitle } from '../lib/decodeTitle.js'
import { pickRound } from '../lib/pickRound.js'
import { loadYouTubeIframeApi } from '../lib/youtubeIframeApi.js'
import { useStrings } from '../i18n/LanguageContext.jsx'
import { ArrowRightIcon } from './shared/icons.jsx'
import './GameScreen.css'

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
    return <p className="screen-empty">{strings.gameEmptyState}</p>
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
    <div className="game-screen">
      {phase === 'picking' && (
        <>
          <h2 className="game-question">{strings.gameTitlePicking}</h2>
          {/* Errorless: every card leads to the same reveal. */}
          <div className="game-options">
            {round.options.map((song, optionIndex) => (
              <button
                type="button"
                key={song.videoId}
                className="game-option"
                onClick={() => setPhase('reveal')}
              >
                <RecordIllustration centerColor={RECORD_COLORS[optionIndex % RECORD_COLORS.length]} />
                <span className="game-option-title">{decodeTitle(song.title)}</span>
              </button>
            ))}
          </div>
        </>
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
            <p className="game-reveal-title">{decodeTitle(round.target.title)}</p>
            <p className="game-hint">
              {paused ? strings.commonTapHintPaused : strings.commonTapHintPlaying}
            </p>
          </>
        )}
      </button>

      {phase === 'reveal' && (
        <button
          type="button"
          className="pill-button pill-button-primary game-next-button"
          onClick={handleNext}
        >
          <span>{strings.gameNext}</span>
          <ArrowRightIcon />
        </button>
      )}
    </div>
  )
}

// Fixed illustration colors (game gold, photos terracotta) so the two cards
// are easy to tell apart. They do not follow the theme.
const RECORD_COLORS = ['#8A6410', '#B4532A']

function RecordIllustration({ centerColor }) {
  return (
    <svg className="game-option-record" viewBox="0 0 200 200" aria-hidden="true" focusable="false">
      <circle cx="100" cy="100" r="96" fill="#2B2118" />
      <circle cx="100" cy="100" r="78" fill="none" stroke="#4A3A2E" strokeWidth="2" />
      <circle cx="100" cy="100" r="62" fill="none" stroke="#4A3A2E" strokeWidth="2" />
      <path d="M50 58 A66 66 0 0 1 100 34" fill="none" stroke="#FFFCF6" strokeOpacity="0.25" strokeWidth="5" strokeLinecap="round" />
      <circle cx="100" cy="100" r="36" fill={centerColor} />
      <path d="M92 112V90l18-4v20" fill="none" stroke="#FFFCF6" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="87" cy="113" r="6" fill="#FFFCF6" />
      <circle cx="105" cy="109" r="6" fill="#FFFCF6" />
    </svg>
  )
}

export default GameScreen
