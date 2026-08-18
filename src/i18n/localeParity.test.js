import { describe, expect, it } from 'vitest'
import { en } from './en.js'
import { es } from './es.js'
import { gl } from './gl.js'

// Add new locales to this map as they're added to LanguageContext.jsx's
// LOCALES map, so this test keeps covering every shipped locale.
const otherLocales = { es, gl }

describe('locale key parity', () => {
  const enKeys = Object.keys(en).sort()

  for (const [name, locale] of Object.entries(otherLocales)) {
    it(`${name}.js has exactly the same keys as en.js`, () => {
      expect(Object.keys(locale).sort()).toEqual(enKeys)
    })
  }
})
