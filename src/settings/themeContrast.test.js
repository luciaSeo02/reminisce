import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { THEMES } from './DisplaySettingsContext.jsx'

// The outline weight is read from the stylesheet, so the test follows it.
const manageCss = readFileSync(new URL('../screens/ManageScreen.css', import.meta.url), 'utf8')
const outlineMatch = manageCss.match(
  /--manage-outline:\s*color-mix\(in srgb, var\(--color-border\), var\(--color-text\) (\d+)%\)/,
)
const OUTLINE_WEIGHT = Number(outlineMatch?.[1]) / 100

// WCAG 2.x contrast ratio between two #rrggbb colors.
function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const channel = parseInt(hex.slice(i, i + 2), 16) / 255
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrastRatio(a, b) {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (light + 0.05) / (dark + 0.05)
}

// Same as CSS color-mix(in srgb, a, b <weight>), which ManageScreen.css
// uses for the outline of options and fields.
function mix(a, b, weight) {
  const channels = [1, 3, 5].map((i) => {
    const x = parseInt(a.slice(i, i + 2), 16)
    const y = parseInt(b.slice(i, i + 2), 16)
    return Math.round(x * (1 - weight) + y * weight)
  })
  return '#' + channels.map((c) => c.toString(16).padStart(2, '0')).join('')
}

// Fixed text color on filled accent buttons (App.css, ManageScreen.css).
const OFF_WHITE = '#fffcf6'

// Every pair the screens draw with the theme colors. 4.5 for normal text,
// 3 for large text (24px+, or 18.66px+ bold), icons and control outlines.
// Card borders are left out on purpose: cards are not controls, and they
// are also set apart by their shadow.
const PAIRS = [
  { label: 'Main text on cards', fg: (t) => t.text, bg: (t) => t.card, min: 4.5 },
  { label: 'Main text on the page background', fg: (t) => t.text, bg: (t) => t.bg, min: 4.5 },
  { label: 'Muted text on cards (hints, placeholders)', fg: (t) => t.muted, bg: (t) => t.card, min: 4.5 },
  { label: 'Muted text on the page background (header subtitle)', fg: (t) => t.muted, bg: (t) => t.bg, min: 4.5 },
  { label: 'Selected option and primary button text on the accent fill', fg: () => OFF_WHITE, bg: (t) => t.accent, min: 4.5 },
  { label: 'Accent text on the page background (Home app name, large)', fg: (t) => t.accent, bg: (t) => t.bg, min: 3 },
  { label: 'Accent outlines and icons on cards', fg: (t) => t.accent, bg: (t) => t.card, min: 3 },
  { label: 'Accent icons on the soft accent circle', fg: (t) => t.accent, bg: (t) => t.accentSoft, min: 3 },
  { label: 'Option and field outlines on cards', fg: (t) => mix(t.border, t.text, OUTLINE_WEIGHT), bg: (t) => t.card, min: 3 },
]

describe('theme contrast', () => {
  it('finds the outline weight in ManageScreen.css', () => {
    expect(OUTLINE_WEIGHT).toBeGreaterThan(0)
  })

  for (const [name, theme] of Object.entries(THEMES)) {
    describe(name, () => {
      for (const pair of PAIRS) {
        it(`${pair.label} is at least ${pair.min}:1`, () => {
          const ratio = contrastRatio(pair.fg(theme), pair.bg(theme))
          expect(ratio).toBeGreaterThanOrEqual(pair.min)
        })
      }
    })
  }
})
