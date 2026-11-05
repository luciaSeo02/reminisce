// Order in which Music plays the selected songs. Pure functions over a small
// state object { order, position }: `order` holds song indices, `position`
// is where playback is in it. `random` is injectable so tests can script it;
// it must return a number in [0, 1), like Math.random.

function randomInt(random, maxExclusive) {
  // Clamped, so a random function that returns exactly 1 can't index past
  // the end.
  return Math.min(Math.floor(random() * maxExclusive), maxExclusive - 1)
}

function identityOrder(count) {
  return Array.from({ length: count }, (_, index) => index)
}

// Fisher-Yates: every permutation of 0..count-1 is equally likely.
export function shuffleIndices(count, random = Math.random) {
  const order = identityOrder(count)
  for (let i = count - 1; i > 0; i -= 1) {
    const j = randomInt(random, i + 1)
    ;[order[i], order[j]] = [order[j], order[i]]
  }
  return order
}

// A fresh shuffle whose first song is not `avoidFirst` (the song that just
// played), so the end of one round never repeats straight into the next.
// With one song there is nothing else to play, so it repeats.
export function shuffledOrder(count, avoidFirst, random = Math.random) {
  const order = shuffleIndices(count, random)
  if (count > 1 && order[0] === avoidFirst) {
    const swapWith = 1 + randomInt(random, count - 1)
    ;[order[0], order[swapWith]] = [order[swapWith], order[0]]
  }
  return order
}

export function createPlayback(count, playOrder, random = Math.random) {
  const order = playOrder === 'shuffle' ? shuffleIndices(count, random) : identityOrder(count)
  return { order, position: 0 }
}

// In order: the next index, wrapping to the start, exactly (index + 1) %
// count. Shuffle: the next song in the current round; after the last one, a
// new round that does not start with the song that just played.
export function advancePlayback(state, playOrder, random = Math.random) {
  const { order, position } = state
  const nextPosition = position + 1
  if (nextPosition < order.length) {
    return { order, position: nextPosition }
  }
  if (playOrder === 'shuffle') {
    return { order: shuffledOrder(order.length, order[position], random), position: 0 }
  }
  return { order, position: 0 }
}

export function currentSongIndex(state) {
  return state.order[state.position]
}
