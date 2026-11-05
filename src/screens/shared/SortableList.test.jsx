// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import SortableList from './SortableList.jsx'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

const ROW_HEIGHT = 100

const announcements = {
  pickedUp: (item, position, total) => `Picked up ${item.name}, ${position} of ${total}`,
  moved: (item, position, total) => `${item.name} at ${position} of ${total}`,
  dropped: (item, position, total) => `Dropped ${item.name} at ${position} of ${total}`,
  cancelled: (item) => `Cancelled, ${item.name} unchanged`,
}

let container
let root
let onReorder
let items

function render(list = items) {
  act(() => {
    root.render(
      <SortableList
        items={list}
        getKey={(item) => item.id}
        renderItem={(item, index) => (
          <span className="row-text">
            {index + 1}. {item.name}
          </span>
        )}
        getHandleLabel={(item) => `Move ${item.name}`}
        instructions="Press Space to pick up."
        announcements={announcements}
        onReorder={onReorder}
      />,
    )
  })
}

function handles() {
  return [...container.querySelectorAll('.sortable-handle')]
}

function rowTexts() {
  return [...container.querySelectorAll('.row-text')].map((node) => node.textContent)
}

function liveMessage() {
  return container.querySelector('[aria-live]').textContent
}

function key(target, name) {
  act(() => {
    target.dispatchEvent(new KeyboardEvent('keydown', { key: name, bubbles: true }))
  })
}

// jsdom has no layout and no PointerEvent constructor. React only reads the
// event type and clientY here, so a MouseEvent with the pointer type name
// stands in, and each row reports a 100 px tall box stacked from the top.
function pointer(target, type, clientY) {
  act(() => {
    target.dispatchEvent(new MouseEvent(type, { bubbles: true, clientY }))
  })
}

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  onReorder = vi.fn()
  items = [
    { id: 'a', name: 'A' },
    { id: 'b', name: 'B' },
    { id: 'c', name: 'C' },
  ]
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 1)
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {})
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function () {
    const rows = [...container.querySelectorAll('.sortable-item')]
    const index = rows.indexOf(this)
    const top = Math.max(index, 0) * ROW_HEIGHT
    return { top, bottom: top + ROW_HEIGHT, height: ROW_HEIGHT, left: 0, right: 0, width: 0 }
  })
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
  vi.restoreAllMocks()
})

describe('SortableList', () => {
  it('labels each handle and links the keyboard instructions', () => {
    render()
    const handle = handles()[1]
    expect(handle.getAttribute('aria-label')).toBe('Move B')
    const description = document.getElementById(handle.getAttribute('aria-describedby'))
    expect(description.textContent).toBe('Press Space to pick up.')
  })

  it('reorders with the keyboard: Space, arrow down, Space', () => {
    render()
    const handle = handles()[0]
    key(handle, ' ')
    expect(liveMessage()).toBe('Picked up A, 1 of 3')
    key(handle, 'ArrowDown')
    expect(liveMessage()).toBe('A at 2 of 3')
    expect(onReorder).not.toHaveBeenCalled()
    key(handle, ' ')
    expect(onReorder).toHaveBeenCalledTimes(1)
    expect(onReorder.mock.calls[0][0].map((item) => item.id)).toEqual(['b', 'a', 'c'])
    expect(liveMessage()).toBe('Dropped A at 2 of 3')
  })

  it('clamps arrow keys at the ends of the list', () => {
    render()
    const handle = handles()[2]
    key(handle, ' ')
    key(handle, 'ArrowDown')
    expect(liveMessage()).toBe('C at 3 of 3')
    key(handle, ' ')
    expect(onReorder).not.toHaveBeenCalled()
  })

  it('Escape cancels a keyboard move without calling onReorder', () => {
    render()
    const handle = handles()[0]
    key(handle, ' ')
    key(handle, 'ArrowDown')
    key(handle, 'Escape')
    expect(onReorder).not.toHaveBeenCalled()
    expect(liveMessage()).toBe('Cancelled, A unchanged')
    expect(container.querySelector('.sortable-item-lifted')).toBeNull()
  })

  it('shows the insertion line after the target row while moving down', () => {
    render()
    const handle = handles()[0]
    key(handle, ' ')
    key(handle, 'ArrowDown')
    const rows = container.querySelectorAll('.sortable-item')
    expect(rows[0].classList.contains('sortable-item-lifted')).toBe(true)
    expect(rows[1].classList.contains('sortable-line-after')).toBe(true)
  })

  it('a plain tap on the handle does nothing', () => {
    render()
    const handle = handles()[0]
    pointer(handle, 'pointerdown', 50)
    pointer(handle, 'pointermove', 53)
    pointer(handle, 'pointerup', 53)
    expect(container.querySelector('.sortable-item-lifted')).toBeNull()
    expect(onReorder).not.toHaveBeenCalled()
    expect(liveMessage()).toBe('')
  })

  it('drags with a pointer and calls onReorder once, on drop', () => {
    render()
    const handle = handles()[0]
    pointer(handle, 'pointerdown', 50)
    pointer(handle, 'pointermove', 120)
    expect(container.querySelector('.sortable-item-lifted')).not.toBeNull()
    pointer(handle, 'pointermove', 270)
    expect(onReorder).not.toHaveBeenCalled()
    pointer(handle, 'pointerup', 270)
    expect(onReorder).toHaveBeenCalledTimes(1)
    expect(onReorder.mock.calls[0][0].map((item) => item.id)).toEqual(['b', 'c', 'a'])
  })

  it('pointercancel leaves the original order in place', () => {
    render()
    const handle = handles()[0]
    pointer(handle, 'pointerdown', 50)
    pointer(handle, 'pointermove', 270)
    pointer(handle, 'pointercancel', 270)
    expect(onReorder).not.toHaveBeenCalled()
    expect(container.querySelector('.sortable-item-lifted')).toBeNull()
    expect(rowTexts()).toEqual(['1. A', '2. B', '3. C'])
    expect(liveMessage()).toBe('Cancelled, A unchanged')
  })

  it('prevents the long-press context menu on the handle', () => {
    render()
    const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true })
    act(() => {
      handles()[0].dispatchEvent(event)
    })
    expect(event.defaultPrevented).toBe(true)
  })

  it('does not announce a drop when onReorder reports the order was not kept', () => {
    onReorder = vi.fn(() => false)
    render()
    const handle = handles()[0]
    key(handle, ' ')
    key(handle, 'ArrowDown')
    key(handle, ' ')
    expect(onReorder).toHaveBeenCalledTimes(1)
    expect(liveMessage()).toBe('A at 2 of 3')
  })
})
