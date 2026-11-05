import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// content/ is Vite's publicDir, so "/photos/photo-1.svg" in a manifest is
// served from content/photos/photo-1.svg. This test lives in src/ rather
// than next to the manifests because anything in content/ ships in the build.
const CONTENT_DIR = fileURLToPath(new URL('../../content/', import.meta.url))
const PHOTOS_DIR = join(CONTENT_DIR, 'photos')

// Keep in sync with the LOCALES map in src/i18n/LanguageContext.jsx.
const SHIPPED_LOCALES = ['en', 'es', 'gl']

const manifestFiles = readdirSync(PHOTOS_DIR).filter((name) =>
  /^manifest\.[a-z-]+\.json$/i.test(name),
)

describe('example photo manifests', () => {
  for (const locale of SHIPPED_LOCALES) {
    it(`has a non-empty manifest for ${locale}`, () => {
      expect(manifestFiles).toContain(`manifest.${locale}.json`)
      const entries = JSON.parse(
        readFileSync(join(PHOTOS_DIR, `manifest.${locale}.json`), 'utf8'),
      )
      expect(Array.isArray(entries)).toBe(true)
      expect(entries.length).toBeGreaterThan(0)
    })
  }

  for (const file of manifestFiles) {
    it(`${file} only points to files that exist`, () => {
      const entries = JSON.parse(readFileSync(join(PHOTOS_DIR, file), 'utf8'))
      const missing = entries
        .map((entry) => entry.src)
        .filter((src) => !src || !existsSync(join(CONTENT_DIR, src.replace(/^\//, ''))))
      expect(missing).toEqual([])
    })
  }
})
