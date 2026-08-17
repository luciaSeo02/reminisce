import { createContext, useContext, useState } from 'react'
import { en } from './en.js'
import { es } from './es.js'
import { getStoredLanguage, setStoredLanguage } from './languageStore.js'

// Add a new locale by importing its file here and adding it to this map.
// No component changes are needed elsewhere.
const LOCALES = { en, es }

// Names are shown in the language they name (a language picker should stay
// readable to someone who can't yet read the current UI language), so these
// are deliberately not translated through the strings table.
export const LANGUAGE_NAMES = {
  en: 'English',
  es: 'Español',
}

const DEFAULT_LOCALE = 'en'

// A manual choice, once made, always wins. Otherwise fall back to the
// browser's language if we have a matching locale, then to English.
function resolveInitialLocale() {
  const stored = getStoredLanguage()
  if (stored && LOCALES[stored]) return stored

  const browserLanguage =
    typeof navigator !== 'undefined' && navigator.language ? navigator.language : ''
  const primarySubtag = browserLanguage.split('-')[0].toLowerCase()
  if (LOCALES[primarySubtag]) return primarySubtag

  return DEFAULT_LOCALE
}

const LanguageContext = createContext({
  locale: DEFAULT_LOCALE,
  strings: LOCALES[DEFAULT_LOCALE],
  setLocale: () => {},
  locales: Object.keys(LOCALES),
})

export function LanguageProvider({ children }) {
  const [locale, setLocaleState] = useState(resolveInitialLocale)

  function setLocale(nextLocale) {
    if (!LOCALES[nextLocale]) return
    setStoredLanguage(nextLocale)
    setLocaleState(nextLocale)
  }

  const value = {
    locale,
    strings: LOCALES[locale] ?? LOCALES[DEFAULT_LOCALE],
    setLocale,
    locales: Object.keys(LOCALES),
  }

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  )
}

// Returns the current locale's string table, e.g. useStrings().homeTitle.
export function useStrings() {
  return useContext(LanguageContext).strings
}

// Returns { locale, setLocale, locales } for the caregiver's language picker.
export function useLanguage() {
  const { locale, setLocale, locales } = useContext(LanguageContext)
  return { locale, setLocale, locales }
}
