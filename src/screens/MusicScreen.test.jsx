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

describe('MusicScreen in shuffle mode', () => {
  // Deterministic Math.random for the screen's shuffles (mulberry32).
  function seedMathRandom(seed) {
    let state = seed >>> 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      state = (state + 0x6d2b79f5) >>> 0
      let t = state
      t = Math.imul(t ^ (t >>> 15), t | 1)
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    })
  }

  it('plays every song once per round, with no repeat at the boundary', async () => {
    localStorage.setItem('reminisce-music-order', 'shuffle')
    seedMathRandom(11)
    const player = await renderMusic()
    const rounds = 6
    for (let i = 1; i < SONGS.length * rounds; i += 1) {
      playing(player)
      i % 3 === 0 ? skip() : ended(player)
    }

    const played = player.loaded.map(indexOf)
    expect(played).toHaveLength(SONGS.length * rounds)
    for (let round = 0; round < rounds; round += 1) {
      const slice = played.slice(round * SONGS.length, (round + 1) * SONGS.length)
      expect([...slice].sort()).toEqual([0, 1, 2, 3])
    }
    for (let i = 1; i < played.length; i += 1) {
      expect(played[i]).not.toBe(played[i - 1])
    }
    expect(played.slice(0, SONGS.length)).not.toEqual([0, 1, 2, 3])
    expect(shownTitle()).toBe(SONGS[played.at(-1)].title)
  })

  it('does not give up while a song that has not failed is still to come', async () => {
    localStorage.setItem('reminisce-music-order', 'shuffle')
    // Fisher-Yates draws three numbers per shuffle of four songs. Values
    // near 1 keep the list order, so round one is A B C D. Round two draws
    // 0.99, 0, 0.99, which gives C B A D: it starts with two songs that
    // already failed, before A.
    const values = [0.99, 0.99, 0.99, 0.99, 0, 0.99]
    let call = 0
    vi.spyOn(Math, 'random').mockImplementation(() => values[call++] ?? 0.99)
    const player = await renderMusic()
    playing(player)
    ended(player)
    failed(player) // B
    failed(player) // C
    failed(player) // D, end of round one
    failed(player) // C again: four failures, but only three songs
    failed(player) // B again
    expect(container.querySelector('.screen-empty')).toBeNull()
    expect(player.loaded.map(indexOf)).toEqual([0, 1, 2, 3, 2, 1, 0])
    expect(shownTitle()).toBe('Song A')
  })

  it('stops with the calm empty message once every song has failed', async () => {
    localStorage.setItem('reminisce-music-order', 'shuffle')
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    const player = await renderMusic()
    for (let i = 0; i < SONGS.length - 1; i += 1) failed(player)
    expect(container.querySelector('.screen-empty')).toBeNull()
    failed(player)
    expect(container.querySelector('.screen-empty')).not.toBeNull()
  })

  it('an unknown stored value plays in order', async () => {
    localStorage.setItem('reminisce-music-order', 'random')
    const player = await renderMusic()
    for (let i = 0; i < 5; i += 1) ended(player)
    expect(player.loaded.map(indexOf)).toEqual([0, 1, 2, 3, 0, 1])
  })
})
