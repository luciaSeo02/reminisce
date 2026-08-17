import { createContext, useContext } from 'react'
import { en } from './en.js'

// Add a new locale by importing its file here and adding it to this map.
// No component changes are needed elsewhere.
const LOCALES = { en }

const DEFAULT_LOCALE = 'en'

const LanguageContext = createContext(LOCALES[DEFAULT_LOCALE])

export function LanguageProvider({ locale = DEFAULT_LOCALE, children }) {
  const strings = LOCALES[locale] ?? LOCALES[DEFAULT_LOCALE]
  return (
    <LanguageContext.Provider value={strings}>
      {children}
    </LanguageContext.Provider>
  )
}

// Returns the current locale's string table, e.g. useStrings().homeTitle.
export function useStrings() {
  return useContext(LanguageContext)
}
