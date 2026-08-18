const FONT_SIZE_KEY = 'reminisce-font-size'
const THEME_KEY = 'reminisce-theme'

export function getStoredFontSize() {
  return localStorage.getItem(FONT_SIZE_KEY)
}

export function setStoredFontSize(fontSize) {
  localStorage.setItem(FONT_SIZE_KEY, fontSize)
}

export function getStoredTheme() {
  return localStorage.getItem(THEME_KEY)
}

export function setStoredTheme(theme) {
  localStorage.setItem(THEME_KEY, theme)
}
