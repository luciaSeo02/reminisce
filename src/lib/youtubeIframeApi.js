let apiPromise = null

// Loads the YouTube IFrame Player API script once and resolves with the
// global YT object, reusing the same promise across repeated calls (e.g.
// leaving and re-entering the Music screen).
export function loadYouTubeIframeApi() {
  if (window.YT && window.YT.Player) {
    return Promise.resolve(window.YT)
  }

  if (!apiPromise) {
    apiPromise = new Promise((resolve, reject) => {
      const previousReady = window.onYouTubeIframeAPIReady
      window.onYouTubeIframeAPIReady = () => {
        previousReady?.()
        resolve(window.YT)
      }

      const script = document.createElement('script')
      script.src = 'https://www.youtube.com/iframe_api'
      script.onerror = () => reject(new Error('Failed to load YouTube IFrame API'))
      document.head.appendChild(script)
    })
  }

  return apiPromise
}
