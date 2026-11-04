# Design reference

Visual target for the Reminisce redesign. Read this file and look at the images in `screens/` before changing any UI. This folder is a reference only: nothing here is imported by the app.

## How to use this folder

- `screens/*.png` is the visual target. Open the images and match them.
- `screens/*.html` is the same screen as static HTML with inline styles, so exact sizes, colors, SVG illustrations and paths can be copied. It uses fixed pixel sizes because it was drawn at tablet size. Do not copy pixel widths into the app: build the real screens responsive (see "Layout").
- Mock text is Spanish, the person's language. Real strings go through the existing i18n files (en, es, gl). Reuse existing keys when the text is the same. Add new keys to all three locales. Spanish and Galician wording is reviewed by the project owner.

| File | What it shows | Status |
|---|---|---|
| `01-home.png` | Home | Redesign |
| `02-photos.png` | Photos slideshow | Redesign |
| `03-music.png` | Music | Redesign |
| `04-music-fullscreen.png` | Music, expanded video | Future issue |
| `05-game.png` | Game | Redesign |
| `06-manage.png` | Caregiver settings | Redesign |
| `07-manage-songs-future.png` | Song list: drag to reorder, shuffle, listen before adding | Future issue |
| `08-manage-photos-future.png` | Photo list: drag to reorder, captions | Future issue |

Only build what the issue you were given asks for. Screens marked "Future issue" are there so the visual language stays consistent, not to be implemented yet.

## Principles

- Warm and caring, not clinical. Rounded shapes, soft shadows, friendly illustrations, calm colors.
- Still dementia-safe. Every rule in `CLAUDE.md` still applies: errorless, few big choices, targets of at least 48 px, icons always with a text label, high contrast, no flashing, past-tense framing, no forced return home.
- It has to look good to a family member who is evaluating the app for a relative, not only usable by the person with dementia.
- Tablet first (landscape and portrait), then phone, then desktop. The reference images are tablet landscape, 1180 px wide.

## Tokens (warm theme)

Colors:

| Token | Value | Use |
|---|---|---|
| page background | `#FBF4E8` (Music screen: `#F6F3EA`) | screen background |
| card | `#FFFCF6` | cards, tiles, secondary buttons |
| border | `#EADCC8` | card borders |
| text | `#33241A` (titles `#3A2418`) | main text |
| muted | `#6B5A4B` | secondary text |
| accent (Photos, general) | `#B4532A`, deep `#7A3515`, tint `#F8DCC8` | buttons, Photos |
| Music | `#1F6A85`, deep `#12384A`, tint `#CFE3EC`, border `#D2E2EA` | Music |
| Game | `#8A6410`, deep `#4A3507`, tint `#F5E3A8`, border `#EBDDB0` | Game |
| Backup (safe) | `#2F6B3F`, deep `#1F4A2A`, tint `#E3EFE0`, border `#B5D0AE` | backup card only |

Each section keeps its own color (Photos terracotta, Music blue, Game gold) so the person always knows where they are.

Background decoration: one or two large soft blobs (SVG path in the HTML files), peach `#F7DEC9` at 75% and sage `#E3EDDC`, behind the content, cropped by the screen edge. Purely decorative, `aria-hidden`.

Radii: tiles 36 px, cards 28 px, pill buttons fully rounded (half the height), inputs fully rounded.

Shadows (soft, never hard offsets):
- tile: `0 22px 40px -18px rgba(122,53,21,0.4)` (tinted per section)
- secondary button: `0 10px 22px -10px rgba(122,53,21,0.45)`
- primary button: `0 16px 30px -12px rgba(122,53,21,0.7)`

Focus ring: `outline: 5px solid #1F6A85; outline-offset: 4px` on `:focus-visible`.

## Typography

- Titles: **Fraunces** (variable), weight 600, `font-variation-settings: 'SOFT' 100` for rounder letterforms. Greeting 66 px, screen titles 40 px, card titles 32 px, caption under photos 44 px.
- Everything else: **Atkinson Hyperlegible**, 400 and 700. Tile labels 46 px bold, buttons 25 to 32 px bold, body 24 to 28 px.
- Self-host the fonts with fontsource, with no request to Google Fonts (the app is local-first and privacy minded): `@fontsource/atkinson-hyperlegible` (400, 700) and `@fontsource-variable/fraunces` (the `full.css` build has the SOFT axis). Both are open licensed. Fallbacks: `system-ui` and `Georgia`.
- All sizes in `rem`, so the existing `--font-scale` setting (normal, large, xlarge) keeps working. Check every screen at all three sizes: a 46 px label at 1.5x must not overflow its tile.

## Components

- **Tile** (Home): white-ish card, large illustration area on top (tinted background with an SVG drawing), then the label (title only, no description) and a round arrow button at the right. The whole tile is one button.
- **Pill button**: height 60 to 100 px depending on importance, label always visible next to the icon. Primary is filled (section color, white text, soft shadow). Secondary is white with a 3 px border in the section color.
- **Screen header** (inner screens): a pill "Home" button at the left, the section title in Fraunces plus a round section icon at the right.
- **Settings button on Home**: a labeled pill at the top right with a gear icon and the word "Ajustes" (replaces the old small gear icon, which a user did not notice).
- **Cards in caregiver screens**: white-ish card, a round tinted icon, a Fraunces title, then the controls. Selected option buttons are filled with a check icon, unselected are outlined.

Icons are inline stroke SVG (see the HTML files). No emojis anywhere in the UI, no em dashes in copy.

## Screen notes

**01 Home**
- Greeting "Hola" (the version with the person's name, "Hola, Rosa", comes with a later optional name setting; the name is optional and if empty the greeting is just "Hola").
- Three tiles, in this order: Photos, Music, Game. Label only, no description text.
- Illustrations are original and drawn in SVG; keep them as small components.
- No auto-return home, as already decided.

**02 Photos**
- Photo in a soft frame, caption below in Fraunces. The progress dots are decorative and show position, not time. Hide them when there are more than about 10 photos.
- Controls: Previous, Pause, Next, all with text labels.

**03 Music**
- Video area with a "Pantalla completa" button (that button belongs to its own future issue, do not wire it up in a visual-only change).
- "Siguiente" (Next) next to "Anterior" (Previous). The "next up" card is optional: only show it if the next song is actually known (it cannot be shown when the order is random).

**05 Game**
- Two answer cards only. Calm text: "Toca la que te parezca. Todas las respuestas valen." Errorless behavior unchanged: every tap leads to the same warm reveal.

**06 Manage**
- Same functionality, new look. The "Nombre" card is for the later optional name setting: leave it out until that issue.
- The Backup card keeps the behavior already built (save, save with photos, restore).

## Do not break

- Storage: never rename a storage key or change a stored data format (see `CLAUDE.md`). Any new stored field, such as the person's name, must be added in a backward compatible way, and the backup manifest must accept old backups that do not have it.
- Themes: the four themes (warm, sky, contrast, sunset) must keep working through the existing CSS custom properties. The mockups only show the warm theme. Keep illustration colors fixed, and use the theme variables for backgrounds, cards, borders and text. Check that the other three themes stay legible, especially contrast.
- Keep the locale parity test passing.
