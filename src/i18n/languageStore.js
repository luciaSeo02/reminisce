const LANGUAGE_KEY = 'reminisce-language'

export function getStoredLanguage() {
  return localStorage.getItem(LANGUAGE_KEY)
}

export function setStoredLanguage(locale) {
  localStorage.setItem(LANGUAGE_KEY, locale)
}
