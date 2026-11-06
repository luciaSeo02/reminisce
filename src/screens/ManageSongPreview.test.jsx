// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setStoredPin } from '../lib/managePin.js'
import { unlock } from '../lib/manageUnlock.js'

// A stand-in for the YouTube IFrame API that records every player and lets
// a test fire its events.
const fakeYT = {
  PlayerState: { ENDED: 0, PLAYING: 1, PAUSED: 2 },
  players: [],
  Player: class {
    constructor(element, options) {
      this.element = element
      this.options = options
      this.events = options.events
      this.loaded = []
      this.destroyed = false
      this.stopped = 0
      fakeYT.players.push(this)
    }
    loadVideoById(id) {
      this.loaded.push(id)
    }
    getVideoData() {
      return { video_id: this.loaded.at(-1) }
    }
    getIframe() {
      return null
    }
    stopVideo() {
      this.stopped += 1
    }
    destroy() {
      this.destroyed = true
    }
  },
}

let loadApi
vi.mock('../lib/youtubeIframeApi.js', () => ({
  loadYouTubeIframeApi: () => loadApi(),
}))

const { default: ManageScreen } = await import('./ManageScreen.jsx')

globalThis.IS_REACT_ACT_ENVIRONMENT = true

const RESULTS = ['a', 'b', 'c'].map((id) => ({
  videoId: `video-${id}`,
  title: `Song ${id.toUpperCase()}`,
  thumbnailUrl: null,
}))

let container
let root

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  // Photos and the backup size estimate read IndexedDB, which jsdom does
  // not have. Those failures are caught and logged by the screen.
  vi.spyOn(console, 'error').mockImplementation(() => {})
  setStoredPin('1234')
  unlock()
  fakeYT.players = []
  loadApi = () => Promise.resolve(fakeYT)
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ ok: true, json: async () => ({ results: RESULTS }) })),
  )
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const searchInput = () => container.querySelector('#manage-search-input')
const searchSection = () => searchInput().closest('.manage-subsection')
const rows = () => [...searchSection().querySelectorAll('.manage-song-list > .manage-song')]
const status = () => searchSection().querySelector('[role="status"]').textContent
const livePlayers = () => fakeYT.players.filter((player) => !player.destroyed)

function rowButton(index, label) {
  return [...rows()[index].querySelectorAll('button')].find(
    (node) => node.textContent === label,
  )
}

function rowMessage(index) {
  return rows()[index].querySelector('.manage-preview-message')?.textContent ?? null
}

async function flush() {
  await act(async () => {})
}

function typeQuery(value) {
  const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
  act(() => {
    setValue.call(searchInput(), value)
    searchInput().dispatchEvent(new Event('input', { bubbles: true }))
  })
}

async function search(term = 'boleros') {
  typeQuery(term)
  await act(async () => {
    searchSection().querySelector('button[type="submit"]').click()
  })
}

async function renderWithResults() {
  await act(async () => {
    root.render(<ManageScreen />)
  })
  await search()
  expect(rows()).toHaveLength(RESULTS.length)
}

async function listen(index) {
  act(() => rowButton(index, 'Listen').click())
  await flush()
  const player = fakeYT.players.at(-1)
  act(() => player.events.onReady({ target: player }))
  return player
}

describe('Settings song preview', () => {
  it('creates no player until Listen is tapped, then plays that result', async () => {
    await renderWithResults()
    await flush()
    expect(fakeYT.players).toHaveLength(0)
    expect(rowButton(0, 'Listen')).toBeTruthy()

    const player = await listen(1)
    expect(player.loaded).toEqual(['video-b'])
    expect(player.options.playerVars.autoplay).toBeUndefined()
    expect(player.options.playerVars.controls).toBe(1)
    expect(rowButton(1, 'Stop')).toBeTruthy()
    expect(rows()[1].textContent).toContain('Listening')
    expect(status()).toBe('Listening to Song B.')
  })

  it('plays one result at a time', async () => {
    await renderWithResults()
    const first = await listen(0)
    const second = await listen(2)

    expect(first.destroyed).toBe(true)
    expect(livePlayers()).toEqual([second])
    expect(second.loaded).toEqual(['video-c'])
    expect(rowButton(0, 'Listen')).toBeTruthy()
    expect(rowButton(2, 'Stop')).toBeTruthy()
    expect(searchSection().querySelectorAll('.manage-preview-player')).toHaveLength(1)
  })

  it('Stop destroys the player', async () => {
    await renderWithResults()
    const player = await listen(0)
    act(() => rowButton(0, 'Stop').click())
    expect(player.destroyed).toBe(true)
    expect(rowButton(0, 'Listen')).toBeTruthy()
    expect(status()).toBe('')
  })

  it('adding a song stops the preview and still saves the song', async () => {
    await renderWithResults()
    const player = await listen(0)
    act(() => rowButton(1, 'Add').click())
    expect(player.destroyed).toBe(true)
    expect(JSON.parse(localStorage.getItem('reminisce-selected-songs'))).toEqual([RESULTS[1]])
  })

  it('a new search stops the preview', async () => {
    await renderWithResults()
    const player = await listen(0)
    await search('tangos')
    expect(player.destroyed).toBe(true)
    expect(livePlayers()).toHaveLength(0)
  })

  it('emptying the search box stops the preview, editing it does not', async () => {
    await renderWithResults()
    const player = await listen(0)
    typeQuery('bolero')
    expect(player.destroyed).toBe(false)
    typeQuery('   ')
    expect(player.destroyed).toBe(true)
  })

  it('leaving Settings destroys the player', async () => {
    await renderWithResults()
    const player = await listen(0)
    act(() => root.unmount())
    expect(player.destroyed).toBe(true)
    root = createRoot(container)
  })

  it('hiding the page stops the preview', async () => {
    await renderWithResults()
    const player = await listen(0)
    const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
    act(() => document.dispatchEvent(new Event('visibilitychange')))
    expect(player.destroyed).toBe(true)
    visibility.mockRestore()

    const next = await listen(1)
    act(() => window.dispatchEvent(new Event('pagehide')))
    expect(next.destroyed).toBe(true)
  })

  it('goes back to Listen when the song ends, stopping first', async () => {
    await renderWithResults()
    const player = await listen(0)
    act(() => player.events.onStateChange({ target: player, data: fakeYT.PlayerState.ENDED }))
    expect(player.stopped).toBe(1)
    expect(player.destroyed).toBe(true)
    expect(rowButton(0, 'Listen')).toBeTruthy()
  })

  it('stops if YouTube starts a different video', async () => {
    await renderWithResults()
    const player = await listen(0)
    player.loaded.push('some-other-video')
    act(() => player.events.onStateChange({ target: player, data: fakeYT.PlayerState.PLAYING }))
    expect(player.stopped).toBe(1)
    expect(player.destroyed).toBe(true)
  })

  it.each([100, 101, 150])(
    'error %i says the video cannot play in the app, and Add still works',
    async (code) => {
      await renderWithResults()
      const player = await listen(1)
      act(() => player.events.onError({ target: player, data: code }))

      expect(player.destroyed).toBe(true)
      const message = 'This video cannot be played in the app. Try choosing another version of the song.'
      expect(rowMessage(1)).toBe(message)
      expect(status()).toBe(message)
      expect(rowButton(1, 'Add').disabled).toBe(false)
      act(() => rowButton(1, 'Add').click())
      expect(JSON.parse(localStorage.getItem('reminisce-selected-songs'))).toEqual([RESULTS[1]])
    },
  )

  it('other errors say the preview could not load, and Listen retries', async () => {
    await renderWithResults()
    const player = await listen(0)
    act(() => player.events.onError({ target: player, data: 5 }))
    expect(rowMessage(0)).toBe('The song could not load for listening. Please try again.')
    expect(rowButton(0, 'Add').disabled).toBe(false)

    const retry = await listen(0)
    expect(retry).not.toBe(player)
    expect(retry.loaded).toEqual(['video-a'])
    expect(rowMessage(0)).toBeNull()
  })

  it('a failed script load shows the calm message', async () => {
    loadApi = () => Promise.reject(new Error('offline'))
    await renderWithResults()
    act(() => rowButton(0, 'Listen').click())
    await flush()
    expect(rowMessage(0)).toBe('The song could not load for listening. Please try again.')
    expect(rowButton(0, 'Listen')).toBeTruthy()
    expect(rowButton(0, 'Add').disabled).toBe(false)
  })

  it('shows the message if the player is not ready after 15 seconds', async () => {
    await renderWithResults()
    vi.useFakeTimers()
    loadApi = () => new Promise(() => {})
    act(() => rowButton(0, 'Listen').click())
    act(() => vi.advanceTimersByTime(14999))
    expect(rowMessage(0)).toBeNull()
    act(() => vi.advanceTimersByTime(1))
    expect(rowMessage(0)).toBe('The song could not load for listening. Please try again.')
  })

  it('the timer covers loading only, not playback', async () => {
    await renderWithResults()
    const player = await listen(0)
    vi.useFakeTimers()
    act(() => vi.advanceTimersByTime(60 * 1000))
    expect(rowMessage(0)).toBeNull()
    expect(player.destroyed).toBe(false)
  })

  it('stores nothing', async () => {
    await renderWithResults()
    const before = JSON.stringify({ ...localStorage })
    const player = await listen(0)
    act(() => player.events.onError({ target: player, data: 150 }))
    await listen(1)
    act(() => rowButton(1, 'Stop').click())
    expect(JSON.stringify({ ...localStorage })).toBe(before)
  })
})

describe('Settings song preview layout', () => {
  function placeButton(button, tops) {
    const queue = [...tops]
    vi.spyOn(button, 'getBoundingClientRect').mockImplementation(() => {
      const top = queue.length > 1 ? queue.shift() : queue[0]
      return { top, bottom: top + 52, left: 0, right: 100, width: 100, height: 52 }
    })
  }

  it('keeps the tapped Listen button in place when a player above it closes', async () => {
    await renderWithResults()
    await listen(0)
    const scrollBy = vi.fn()
    vi.stubGlobal('scrollBy', scrollBy)
    Element.prototype.scrollIntoView = vi.fn()

    // Before the tap the button is at 500. Once the player above it is
    // gone it is at 200, and after the compensating scroll back at 500.
    placeButton(rowButton(2, 'Listen'), [500, 200, 500])
    act(() => rowButton(2, 'Listen').click())

    expect(scrollBy).toHaveBeenCalledWith({ top: -300, behavior: 'instant' })
    expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled()
    delete Element.prototype.scrollIntoView
  })

  it('brings the button back on screen if the page cannot scroll that far', async () => {
    await renderWithResults()
    await listen(0)
    vi.stubGlobal('scrollBy', vi.fn())
    const scrollIntoView = vi.fn()
    Element.prototype.scrollIntoView = scrollIntoView

    placeButton(rowButton(2, 'Listen'), [100, -250, -250])
    act(() => rowButton(2, 'Listen').click())

    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'nearest', behavior: 'instant' })
    delete Element.prototype.scrollIntoView
  })

  it('does not scroll when nothing moved', async () => {
    await renderWithResults()
    const scrollBy = vi.fn()
    vi.stubGlobal('scrollBy', scrollBy)
    placeButton(rowButton(1, 'Listen'), [300])
    act(() => rowButton(1, 'Listen').click())
    expect(scrollBy).not.toHaveBeenCalled()
  })
})
