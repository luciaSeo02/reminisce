import { describe, expect, it } from 'vitest'
import { pickRound } from './pickRound.js'

const songs = [
  { videoId: '1', title: 'One' },
  { videoId: '2', title: 'Two' },
  { videoId: '3', title: 'Three' },
  { videoId: '4', title: 'Four' },
]

const ROUNDS_TO_SIMULATE = 1000

describe('pickRound', () => {
  it('never picks the same target twice in a row, over many rounds', () => {
    let previousTargetId = null
    for (let i = 0; i < ROUNDS_TO_SIMULATE; i++) {
      const round = pickRound(songs, previousTargetId)
      if (previousTargetId !== null) {
        expect(round.target.videoId).not.toBe(previousTargetId)
      }
      previousTargetId = round.target.videoId
    }
  })

  it('always returns two distinct options, one of which is the target', () => {
    let previousTargetId = null
    for (let i = 0; i < ROUNDS_TO_SIMULATE; i++) {
      const round = pickRound(songs, previousTargetId)

      expect(round.options).toHaveLength(2)
      expect(round.options[0].videoId).not.toBe(round.options[1].videoId)
      expect(round.options.some((option) => option.videoId === round.target.videoId)).toBe(true)

      previousTargetId = round.target.videoId
    }
  })

  it('only ever returns songs from the pool passed in', () => {
    const validIds = new Set(songs.map((song) => song.videoId))
    let previousTargetId = null
    for (let i = 0; i < ROUNDS_TO_SIMULATE; i++) {
      const round = pickRound(songs, previousTargetId)
      for (const option of round.options) {
        expect(validIds.has(option.videoId)).toBe(true)
      }
      previousTargetId = round.target.videoId
    }
  })

  it('falls back to the same song as target when only one is available', () => {
    const single = [{ videoId: 'only', title: 'Only' }]
    const round = pickRound(single, 'only')
    expect(round.target.videoId).toBe('only')
  })
})
