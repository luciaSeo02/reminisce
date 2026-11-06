import { useEffect, useRef } from 'react'
import { loadYouTubeIframeApi } from '../lib/youtubeIframeApi.js'
import { useStrings } from '../i18n/LanguageContext.jsx'

// Covers loading only (script plus player ready), never playback: on iOS a
// ready player can wait for a second tap on its own play button, and that
// must not be reported as a failure.
export const PREVIEW_LOAD_TIMEOUT_MS = 15 * 1000

// YouTube error codes for a video that is removed, private or not
// embeddable. These songs would also fail on the Music screen, so the
// caregiver is told to pick another version rather than to retry.
const UNAVAILABLE_ERROR_CODES = new Set([100, 101, 150])

// Plays one search result in Settings so the caregiver can check it before
// adding it. Mounting starts the preview (the caller only mounts it after a
// tap on Listen) and unmounting always destroys the player, so whoever
// decides which row is playing also decides when sound stops.
//
// onError receives 'unavailable' or 'failed'. onEnded is called when the
// song finishes or YouTube starts a different video.
function SongPreview({ videoId, onEnded, onError }) {
  const strings = useStrings()
  const hostRef = useRef(null)
  const callbacksRef = useRef({ onEnded, onError })
  callbacksRef.current = { onEnded, onError }
  const playerTitle = strings.managePreviewPlayerTitle
  const playerTitleRef = useRef(playerTitle)
  playerTitleRef.current = playerTitle

  useEffect(() => {
    let cancelled = false
    let player = null

    function fail(kind) {
      if (cancelled) return
      cancelled = true
      callbacksRef.current.onError(kind)
    }

    function end() {
      if (cancelled) return
      cancelled = true
      callbacksRef.current.onEnded()
    }

    const timer = setTimeout(() => fail('failed'), PREVIEW_LOAD_TIMEOUT_MS)

    // YT.Player replaces the element it is given with its iframe. Handing
    // it a node React does not own keeps React's tree intact when the
    // preview unmounts.
    const target = document.createElement('div')
    hostRef.current.appendChild(target)

    loadYouTubeIframeApi()
      .then((YT) => {
        if (cancelled) return
        player = new YT.Player(target, {
          width: '100%',
          height: '100%',
          playerVars: {
            // Controls stay on: the caregiver may want to skip ahead to
            // check the version, and YouTube's own play button is the
            // fallback where a browser blocks sound after the async load.
            controls: 1,
            rel: 0,
            playsinline: 1,
          },
          events: {
            onReady: (event) => {
              if (cancelled) return
              clearTimeout(timer)
              event.target.getIframe()?.setAttribute('title', playerTitleRef.current)
              event.target.loadVideoById(videoId)
            },
            onStateChange: (event) => {
              if (cancelled) return
              if (event.data === YT.PlayerState.PLAYING) {
                const playingId = event.target.getVideoData()?.video_id
                if (playingId && playingId !== videoId) {
                  event.target.stopVideo()
                  end()
                }
                return
              }
              if (event.data === YT.PlayerState.ENDED) {
                // Stop first so YouTube's own "up next" cannot start.
                event.target.stopVideo()
                end()
              }
            },
            onError: (event) => {
              fail(UNAVAILABLE_ERROR_CODES.has(event.data) ? 'unavailable' : 'failed')
            },
          },
        })
      })
      .catch((error) => {
        console.error('Failed to load YouTube player for preview:', error)
        fail('failed')
      })

    return () => {
      cancelled = true
      clearTimeout(timer)
      player?.destroy()
      target.remove()
    }
  }, [videoId])

  return <div ref={hostRef} className="manage-preview-player" />
}

export default SongPreview
