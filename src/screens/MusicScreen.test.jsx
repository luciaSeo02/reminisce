// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// A stand-in for the YouTube IFrame API. It records every video the screen
// asks for and lets a test fire the player events (ready, playing, ended,
// error) that drive the screen.
const fakeYT = {
  PlayerState: { ENDED: 0, PLAYING: 1, PAUSED: 2 },
  players: [],
  Player: class {
    constructor(element, options) {
      this.events = options.events
      this.loaded = []
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
    stopVideo() {}
    playVideo() {}
    pauseVideo() {}
    destroy() {}
  },
}

vi.mock('../lib/youtubeIframeApi.js', () => ({
  loadYouTubeIframeApi: () => Promise.resolve(fakeYT),
}))

const { default: MusicScreen } = await import('./MusicScreen.jsx')

globalThis.IS_REACT_ACT_ENVIRONMENT = true

const SONGS = ['a', 'b', 'c', 'd'].map((id) => ({
  videoId: `video-${id}`,
  title: `Song ${id.toUpperCase()}`,
  thumbnailUrl: null,
}))

let container
let root

beforeEach(() => {
  localStorage.clear()
  fakeYT.players = []
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
  vi.restoreAllMocks()
})

async function renderMusic(songs = SONGS) {
  localStorage.setItem('reminisce-selected-songs', JSON.stringify(songs))
  await act(async () => {
    root.render(<MusicScreen />)
  })
  const player = fakeYT.players[0]
  act(() => player.events.onReady({ target: player }))
  return player
}

function playing(player) {
  act(() => player.events.onStateChange({ target: player, data: fakeYT.PlayerState.PLAYING }))
}

function ended(player) {
  act(() => player.events.onStateChange({ target: player, data: fakeYT.PlayerState.ENDED }))
}

function failed(player) {
  act(() => player.events.onError({ target: player }))
}

function skip() {
  const button = [...container.querySelectorAll('.music-controls button')].find((node) =>
    node.textContent.includes('Skip'),
  )
  act(() => button.click())
}

function shownTitle() {
  return container.querySelector('.music-title')?.textContent
}

const indexOf = (videoId) => SONGS.findIndex((song) => song.videoId === videoId)

describe('MusicScreen with no play order saved (in order, as before the setting)', () => {
  it('plays (index + 1) % count through song end, song error and Skip', async () => {
    expect(localStorage.getItem('reminisce-music-order')).toBeNull()
    const player = await renderMusic()

    // Song end, error and Skip, mixed and wrapping past the end twice.
    const steps = [ended, ended, failed, skip, ended, failed, skip, skip, ended, failed]
    for (const step of steps) {
      playing(player)
      step === skip ? skip() : step(player)
    }

    const expected = [0]
    for (let i = 0; i < steps.length; i += 1) {
      expected.push((expected.at(-1) + 1) % SONGS.length)
    }
    expect(player.loaded.map(indexOf)).toEqual(expected)
    expect(shownTitle()).toBe(SONGS[expected.at(-1)].title)
  })

  it('shows the calm empty message once every song has failed in a row', async () => {
    const player = await renderMusic()
    for (let i = 0; i < SONGS.length - 1; i += 1) failed(player)
    expect(shownTitle()).toBe(SONGS[SONGS.length - 1].title)
    failed(player)
    expect(container.querySelector('.screen-empty')).not.toBeNull()
  })

  it('a successful play in between resets the failure count', async () => {
    const player = await renderMusic()
    for (let i = 0; i < SONGS.length - 1; i += 1) failed(player)
    playing(player)
    for (let i = 0; i < SONGS.length - 1; i += 1) failed(player)
    expect(container.querySelector('.screen-empty')).toBeNull()
  })

  it('with one song, repeats it', async () => {
    const player = await renderMusic(SONGS.slice(0, 1))
    playing(player)
    ended(player)
    playing(player)
    skip()
    expect(player.loaded).toEqual(['video-a', 'video-a', 'video-a'])
  })
})
