import { describe, expect, it } from 'vitest'
import { insertionLine, moveItem, targetIndexFromPointer } from './reorder.js'

describe('moveItem', () => {
  it('moves an item down', () => {
    expect(moveItem(['a', 'b', 'c', 'd'], 0, 2)).toEqual(['b', 'c', 'a', 'd'])
  })

  it('moves an item up', () => {
    expect(moveItem(['a', 'b', 'c', 'd'], 3, 1)).toEqual(['a', 'd', 'b', 'c'])
  })

  it('returns a copy, never the same array, and leaves the input alone', () => {
    const list = ['a', 'b']
    const same = moveItem(list, 1, 1)
    expect(same).toEqual(['a', 'b'])
    expect(same).not.toBe(list)
    moveItem(list, 0, 1)
    expect(list).toEqual(['a', 'b'])
  })

  it('keeps the very same item objects', () => {
    const a = { id: 'a' }
    const b = { id: 'b' }
    const moved = moveItem([a, b], 0, 1)
    expect(moved[0]).toBe(b)
    expect(moved[1]).toBe(a)
  })
})

describe('targetIndexFromPointer', () => {
  // Four rows, 100 px tall, centers at 50, 150, 250, 350.
  const midpoints = [50, 150, 250, 350]

  it('stays in place while the pointer is inside its own slot', () => {
    expect(targetIndexFromPointer(midpoints, 1, 120)).toBe(1)
    expect(targetIndexFromPointer(midpoints, 1, 240)).toBe(1)
  })

  it('moves down once the pointer passes the next row center', () => {
    expect(targetIndexFromPointer(midpoints, 1, 260)).toBe(2)
    expect(targetIndexFromPointer(midpoints, 1, 900)).toBe(3)
  })

  it('reaches the first and last positions exactly at the end row centers', () => {
    expect(targetIndexFromPointer(midpoints, 0, 350)).toBe(3)
    expect(targetIndexFromPointer(midpoints, 3, 50)).toBe(0)
  })

  it('moves up once the pointer passes the previous row center', () => {
    expect(targetIndexFromPointer(midpoints, 2, 140)).toBe(1)
    expect(targetIndexFromPointer(midpoints, 2, -50)).toBe(0)
  })
})

describe('insertionLine', () => {
  it('is hidden when the row would not move', () => {
    expect(insertionLine(2, 2)).toBeNull()
  })

  it('goes before the target row when moving up', () => {
    expect(insertionLine(3, 1)).toEqual({ index: 1, side: 'before' })
  })

  it('goes after the target row when moving down', () => {
    expect(insertionLine(0, 2)).toEqual({ index: 2, side: 'after' })
  })
})
