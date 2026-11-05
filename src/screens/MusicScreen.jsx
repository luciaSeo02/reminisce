import { useEffect, useRef, useState } from 'react'
import { getSelectedSongs, getStoredPlayOrder } from '../lib/musicStore.js'
import { advancePlayback, createPlayback, currentSongIndex } from '../lib/playOrder.js'
import { decodeTitle } from '../lib/decodeTitle.js'
import { loadYouTubeIframeApi } from '../lib/youtubeIframeApi.js'
import { useStrings } from '../i18n/LanguageContext.jsx'
import {
  FULLSCREEN_CHANGE_EVENTS,
  exitElementFullscreen,
  getFullscreenElement,
  requestElementFullscreen,
} from '../lib/fullscreen.js'
import {
  ArrowRightIcon,
  CollapseIcon,
  ExpandIcon,
  PauseIcon,
  PlayIcon,
} from './shared/icons.jsx'
import './MusicScreen.css'

function MusicScreen() {
  const strings = useStrings()
  const [songs] = useState(() => getSelectedSongs())
  // Read once when Music opens, like the song list. In shuffle mode the
  // whole round is built up front, so a change in Settings applies the
  // next time Music opens.
  const [playOrder] = useState(() => getStoredPlayOrder())
  const [initialPlayback] = useState(() => createPlayback(songs.length, playOrder))
  const [index, setIndex] = useState(() => currentSongIndex(initialPlayback) ?? 0)
  const [paused, setPaused] = useState(false)
  const [allFailed, setAllFailed] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const containerRef = useRef(null)
  const stageRef = useRef(null)
  const barRef = useRef(null)
  const barPauseRef = useRef(null)
  const fullscreenButtonRef = useRef(null)
  const inFullscreenRef = useRef(false)
  const wasExpandedRef = useRef(false)
  const playerRef = useRef(null)
  const playbackRef = useRef(initialPlayback)
  const indexRef = useRef(index)
  // Video ids that failed since the last song that played. Counting distinct
  // songs (not failures) matters in shuffle mode, where a new round can
  // retry a failed song before an untried one. In order, consecutive
  // failures are always different songs, so this matches the old count.
  const failedIdsRef = useRef(new Set())

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
    playbackRef.current = advancePlayback(playbackRef.current, playOrder)
    playAt(currentSongIndex(playbackRef.current))
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
              // The labeled buttons are the keyboard way to control the
              // music. Without this, Tab gets stuck inside YouTube's
              // iframe and never reaches the Full screen button.
              event.target.getIframe()?.setAttribute('tabindex', '-1')
              event.target.loadVideoById(songs[indexRef.current].videoId)
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
                failedIdsRef.current.clear()
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
              failedIdsRef.current.add(songs[indexRef.current].videoId)
              if (failedIdsRef.current.size >= songs.length) {
                playerRef.current?.destroy()
                playerRef.current = null
                setExpanded(false)
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

  // Expanded mode never remounts or moves the player: the stage element
  // that holds it is always rendered, and expanding only changes its
  // class (CSS fixed, full viewport). Where the browser supports element
  // fullscreen, the same stage is also put into real fullscreen, which
  // hides the browser bars. Without it, the CSS mode alone is the fallback.
  function enterExpanded() {
    setExpanded(true)
    requestElementFullscreen(stageRef.current)
  }

  function exitExpanded() {
    setExpanded(false)
    exitElementFullscreen(stageRef.current)
  }

  // Leaving real fullscreen with the system gesture, the browser's own
  // Escape handling or its exit control must also leave the expanded mode,
  // so the screen is never left half expanded.
  useEffect(() => {
    const stage = stageRef.current
    function handleFullscreenChange() {
      if (stageRef.current && getFullscreenElement() === stageRef.current) {
        inFullscreenRef.current = true
        return
      }
      if (inFullscreenRef.current) {
        inFullscreenRef.current = false
        setExpanded(false)
      }
    }
    for (const name of FULLSCREEN_CHANGE_EVENTS) {
      document.addEventListener(name, handleFullscreenChange)
    }
    return () => {
      for (const name of FULLSCREEN_CHANGE_EVENTS) {
        document.removeEventListener(name, handleFullscreenChange)
      }
      exitElementFullscreen(stage)
    }
  }, [])

  // Escape for the CSS-only mode. In real fullscreen the browser handles
  // Escape itself and the fullscreenchange listener above catches it.
  useEffect(() => {
    if (!expanded) return
    function handleKeyDown(event) {
      if (event.key === 'Escape') exitExpanded()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [expanded])

  useEffect(() => {
    if (expanded) {
      barPauseRef.current?.focus()
    } else if (wasExpandedRef.current) {
      fullscreenButtonRef.current?.focus()
    }
    wasExpandedRef.current = expanded
  }, [expanded])

  // While expanded, Tab cycles through the bar's buttons only. In the CSS
  // mode the header and the song card are still in the page underneath.
  function handleStageKeyDown(event) {
    if (!expanded || event.key !== 'Tab') return
    const buttons = barRef.current?.querySelectorAll('button')
    if (!buttons?.length) return
    const first = buttons[0]
    const last = buttons[buttons.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
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

  function handleSkip() {
    if (!playerRef.current) return
    advanceToNext()
  }

  if (songs.length === 0 || allFailed) {
    return <p className="screen-empty">{strings.musicEmptyState}</p>
  }

  const pauseIcon = paused ? <PlayIcon /> : <PauseIcon />
  const pauseLabel = paused ? strings.musicResumeLabel : strings.musicPauseLabel
  const dialogProps = expanded
    ? { role: 'dialog', 'aria-modal': 'true', 'aria-label': strings.musicFullScreen }
    : {}

  return (
    <div className={expanded ? 'music-screen music-screen-expanded' : 'music-screen'}>
      <div className="music-layout">
        {/* The stage is always rendered and the player inside it never
            changes parent, so expanding and exiting never reload the
            video. Only its class changes. */}
        <div
          ref={stageRef}
          className={expanded ? 'music-stage music-stage-expanded' : 'music-stage'}
          onKeyDown={handleStageKeyDown}
          {...dialogProps}
        >
          {/* Tapping the video pauses and resumes in both modes, through
              this same element and handler. The labeled Pause buttons do
              the same for keyboard and screen reader users, so the video
              is not a second tab stop. */}
          <div className="music-player" onClick={handleTap}>
            <div ref={containerRef} />
          </div>
          <button
            ref={fullscreenButtonRef}
            type="button"
            className="music-fullscreen-button"
            onClick={enterExpanded}
            hidden={expanded}
          >
            <ExpandIcon />
            <span>{strings.musicFullScreen}</span>
          </button>
          <div ref={barRef} className="music-stage-bar" hidden={!expanded}>
            <p className="music-stage-title">{decodeTitle(songs[index].title)}</p>
            <div className="music-stage-controls">
              <button
                ref={barPauseRef}
                type="button"
                className="music-stage-button music-stage-button-primary"
                onClick={handleTap}
              >
                {pauseIcon}
                <span>{pauseLabel}</span>
              </button>
              <button type="button" className="music-stage-button" onClick={handleSkip}>
                <span>{strings.musicSkip}</span>
                <ArrowRightIcon />
              </button>
              <button type="button" className="music-stage-button" onClick={exitExpanded}>
                <CollapseIcon />
                <span>{strings.musicExitFullScreen}</span>
              </button>
            </div>
          </div>
        </div>
        <div className="music-now" inert={expanded}>
          <p className="music-title">{decodeTitle(songs[index].title)}</p>
          <div className="music-controls">
            <button
              type="button"
              className="pill-button pill-button-primary"
              onClick={handleTap}
            >
              {pauseIcon}
              <span>{pauseLabel}</span>
            </button>
            <button type="button" className="pill-button" onClick={handleSkip}>
              <span>{strings.musicSkip}</span>
              <ArrowRightIcon />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MusicScreen
