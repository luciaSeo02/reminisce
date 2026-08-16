# CLAUDE.md

Context and rules for working in this repository with Claude Code.
Read this file before proposing changes. If a request conflicts with the
"Non-negotiable design rules" below, flag it instead of implementing it.

## What this project is

A **reminiscence** web app for people with dementia / Alzheimer's and their
family caregivers. The person with dementia looks at personal photos, listens
to meaningful music, and plays very simple recognition activities. The family
caregiver configures the content.

It started as a personal project to entertain my grandmother; the goal is to
turn it into an open-source template that any family can deploy with their
own content.

## Non-negotiable design rules (dementia-safe)

These rules come from research on reminiscence therapy and UX for dementia.
They are the whole point of the project. Don't break them "to improve the UX."

- **Errorless design:** there is never a "wrong" answer, a score, a red X, a
  timer, streaks, or a leaderboard. Every tap gets a positive, affirming
  response.
- **Zero friction for the person with dementia:** all complexity (searching
  for songs, uploading photos, configuring settings) lives on the CAREGIVER's
  screen, never on the screen the person with dementia uses.
- **Few choices at a time:** at most 3-4 large options per screen.
- **Huge, well-spaced buttons:** minimum touch target 48x48 px (bigger is
  better), generous spacing between buttons, tap area larger than the visible
  icon.
- **One-tap navigation:** never more than two taps deep. A Home button is
  always visible. No hamburger menus, no required gestures.
- **High contrast, no flashing:** large text (>=16 px), icons ALWAYS paired
  with a text label, no flashing or abrupt animations.
- **No time/reality disorientation:** frame content in the past ("A photo
  from your wedding"), never ask what today's date is, and never present
  videos of deceased relatives as if they were present now.
- **No forced return home during passive use:** the app is designed to be
  left running unattended as ambient company (a slideshow playing, music
  playing). Being idle with no taps is not the same as being stuck; never
  force a return to Home just because time has passed without interaction.
- **Recover only from genuinely broken/empty states:** if a screen has
  nothing to show (e.g. content failed to load and stays empty), it is fine
  to gently return to Home after a while, since there is nothing to engage
  with anyway. This is the only case where auto-return applies.
- **Supplement, don't replace, human contact:** favor a "together mode" with
  conversation prompts over a solo-only screen experience.

## Stack

- **Frontend:** React + Vite (JavaScript).
- **Backend:** A single Vercel Serverless Function (`/api/search.js`, plain
  Node.js, no framework). Its job is to safely proxy the YouTube Data API v3
  (the API key must NEVER be in the frontend).
- **Content:** config-driven. Music plays via embedded YouTube videos
  (permitted); audio is never downloaded or re-hosted. Photos are
  local/family-provided.
- **Target deployment:** Vercel (one instance per family).

## Structure (indicative, will evolve)

```
/            README, LICENSE, CLAUDE.md, example config
/src         React code (frontend)
/api         Vercel Serverless Functions (YouTube search proxy)
/content     royalty-free EXAMPLE content (placeholders)
```

Real, sensitive content (family photos, personal data) goes in `.gitignore`
and must NEVER be pushed to the repo.

## Code & content style

- No emojis anywhere: not in UI text, button labels, titles, code comments,
  or commit messages. Plain text only.
- No em dashes (—). Use a comma, period, or parentheses instead. Overuse of
  em dashes is one of the most recognizable "AI writing" tells.
- Avoid generic "AI-generated" patterns: no filler phrases, no comments that
  just restate what the code obviously does, no marketing-style copy
  ("Unlock the power of..."), no unnecessary abstraction for simple things.
- Keep UI copy calm and plain, not overly enthusiastic. This also matches
  the dementia-safe tone rules above.

## Working conventions

- **One branch per feature**, named `feat/…`, `fix/…`, `docs/…`.
- **Conventional commits:** `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`.
- **Nothing reaches `main` without a PR.** Work on a branch, open a PR with a
  clear description (what changed and why), and wait for review.
- **Small, reviewable changes.** Several small PRs are preferred over one huge
  one.
- Comment non-obvious decisions; otherwise let clear, readable code speak for
  itself.

## How to test

(Will be filled in as the project grows.)
- Frontend: `npm run dev`
- Manually check that every screen follows the design rules above.
- In a PR's test plan, never check off a manual browser check and then
  also say browser tools were unavailable, that contradicts itself. If a
  manual check wasn't actually done, say so plainly, with no checked box
  implying otherwise.
