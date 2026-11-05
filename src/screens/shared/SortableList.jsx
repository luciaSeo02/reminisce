import { useEffect, useId, useRef, useState } from 'react'
import { clamp, insertionLine, moveItem, targetIndexFromPointer } from '../../lib/reorder.js'
import './SortableList.css'

// A plain tap on the handle must do nothing, so a drag only starts once the
// pointer has moved this far.
const DRAG_THRESHOLD_PX = 6
// Auto scroll while the pointer is this close to the top or bottom of the
// viewport, faster the closer it gets.
const EDGE_PX = 80
const MAX_SCROLL_STEP_PX = 18

function GripIcon() {
  return (
    <svg viewBox="0 0 20 28" fill="currentColor" aria-hidden="true" focusable="false">
      <circle cx="6" cy="5" r="2.4" />
      <circle cx="14" cy="5" r="2.4" />
      <circle cx="6" cy="14" r="2.4" />
      <circle cx="14" cy="14" r="2.4" />
      <circle cx="6" cy="23" r="2.4" />
      <circle cx="14" cy="23" r="2.4" />
    </svg>
  )
}

// A vertical list the caregiver can reorder by a handle on each row, with
// touch, mouse or keyboard. Built on Pointer Events, not the HTML5 drag and
// drop API, which is unreliable on touch screens.
//
// The list never changes `items` by itself. While dragging, only the lifted
// row and an insertion line move. On drop it calls onReorder once with the
// whole list in the new order. onReorder may return false to say the new
// order could not be kept (for example a failed save), and then no "dropped"
// announcement is made.
//
// Props:
// - items, getKey(item): the list and a stable key for each item.
// - renderItem(item, index): the row content shown after the handle.
// - getHandleLabel(item, index): accessible name of the handle.
// - instructions: how to reorder with the keyboard, read by screen readers.
// - announcements: { pickedUp, moved, dropped, cancelled }, each called
//   with (item, position, total) where position starts at 1.
// - itemClassName: class for each row, so the consumer styles the row.
function SortableList({
  items,
  getKey,
  renderItem,
  getHandleLabel,
  instructions,
  announcements,
  onReorder,
  className = '',
  itemClassName = '',
}) {
  const [drag, setDrag] = useState(null)
  const [message, setMessage] = useState('')
  const dragRef = useRef(null)
  const pointerRef = useRef(null)
  const frameRef = useRef(0)
  const listRef = useRef(null)
  const rowRefs = useRef(new Map())
  const handleRefs = useRef(new Map())
  const refocusKeyRef = useRef(null)
  const instructionsId = useId()

  // The ref mirrors the state so event handlers (blur, pointer, animation
  // frames) always see the current drag, not the one from their render.
  function updateDrag(next) {
    dragRef.current = typeof next === 'function' ? next(dragRef.current) : next
    setDrag(dragRef.current)
  }

  function announce(name, item, index) {
    setMessage(announcements[name](item, index + 1, items.length))
  }

  function stopAutoScroll() {
    cancelAnimationFrame(frameRef.current)
    frameRef.current = 0
  }

  useEffect(() => stopAutoScroll, [])

  // After a drop React moves the row's element, which can drop focus in
  // some browsers. Put it back on the handle the caregiver was using.
  useEffect(() => {
    const key = refocusKeyRef.current
    if (key == null) return
    refocusKeyRef.current = null
    handleRefs.current.get(key)?.focus()
  }, [items])

  // Keep the destination visible when moving with the keyboard.
  useEffect(() => {
    if (drag?.mode !== 'keyboard') return
    const targetKey = getKey(items[drag.to])
    rowRefs.current.get(targetKey)?.scrollIntoView?.({ block: 'nearest' })
  }, [drag?.mode, drag?.to])

  function cancel() {
    const current = dragRef.current
    if (!current) return
    updateDrag(null)
    const item = items[current.from]
    if (item) announce('cancelled', item, current.from)
  }

  function drop() {
    const current = dragRef.current
    if (!current) return
    updateDrag(null)
    const { from, to, key } = current
    const item = items[from]
    // The list changed under the drag (it should not, but never write an
    // order computed from a stale list).
    if (!item || getKey(item) !== key) return
    if (to === from) {
      announce('dropped', item, from)
      return
    }
    refocusKeyRef.current = key
    const kept = onReorder(moveItem(items, from, to))
    if (kept !== false) announce('dropped', item, to)
  }

  // Pointer dragging. Rows other than the lifted one never move, so their
  // centers are measured once, in page coordinates, when the drag starts.
  function updatePointerDrag() {
    const pointer = pointerRef.current
    if (!pointer?.active) return
    const { midpoints, from } = pointer
    // The lifted row stays within the list. A transformed row still grows
    // the page's scrollable area, so without this limit auto scroll would
    // keep following it past the end of the list.
    const offset = clamp(
      pointer.clientY + window.scrollY - (pointer.startClientY + pointer.startScrollY),
      midpoints[0] - midpoints[from],
      midpoints[midpoints.length - 1] - midpoints[from],
    )
    const rowCenter = midpoints[from] + offset
    const to = targetIndexFromPointer(midpoints, from, rowCenter)
    if (to !== pointer.to) {
      pointer.to = to
      announce('moved', items[pointer.from], to)
    }
    updateDrag((current) => current && { ...current, offset, to })
  }

  function autoScrollFrame() {
    const pointer = pointerRef.current
    if (!pointer?.active) return
    const height = window.innerHeight
    let step = 0
    if (pointer.clientY < EDGE_PX) {
      step = -Math.ceil(MAX_SCROLL_STEP_PX * Math.min(1, (EDGE_PX - pointer.clientY) / EDGE_PX))
    } else if (pointer.clientY > height - EDGE_PX) {
      step = Math.ceil(MAX_SCROLL_STEP_PX * Math.min(1, (pointer.clientY - (height - EDGE_PX)) / EDGE_PX))
    }
    // Only scroll while there is more of the list in that direction.
    const listRect = listRef.current?.getBoundingClientRect()
    if (listRect && ((step > 0 && listRect.bottom <= height) || (step < 0 && listRect.top >= 0))) {
      step = 0
    }
    if (step !== 0) window.scrollBy(0, step)
    // Also catches scrolling by other means (a mouse wheel) during a drag.
    if (window.scrollY !== pointer.lastScrollY) {
      pointer.lastScrollY = window.scrollY
      updatePointerDrag()
    }
    frameRef.current = requestAnimationFrame(autoScrollFrame)
  }

  function handlePointerDown(event, index, key) {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    if (dragRef.current || pointerRef.current) return
    event.currentTarget.setPointerCapture?.(event.pointerId)
    pointerRef.current = {
      pointerId: event.pointerId,
      key,
      from: index,
      to: index,
      startClientY: event.clientY,
      startScrollY: window.scrollY,
      lastScrollY: window.scrollY,
      clientY: event.clientY,
      midpoints: null,
      active: false,
    }
  }

  function handlePointerMove(event) {
    const pointer = pointerRef.current
    if (!pointer || event.pointerId !== pointer.pointerId) return
    pointer.clientY = event.clientY
    if (!pointer.active) {
      if (Math.abs(event.clientY - pointer.startClientY) < DRAG_THRESHOLD_PX) return
      pointer.midpoints = items.map((item) => {
        const rect = rowRefs.current.get(getKey(item))?.getBoundingClientRect()
        return rect ? rect.top + window.scrollY + rect.height / 2 : 0
      })
      pointer.active = true
      updateDrag({ key: pointer.key, from: pointer.from, to: pointer.from, mode: 'pointer', offset: 0 })
      announce('pickedUp', items[pointer.from], pointer.from)
      frameRef.current = requestAnimationFrame(autoScrollFrame)
    }
    updatePointerDrag()
  }

  function handlePointerUp(event) {
    const pointer = pointerRef.current
    if (!pointer || event.pointerId !== pointer.pointerId) return
    pointerRef.current = null
    stopAutoScroll()
    if (pointer.active) drop()
  }

  // The browser took the pointer away (a system gesture, an incoming call,
  // the element losing capture). Nothing was written yet, so cancelling is
  // enough to leave the original order in place.
  function handlePointerCancel(event) {
    const pointer = pointerRef.current
    if (!pointer || event.pointerId !== pointer.pointerId) return
    pointerRef.current = null
    stopAutoScroll()
    if (pointer.active) cancel()
  }

  function handleKeyDown(event, index, key) {
    const current = dragRef.current
    if (current?.mode === 'pointer') {
      if (event.key === 'Escape') {
        event.preventDefault()
        pointerRef.current = null
        stopAutoScroll()
        cancel()
      }
      return
    }
    const isSelect = event.key === ' ' || event.key === 'Enter'
    if (!current) {
      if (!isSelect) return
      event.preventDefault()
      updateDrag({ key, from: index, to: index, mode: 'keyboard', offset: 0 })
      announce('pickedUp', items[index], index)
      return
    }
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault()
      const step = event.key === 'ArrowUp' ? -1 : 1
      const to = clamp(current.to + step, 0, items.length - 1)
      updateDrag({ ...current, to })
      announce('moved', items[current.from], to)
    } else if (isSelect) {
      event.preventDefault()
      drop()
    } else if (event.key === 'Escape') {
      event.preventDefault()
      cancel()
    }
  }

  function handleBlur() {
    if (dragRef.current?.mode === 'keyboard') cancel()
  }

  const line = drag ? insertionLine(drag.from, drag.to) : null

  return (
    <>
      <p id={instructionsId} hidden>
        {instructions}
      </p>
      <ul ref={listRef} className={`sortable-list ${className}`.trim()}>
        {items.map((item, index) => {
          const key = getKey(item)
          const lifted = drag?.key === key
          const classes = ['sortable-item', itemClassName]
          if (lifted) classes.push('sortable-item-lifted')
          if (line?.index === index) classes.push(`sortable-line-${line.side}`)
          const style = lifted ? { '--sortable-offset': `${drag.offset}px` } : undefined
          return (
            <li
              key={key}
              ref={(element) => {
                if (element) rowRefs.current.set(key, element)
                else rowRefs.current.delete(key)
              }}
              className={classes.filter(Boolean).join(' ')}
              style={style}
            >
              <button
                type="button"
                ref={(element) => {
                  if (element) handleRefs.current.set(key, element)
                  else handleRefs.current.delete(key)
                }}
                className="sortable-handle"
                aria-label={getHandleLabel(item, index)}
                aria-describedby={instructionsId}
                onPointerDown={(event) => handlePointerDown(event, index, key)}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerCancel}
                onLostPointerCapture={handlePointerCancel}
                onKeyDown={(event) => handleKeyDown(event, index, key)}
                onBlur={handleBlur}
                onContextMenu={(event) => event.preventDefault()}
              >
                <GripIcon />
              </button>
              {renderItem(item, index)}
            </li>
          )
        })}
      </ul>
      <p className="sortable-visually-hidden" aria-live="assertive" aria-atomic="true">
        {message}
      </p>
    </>
  )
}

export default SortableList
