# TunaMusicPlayer

<img src="build/logo-options/logo-1.svg" width="96" align="right" alt="">

A modern, album-oriented music player for Windows and Linux. Winamp's density,
rebuilt with a dark grid UI, instant type-to-search, and first-class Greek
support.

## Features

- **Album-oriented** library from your files' own tags — group by Album, Artist,
  Genre, Year or Folder
- **Type-to-search** with no focus step, matching Greek *and* greeklish:
  `rempetika` finds `Ρεμπέτικα`, `psyxi vathia` finds `Ψυχή Βαθιά`
- **Precise seeking** — arrows for 5s/1s/30s, shift-drag for fine scrubbing
- **Speeds** 0.5×–1.5× with pitch preserved
- **Six themes**, and desktop/mobile layout presets
- Rescans on launch without disturbing what's on screen

## Install

Grab an installer from [Releases](../../releases), or run from source:

```bash
npm install
npm run dev
```

## Build

```bash
npm run build:win     # NSIS installer + portable .exe
npm run build:linux   # AppImage + .deb
```

## Keyboard

| | |
|---|---|
| `Space` | play/pause |
| `←` `→` | seek 5s (`Shift` 1s, `Alt` 30s) |
| `Ctrl`+`←` `→` | previous/next track |
| `↑` `↓` | volume |
| any letter | search |
| `Esc` | back |

## Formats

Plays MP3, M4A, AAC, FLAC, WAV, OGG, Opus, WebM, MKA, AIFF. WMA, APE, WavPack,
Musepack and DSF are indexed and shown but can't be decoded by Chromium.

## Notes

- Icons are hand-written inline SVGs in `src/renderer/src/components/Icons.tsx`
  (Lucide conventions), not an icon package.
- Preferences and the library cache live in Electron's `userData` dir.
- `npm run check:search` and `npm run check:scan -- <folder>` are in-repo checks.

MIT
