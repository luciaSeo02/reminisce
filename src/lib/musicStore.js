const SONGS_KEY = 'reminisce-selected-songs'

export function getSelectedSongs() {
  try {
    const raw = localStorage.getItem(SONGS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveSongs(songs) {
  localStorage.setItem(SONGS_KEY, JSON.stringify(songs))
}

export function addSelectedSong(song) {
  const songs = getSelectedSongs()
  if (songs.some((existing) => existing.videoId === song.videoId)) {
    return songs
  }
  const updated = [...songs, song]
  saveSongs(updated)
  return updated
}

export function removeSelectedSong(videoId) {
  const updated = getSelectedSongs().filter((song) => song.videoId !== videoId)
  saveSongs(updated)
  return updated
}

// Replaces the whole selected-songs list at once. Used by backup restore,
// where the incoming list should fully replace what's saved, not merge with it.
export function replaceSelectedSongs(songs) {
  saveSongs(songs)
  return songs
}

// Saves a new order for the songs already stored. Only the order may
// change: the incoming list must hold exactly the stored songs (same video
// ids, same count), otherwise nothing is written. The stored entries
// themselves are what gets written, in the new order, so their fields stay
// byte for byte the same. Throws if the list does not match or the write
// fails; storage is unchanged in both cases.
export function saveSongOrder(orderedSongs) {
  const stored = getSelectedSongs()
  const byId = new Map(stored.map((song) => [song.videoId, song]))
  const reordered = orderedSongs.map((song) => byId.get(song.videoId))
  const sameSongs =
    reordered.length === stored.length &&
    reordered.every(Boolean) &&
    new Set(reordered).size === stored.length
  if (!sameSongs) {
    throw new Error('The new order does not match the stored songs.')
  }
  return replaceSelectedSongs(reordered)
}
