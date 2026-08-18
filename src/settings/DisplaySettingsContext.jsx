import { createContext, useContext, useLayoutEffect, useState } from 'react'
import { getStoredFontSize, setStoredFontSize } from './displaySettingsStore.js'

// The multiplier applied to the root element's font size via the
// --font-scale custom property (see index.css). Every font-size in the app
// is defined in rem, so this single variable scales all of them at once.
export const FONT_SCALES = {
  normal: 1,
  large: 1.25,
  xlarge: 1.5,
}

const DEFAULT_FONT_SIZE = 'normal'

function resolveInitialFontSize() {
  const stored = getStoredFontSize()
  return stored && FONT_SCALES[stored] ? stored : DEFAULT_FONT_SIZE
}

const DisplaySettingsContext = createContext({
  fontSize: DEFAULT_FONT_SIZE,
  setFontSize: () => {},
  fontSizes: Object.keys(FONT_SCALES),
})

export function DisplaySettingsProvider({ children }) {
  const [fontSize, setFontSizeState] = useState(resolveInitialFontSize)

  useLayoutEffect(() => {
    document.documentElement.style.setProperty('--font-scale', FONT_SCALES[fontSize])
  }, [fontSize])

  function setFontSize(nextFontSize) {
    if (!FONT_SCALES[nextFontSize]) return
    setStoredFontSize(nextFontSize)
    setFontSizeState(nextFontSize)
  }

  const value = {
    fontSize,
    setFontSize,
    fontSizes: Object.keys(FONT_SCALES),
  }

  return (
    <DisplaySettingsContext.Provider value={value}>
      {children}
    </DisplaySettingsContext.Provider>
  )
}

// Returns { fontSize, setFontSize, fontSizes } for the caregiver's text
// size picker, and applies the current choice to every screen.
export function useDisplaySettings() {
  return useContext(DisplaySettingsContext)
}
