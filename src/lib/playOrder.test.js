import { describe, expect, it } from 'vitest'
import {
  advancePlayback,
  createPlayback,
  currentSongIndex,
  shuffleIndices,
  shuffledOrder,
} from './playOrder.js'

// Deterministic stand-in for Math.random (mulberry32), so failures are
// reproducible.
function seededRandom(seed) {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Returns the given values in turn, then repeats the last one.
function scriptedRandom(values) {
  let i = 0
  return () => values[Math.min(i++, values.length - 1)]
}

function playSequence(count, playOrder, steps, random) {
  let state = createPlayback(count, playOrder, random)
  const played = [currentSongIndex(state)]
  for (let i = 1; i < steps; i += 1) {
    state = advancePlayback(state, playOrder, random)
    played.push(currentSongIndex(state))
  }
  return played
}

const sorted = (list) => [...list].sort((a, b) => a - b)
const range = (count) => Array.from({ length: count }, (_, i) => i)

describe('shuffleIndices', () => {
  it('returns a permutation of every index', () => {
    for (const count of [0, 1, 2, 3, 10, 57]) {
      expect(sorted(shuffleIndices(count, seededRandom(count)))).toEqual(range(count))
    }
  })

  it('is a real Fisher-Yates shuffle: every order of 3 songs shows up about equally', () => {
    const random = seededRandom(42)
    const counts = new Map()
    const runs = 60000
    for (let i = 0; i < runs; i += 1) {
      const key = shuffleIndices(3, random).join('')
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    expect(counts.size).toBe(6)
    for (const value of counts.values()) {
      expect(value / runs).toBeGreaterThan(0.15)
      expect(value / runs).toBeLessThan(0.18)
    }
  })

  it('does not run past the end when random returns exactly 1', () => {
    expect(sorted(shuffleIndices(5, () => 1))).toEqual(range(5))
  })
})

describe('shuffledOrder', () => {
  it('never starts with the song to avoid, even when random tries to force it', () => {
    // A constant random value gives a fixed shuffle (near 1 it is the
    // identity order), so trying every song as the one to avoid makes sure
    // the shuffle itself lands on it at least once.
    for (const value of [0, 0.999999]) {
      for (let avoid = 0; avoid < 4; avoid += 1) {
        const order = shuffledOrder(4, avoid, () => value)
        expect(order[0]).not.toBe(avoid)
        expect(sorted(order)).toEqual(range(4))
      }
    }
  })

  it('with one song, the only song plays again', () => {
    expect(shuffledOrder(1, 0, Math.random)).toEqual([0])
  })
})

describe('advancePlayback in shuffle mode', () => {
  it('plays every song once in each round before any repeats', () => {
    const count = 7
    const played = playSequence(count, 'shuffle', count * 20, seededRandom(7))
    for (let round = 0; round < 20; round += 1) {
      const slice = played.slice(round * count, (round + 1) * count)
      expect(sorted(slice)).toEqual(range(count))
    }
  })

  it('never plays the same song twice in a row across round boundaries', () => {
    for (const count of [2, 3, 5]) {
      const played = playSequence(count, 'shuffle', count * 50, seededRandom(count * 13))
      for (let i = 1; i < played.length; i += 1) {
        expect(played[i]).not.toBe(played[i - 1])
      }
    }
  })

  it('avoids the boundary repeat even when the new round would start with it', () => {
    // Values near 1 make Fisher-Yates keep the identity order, so both
    // rounds come out as [0, 1, 2] and round two would start where round
    // one ended unless the boundary rule steps in.
    const random = scriptedRandom([0.999999])
    let state = createPlayback(3, 'shuffle', random)
    expect(state.order).toEqual([0, 1, 2])
    state = advancePlayback(state, 'shuffle', random)
    state = advancePlayback(state, 'shuffle', random)
    expect(currentSongIndex(state)).toBe(2)
    state = advancePlayback(state, 'shuffle', random)
    expect(state.position).toBe(0)
    expect(currentSongIndex(state)).not.toBe(2)
    expect(sorted(state.order)).toEqual([0, 1, 2])
  })

  it('with two songs, alternates', () => {
    const played = playSequence(2, 'shuffle', 10, seededRandom(3))
    for (let i = 2; i < played.length; i += 1) {
      expect(played[i]).toBe(played[i - 2])
    }
  })

  it('with one song, repeats it', () => {
    expect(playSequence(1, 'shuffle', 5, seededRandom(1))).toEqual([0, 0, 0, 0, 0])
  })
})

describe('advancePlayback in order', () => {
  it('is exactly (index + 1) % count, starting at 0, and never calls random', () => {
    const random = () => {
      throw new Error('in-order mode must not use random')
    }
    for (const count of [1, 2, 5]) {
      const played = playSequence(count, 'in-order', count * 3 + 1, random)
      let index = 0
      const expected = [index]
      for (let i = 1; i < played.length; i += 1) {
        index = (index + 1) % count
        expected.push(index)
      }
      expect(played).toEqual(expected)
    }
  })

  it('treats any mode other than "shuffle" as in order', () => {
    expect(playSequence(3, undefined, 5)).toEqual([0, 1, 2, 0, 1])
    expect(playSequence(3, 'random', 5)).toEqual([0, 1, 2, 0, 1])
  })
})
