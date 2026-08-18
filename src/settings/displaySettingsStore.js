const FONT_SIZE_KEY = 'reminisce-font-size'

export function getStoredFontSize() {
  return localStorage.getItem(FONT_SIZE_KEY)
}

export function setStoredFontSize(fontSize) {
  localStorage.setItem(FONT_SIZE_KEY, fontSize)
}
