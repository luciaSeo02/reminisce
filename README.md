# reminisce

A calm, open-source companion app for people with dementia and their family caregivers: personal photos, meaningful music, and a gentle recognition game, built to entertain and never to test.

**Live demo:** https://reminisce-omega.vercel.app/

---

## Why I built this

Alzheimer's is an extremely common disease, and yet it still feels strangely under-researched and under-discussed. I watched it up close in my own family. Most of the time, it's hard and it's sad. But one thing stood out to me: music reliably brought a kind of joy that little else did, and the memory for it seemed to hold on in a way that other memories didn't. I'm not a scientist, but from what I understand there's real research suggesting musical memory can stay intact longer in dementia than other kinds of memory, which lines up with what I saw.

This project started as something small and personal: a simple app to play familiar songs and show photos, just to entertain my grandmother. Over time I decided to rebuild it properly and open it up, in case it's useful to another family going through something similar.

I want to be very clear about one thing: **this is not a medical or clinically validated tool.** It's not therapy, and it's not proven to help anyone. It's just something I built that I'm now sharing in case it brings a little bit of the same joy to someone else's family. If it does, that's the whole goal.

The photo slideshow is built on a similar hope, not a claim: I think looking through familiar photos might be a nice, gentle way to spend time with memories, but again, I have no scientific basis for that beyond intuition and what I've read as a non-expert.

## What it does

- **Photos** — a calm, pausable slideshow of personal photos, each with a short caption.
- **Music** — a caregiver searches YouTube for meaningful songs (by artist, decade, whatever the person loved), and the app plays through them like a simple ambient playlist.
- **Game** — a gentle "which song is this?" recognition activity. There's no wrong answer, no score, and no timer. Tapping either option always leads to the same warm reveal.

All three are meant to run unattended, like a companion left on in the room, not something that demands attention or performance.

## A note on the design

The interaction design (large touch targets, minimal navigation, no error states, no scores or timers, personalizing content around meaningful eras of a person's life) is loosely informed by reading real research and design guidance on technology for people with dementia, not invented from scratch. I'm not a clinician or a UX researcher by training, so treat this as a thoughtful hobbyist's best effort, not an authoritative source. The full set of design rules the project follows lives in [`CLAUDE.md`](./CLAUDE.md).

## Screenshots

*(Coming soon, the app currently has no branding or visual polish beyond the base UI, screenshots will be added once that's in better shape.)*

## Tech stack

- **Frontend:** React + Vite (plain JavaScript)
- **Backend:** a single Vercel Serverless Function (`/api/search.js`, plain Node.js, no framework) that proxies the YouTube Data API v3, so the API key never reaches the browser
- **Storage:** local-first. Photos live in the browser's IndexedDB, selected songs and settings in localStorage. Nothing personal is ever sent to or stored on a server.
- **i18n:** English, Spanish, and Galician, with automatic browser-language detection and a caregiver-controlled override
- **Testing:** [Vitest](https://vitest.dev/), covering the app's pure logic (song selection, the game's round-picking logic, translation completeness)
- **CI/CD:** GitHub Actions runs the build and full test suite on every pull request; Vercel auto-deploys `main` on merge

## Key design decisions

- **One instance per family, not a shared service.** Each family deploys and hosts their own copy, with their own YouTube API key and their own data. Nothing about this app is designed to centralize anyone's personal photos or family details on a server I control.
- **Local-first storage.** Photos and settings live in the browser, not a database, both for privacy and to keep the project free to run and simple to reason about.
- **Config-driven content.** There's no code to touch to change what's shown, everything a caregiver adds goes through the app's own settings screen.
- **Errorless by design.** No wrong answers, no visible failure states, no timers, anywhere in the person-facing experience.

## Deploy your own instance

Each family runs their own copy, for free, with their own content.

1. **Fork this repository** on GitHub.
2. **Get a free YouTube Data API v3 key:**
   - Go to the [Google Cloud Console](https://console.cloud.google.com/), create a new project.
   - Search for "YouTube Data API v3" and enable it.
   - Under APIs & Services → Credentials, create an API key.
   - Restrict it to only the YouTube Data API v3 (recommended, not required).
3. **Deploy to [Vercel](https://vercel.com):**
   - Sign up with your GitHub account, import your forked repo.
   - Under Environment Variables, add `YOUTUBE_API_KEY` with the key from step 2 (apply it to Production and Preview).
   - Click Deploy. You'll get a live URL in a couple of minutes.
4. **Set up the caregiver area:** open `/manage` on your deployed URL, set a PIN, and start adding photos and songs.

That's it, no database, no server to maintain, and it costs nothing on Vercel's free tier for personal use.

## Running it locally

```bash
npm install
npm run dev      # starts the dev server
npm run build    # production build
npm run test     # runs the test suite
```

You'll also need a `YOUTUBE_API_KEY` environment variable locally (see `.env.example`) to use the music search feature.

## Development

This project was built collaboratively with [Claude Code](https://claude.com/claude-code): every change goes through an issue, a feature branch, an automated review, and a human review before merging into `main`.

## License

MIT, see [`LICENSE`](./LICENSE). The code is free to use and adapt. Any personal content you add (photos, chosen songs) is yours and never leaves your own deployment.

---

*This is a personal, non-commercial project. It is not a medical device, not clinically validated, and not a substitute for professional care or advice.*
