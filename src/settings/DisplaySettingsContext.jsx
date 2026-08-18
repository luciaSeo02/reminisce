import { createContext, useContext, useLayoutEffect, useState } from 'react'
import {
  getStoredFontSize,
  getStoredTheme,
  setStoredFontSize,
  setStoredTheme,
} from './displaySettingsStore.js'

// The multiplier applied to the root element's font size via the
// --font-scale custom property (see index.css). Every font-size in the app
// is defined in rem, so this single variable scales all of them at once.
export const FONT_SCALES = {
  normal: 1,
  large: 1.25,
  xlarge: 1.5,
}

const DEFAULT_FONT_SIZE = 'normal'

// Four curated palettes, each a full set of --color-* custom properties
// (see index.css for their defaults and every screen's CSS for usage).
// warm matches the app's original, un-themed colors.
export const THEMES = {
  warm: {
    bg: '#fdfaf4',
    card: '#ffffff',
    border: '#d8cfc0',
    accent: '#a68a5b',
    text: '#1a1a1a',
    accentSoft: '#fbf3e3',
    muted: '#6b6b6b',
  },
  sky: {
    bg: '#eaf2f6',
    card: '#ffffff',
    border: '#bcd3dd',
    accent: '#3d6b7a',
    text: '#16323a',
    accentSoft: '#dbe9ee',
    muted: '#5c7680',
  },
  contrast: {
    bg: '#fafafa',
    card: '#ffffff',
    border: '#1a1a1a',
    accent: '#0b5563',
    text: '#000000',
    accentSoft: '#dbe7e9',
    muted: '#404040',
  },
  sunset: {
    bg: '#fff4ea',
    card: '#ffffff',
    border: '#f0b088',
    accent: '#c9622e',
    text: '#5a2e12',
    accentSoft: '#f8e6db',
    muted: '#8a6a55',
  },
}

// Maps each palette key above to its CSS custom property name.
const THEME_PROPERTIES = {
  bg: '--color-bg',
  card: '--color-card',
  border: '--color-border',
  accent: '--color-accent',
  text: '--color-text',
  accentSoft: '--color-accent-soft',
  muted: '--color-muted',
}

const DEFAULT_THEME = 'warm'

function resolveInitialFontSize() {
  const stored = getStoredFontSize()
  return stored && FONT_SCALES[stored] ? stored : DEFAULT_FONT_SIZE
}

function resolveInitialTheme() {
  const stored = getStoredTheme()
  return stored && THEMES[stored] ? stored : DEFAULT_THEME
}

const DisplaySettingsContext = createContext({
  fontSize: DEFAULT_FONT_SIZE,
  setFontSize: () => {},
  fontSizes: Object.keys(FONT_SCALES),
  theme: DEFAULT_THEME,
  setTheme: () => {},
  themes: Object.keys(THEMES),
})

export function DisplaySettingsProvider({ children }) {
  const [fontSize, setFontSizeState] = useState(resolveInitialFontSize)
  const [theme, setThemeState] = useState(resolveInitialTheme)

  useLayoutEffect(() => {
    document.documentElement.style.setProperty('--font-scale', FONT_SCALES[fontSize])
  }, [fontSize])

  useLayoutEffect(() => {
    const palette = THEMES[theme]
    for (const [key, cssProperty] of Object.entries(THEME_PROPERTIES)) {
      document.documentElement.style.setProperty(cssProperty, palette[key])
    }
  }, [theme])

  function setFontSize(nextFontSize) {
    if (!FONT_SCALES[nextFontSize]) return
    setStoredFontSize(nextFontSize)
    setFontSizeState(nextFontSize)
  }

  function setTheme(nextTheme) {
    if (!THEMES[nextTheme]) return
    setStoredTheme(nextTheme)
    setThemeState(nextTheme)
  }

  const value = {
    fontSize,
    setFontSize,
    fontSizes: Object.keys(FONT_SCALES),
    theme,
    setTheme,
    themes: Object.keys(THEMES),
  }

  return (
    <DisplaySettingsContext.Provider value={value}>
      {children}
    </DisplaySettingsContext.Provider>
  )
}

// Returns { fontSize, setFontSize, fontSizes, theme, setTheme, themes } for
// the caregiver's text size and theme pickers, and applies the current
// choices to every screen.
export function useDisplaySettings() {
  return useContext(DisplaySettingsContext)
}
