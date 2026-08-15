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
