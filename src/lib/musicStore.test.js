import { beforeEach, describe, expect, it } from 'vitest'
import {
  addSelectedSong,
  getSelectedSongs,
  removeSelectedSong,
  replaceSelectedSongs,
  saveSongOrder,
  getStoredPlayOrder,
  setStoredPlayOrder,
  clearStoredPlayOrder,
} from './musicStore.js'
import { moveItem } from './reorder.js'

// musicStore reads/writes localStorage directly (no injected dependency),
// so tests stand in a minimal in-memory implementation before each run.
function createMemoryStorage() {
  const store = new Map()
  return {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear(),
  }
}

beforeEach(() => {
  global.localStorage = createMemoryStorage()
})

describe('musicStore', () => {
  it('starts with no songs selected', () => {
    expect(getSelectedSongs()).toEqual([])
  })

  it('adds a song', () => {
    const song = { videoId: 'a', title: 'Song A' }
    const updated = addSelectedSong(song)
    expect(updated).toEqual([song])
    expect(getSelectedSongs()).toEqual([song])
  })

  it('dedupes by videoId, keeping the first entry', () => {
    addSelectedSong({ videoId: 'a', title: 'Song A' })
    const updated = addSelectedSong({ videoId: 'a', title: 'Song A (duplicate)' })

    expect(updated).toHaveLength(1)
    expect(updated[0].title).toBe('Song A')
  })

  it('removes a song by videoId', () => {
    addSelectedSong({ videoId: 'a', title: 'Song A' })
    addSelectedSong({ videoId: 'b', title: 'Song B' })

    const updated = removeSelectedSong('a')

    expect(updated).toEqual([{ videoId: 'b', title: 'Song B' }])
    expect(getSelectedSongs()).toEqual([{ videoId: 'b', title: 'Song B' }])
  })

  it('removing a videoId that is not present is a no-op', () => {
    addSelectedSong({ videoId: 'a', title: 'Song A' })
    const updated = removeSelectedSong('does-not-exist')
    expect(updated).toEqual([{ videoId: 'a', title: 'Song A' }])
  })

  describe('saveSongOrder', () => {
    const songs = [
      { videoId: 'a', title: 'Song A', thumbnailUrl: 'https://i.ytimg.com/a.jpg' },
      { videoId: 'b', title: 'Song &amp; B', thumbnailUrl: null },
      { videoId: 'c', title: 'Song C', thumbnailUrl: 'https://i.ytimg.com/c.jpg' },
    ]

    it('changes only the order: same songs, same fields, same values', () => {
      replaceSelectedSongs(songs)
      const before = JSON.parse(localStorage.getItem('reminisce-selected-songs'))

      saveSongOrder(moveItem(getSelectedSongs(), 0, 2))

      const after = JSON.parse(localStorage.getItem('reminisce-selected-songs'))
      expect(after.map((song) => song.videoId)).toEqual(['b', 'c', 'a'])
      expect(after).toHaveLength(before.length)
      for (const song of after) {
        const original = before.find((entry) => entry.videoId === song.videoId)
        expect(song).toStrictEqual(original)
        expect(Object.keys(song)).toEqual(Object.keys(original))
      }
    })

    it('keeps the new order when the list is read again, as after a reload', () => {
      replaceSelectedSongs(songs)
      saveSongOrder(moveItem(getSelectedSongs(), 2, 0))
      expect(getSelectedSongs().map((song) => song.videoId)).toEqual(['c', 'a', 'b'])
    })

    it('writes the stored entries, not whatever fields the caller passed', () => {
      replaceSelectedSongs(songs)
      saveSongOrder([
        { videoId: 'c', title: 'Changed', extra: true },
        { videoId: 'a' },
        { videoId: 'b' },
      ])
      expect(getSelectedSongs()).toStrictEqual([songs[2], songs[0], songs[1]])
    })

    it('refuses a list that adds, drops or repeats a song, and writes nothing', () => {
      replaceSelectedSongs(songs)
      const stored = localStorage.getItem('reminisce-selected-songs')
      expect(() => saveSongOrder([songs[0], songs[1]])).toThrow()
      expect(() => saveSongOrder([...songs, { videoId: 'd', title: 'D' }])).toThrow()
      expect(() => saveSongOrder([songs[0], songs[0], songs[1]])).toThrow()
      expect(localStorage.getItem('reminisce-selected-songs')).toBe(stored)
    })

    it('throws and leaves storage unchanged when the write fails', () => {
      replaceSelectedSongs(songs)
      const stored = localStorage.getItem('reminisce-selected-songs')
      localStorage.setItem = () => {
        throw new Error('QuotaExceededError')
      }
      expect(() => saveSongOrder(moveItem(songs, 0, 1))).toThrow()
      expect(localStorage.getItem('reminisce-selected-songs')).toBe(stored)
    })
  })
})

describe('play order setting', () => {
  it('is "in-order" when the key has never been saved', () => {
    expect(localStorage.getItem('reminisce-music-order')).toBeNull()
    expect(getStoredPlayOrder()).toBe('in-order')
  })

  it('reads any value other than "shuffle" as "in-order"', () => {
    for (const value of ['', 'random', 'SHUFFLE', '"shuffle"', 'true']) {
      localStorage.setItem('reminisce-music-order', value)
      expect(getStoredPlayOrder()).toBe('in-order')
    }
  })

  it('falls back to "in-order" when storage cannot be read', () => {
    global.localStorage = {
      getItem: () => {
        throw new Error('blocked')
      },
    }
    expect(getStoredPlayOrder()).toBe('in-order')
  })

  it('persists "shuffle" across a fresh read, as after a reload', () => {
    setStoredPlayOrder('shuffle')
    expect(localStorage.getItem('reminisce-music-order')).toBe('shuffle')
    expect(getStoredPlayOrder()).toBe('shuffle')
    setStoredPlayOrder('in-order')
    expect(getStoredPlayOrder()).toBe('in-order')
  })

  it('refuses to write an unknown value', () => {
    expect(() => setStoredPlayOrder('random')).toThrow()
    expect(localStorage.getItem('reminisce-music-order')).toBeNull()
  })

  it('clearing removes the key', () => {
    setStoredPlayOrder('shuffle')
    clearStoredPlayOrder()
    expect(localStorage.getItem('reminisce-music-order')).toBeNull()
  })

  it('does not touch the songs key', () => {
    replaceSelectedSongs([{ videoId: 'a', title: 'Song A' }])
    const before = localStorage.getItem('reminisce-selected-songs')
    setStoredPlayOrder('shuffle')
    expect(localStorage.getItem('reminisce-selected-songs')).toBe(before)
  })
})
