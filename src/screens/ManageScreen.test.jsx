// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ManageScreen from './ManageScreen.jsx'
import { setStoredPin } from '../lib/managePin.js'
import { unlock } from '../lib/manageUnlock.js'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

const SONGS = ['a', 'b', 'c'].map((id) => ({
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
  localStorage.setItem('reminisce-selected-songs', JSON.stringify(SONGS))
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
  vi.restoreAllMocks()
})

async function renderManage() {
  await act(async () => {
    root.render(<ManageScreen />)
  })
}

// Unmounts and mounts again, reading everything from storage, as a reload
// does.
async function reload() {
  act(() => root.unmount())
  root = createRoot(container)
  await renderManage()
}

function playOrderButton(label) {
  const group = container.querySelector('[aria-labelledby="manage-play-order-label"]')
  return [...group.querySelectorAll('button')].find((node) => node.textContent === label)
}

const handles = () => container.querySelectorAll('.sortable-handle')
const badges = () => container.querySelectorAll('.manage-song-position')

describe('Settings play order control', () => {
  it('starts on "In order" with handles and badges when nothing is saved', async () => {
    await renderManage()
    expect(playOrderButton('In order').getAttribute('aria-pressed')).toBe('true')
    expect(playOrderButton('Shuffle').getAttribute('aria-pressed')).toBe('false')
    expect(handles()).toHaveLength(SONGS.length)
    expect(badges()).toHaveLength(SONGS.length)
    expect(localStorage.getItem('reminisce-music-order')).toBeNull()
  })

  it('switching to Shuffle saves it, hides handles and badges, and survives a reload', async () => {
    const songsBefore = localStorage.getItem('reminisce-selected-songs')
    await renderManage()
    act(() => playOrderButton('Shuffle').click())

    expect(localStorage.getItem('reminisce-music-order')).toBe('shuffle')
    expect(handles()).toHaveLength(0)
    expect(badges()).toHaveLength(0)
    expect(container.textContent).toContain('the list order is not used')
    expect(container.querySelectorAll('.manage-song-list .manage-song')).toHaveLength(SONGS.length)

    await reload()
    expect(playOrderButton('Shuffle').getAttribute('aria-pressed')).toBe('true')
    expect(handles()).toHaveLength(0)

    act(() => playOrderButton('In order').click())
    expect(localStorage.getItem('reminisce-music-order')).toBe('in-order')
    expect(handles()).toHaveLength(SONGS.length)

    await reload()
    expect(playOrderButton('In order').getAttribute('aria-pressed')).toBe('true')
    expect(localStorage.getItem('reminisce-selected-songs')).toBe(songsBefore)
  })

  it('removing a song works in shuffle mode', async () => {
    localStorage.setItem('reminisce-music-order', 'shuffle')
    await renderManage()
    const removeButtons = container.querySelectorAll('.manage-song-list .manage-row-button')
    act(() => removeButtons[1].click())
    expect(JSON.parse(localStorage.getItem('reminisce-selected-songs'))).toEqual([
      SONGS[0],
      SONGS[2],
    ])
  })
})
