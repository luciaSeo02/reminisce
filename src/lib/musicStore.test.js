import { beforeEach, describe, expect, it } from 'vitest'
import { addSelectedSong, getSelectedSongs, removeSelectedSong } from './musicStore.js'

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
})
