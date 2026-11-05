// Pure ordering helpers for SortableList. They never touch the items
// themselves, only the array positions, so a caller's stored objects come
// back with exactly the same fields and values.

export function moveItem(list, from, to) {
  if (from === to) return list.slice()
  const next = list.slice()
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

// Where the dragged row would land, as its final index in the list.
// `midpoints` are the vertical centers of every row as laid out before the
// drag started (the other rows never move during a drag). The answer is how
// many of the other rows sit above the pointer.
export function targetIndexFromPointer(midpoints, from, pointerY) {
  let count = 0
  for (let index = 0; index < midpoints.length; index += 1) {
    if (index !== from && midpoints[index] < pointerY) count += 1
  }
  return count
}

// Which side of which row the insertion line is drawn on, or null when the
// row would land where it already is.
export function insertionLine(from, to) {
  if (to === from) return null
  return to < from ? { index: to, side: 'before' } : { index: to, side: 'after' }
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}
