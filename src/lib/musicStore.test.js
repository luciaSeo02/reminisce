import { beforeEach, describe, expect, it } from 'vitest'
import {
  addSelectedSong,
  getSelectedSongs,
  removeSelectedSong,
  replaceSelectedSongs,
  saveSongOrder,
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
