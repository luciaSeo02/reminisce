// Picks a target song, excluding excludeTargetId so the same song never
// becomes the target twice in a row (it can still appear as a distractor).
export function pickRound(songs, excludeTargetId) {
  const targetPool = songs.filter((song) => song.videoId !== excludeTargetId)
  const candidates = targetPool.length > 0 ? targetPool : songs
  const target = candidates[Math.floor(Math.random() * candidates.length)]

  const distractorPool = songs.filter((song) => song.videoId !== target.videoId)
  const distractor = distractorPool[Math.floor(Math.random() * distractorPool.length)]

  const options = Math.random() < 0.5 ? [target, distractor] : [distractor, target]
  return { target, options }
}
