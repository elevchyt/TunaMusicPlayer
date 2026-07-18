# TunaMusicPlayer

A modern, album-oriented desktop music player for Windows and Linux. Winamp's
information density and LCD readout, rebuilt with a dark grid UI, instant
type-to-search, and first-class Greek support.

![Electron](https://img.shields.io/badge/Electron-33-47848F) ![React](https://img.shields.io/badge/React-18-61DAFB) ![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6)

## Features

**Library**
- Point it at one or more folders; everything is read from the files' own tags
- Rescans automatically on every launch, plus a manual **Rescan** button
- Incremental: unchanged files (same mtime + size) skip metadata parsing entirely
- Album art from embedded pictures, falling back to `cover.jpg` / `folder.jpg`
  next to the tracks; extracted once and cached

**Grouping** — album-oriented by default, but you choose: Albums, Artists,
Genres, Years, or Folders. The default is a setting, not a hardcode. Any group
spanning several albums (an artist, a genre, a year) shows a 2×2 mosaic of up to
four of its covers, deduplicated so a group whose albums share one cover doesn't
render four identical squares.

**Themes** — six accent palettes: Aqua, Nullsoft (the classic green LCD), Amber,
Violet, Rose and Azure. Switching recolours the whole UI including the logo,
via CSS custom properties, so it costs no re-render.

**Search** — start typing anywhere; no need to click the box first.
- Fuzzy, with prefix, substring, acronym and subsequence matching
- Greek ↔ greeklish: type `rempetika` to find `Ρεμπέτικα`, `psyxi vathia` for
  `Ψυχή Βαθιά`, `3imeromata` or `ksimeromata` for `Ξημερώματα`
- Accent- and case-insensitive in both scripts
- Indexes are built once per library change, so keystrokes only score, never
  re-normalise (~10ms across 50,000 entries)

**Playback**
- `Space` play/pause · `←`/`→` seek 5s · `Shift`+arrows 1s · `Alt`+arrows 30s
- `Ctrl`+`←`/`→` previous/next track · `↑`/`↓` volume · `Esc` back
- Drag the seek bar to scrub; **hold `Shift` while dragging for fine scrubbing**
  (pointer travel is scaled ~8×, so you can land on an exact second in a long file)
- Speeds: 0.5× · 0.75× · **1.0×** · 1.25× · 1.5×, with pitch preserved
- Shuffle and repeat (off / all / one)

**Interface modes** — `Auto` follows the window width; `Desktop` and `Mobile` are
presets that pin the layout, so you can run the touch UI on a desktop.

## Install

```bash
npm install
npm run dev          # development, with hot reload
```

## Build

```bash
npm run build:win    # NSIS installer + portable .exe
npm run build:linux  # AppImage + .deb
```

Artifacts land in `dist/`.

## Audio formats

Indexed and playable: **MP3, M4A/M4B/MP4, AAC, FLAC, WAV, OGG, OGA, Opus, WebM,
MKA, AIFF**.

Also indexed, but not decodable by Chromium: WMA, APE, WavPack, Musepack, TTA,
DSF/DFF. These appear in the library with their format badge and are skipped
with a message rather than failing silently — so the library stays complete
even where playback isn't possible.

## How a few things work

**Greek normalisation** (`src/shared/greeklish.ts`) projects both scripts into
one small phonetic alphabet, applying the *same* transform to the index and the
query. Consistency is what matters, not linguistic accuracy: even where the
mapping is lossy (β/φ/μπ all collapse to one class, so αυ/ευ fall out for free),
Latin↔Latin and Greek↔Greek matching are unaffected — only cross-script
precision pays for it, and the user still picks from a ranked list.

One direction is deliberate: χ and ξ expand *to* `ks` rather than `ks`
collapsing to a single symbol. The other way round would rewrite the genuine
`k`+`s` boundary in "dar**k s**ide" (typed without the space) into a Greek chi
the indexed title could never contain.

**Range requests** (`src/main/serve.ts`) — the `tuna://` protocol serves real
`206 Partial Content` responses. Electron's `net.fetch` over `file://` ignores
the `Range` header, and an `<audio>` element treats a source that can't serve
206 as non-seekable: assignments to `currentTime` silently snap back. Serving
ranges properly is what makes seeking work at all.

**WAV tags** (`src/main/riff.ts`) — music-metadata decodes RIFF INFO values as
7-bit ASCII, masking the high bit off every byte, so `Δ` (UTF-8 `CE 94`) arrives
as `4E 14`. That destroys the data rather than merely mis-decoding it, so the
INFO chunk is read directly to keep non-ASCII WAV tags intact.

**Performance** — the grid is windowed (only rows intersecting the viewport are
mounted), and the playhead is written straight to the DOM from a rAF loop rather
than through React state, so a 60fps seek bar costs zero re-renders.

**Non-disruptive startup scan** — the cached library renders immediately and the
rescan runs in the background. The renderer is notified *only if* the scan found
a real difference (compared via a content fingerprint), so an unchanged library
leaves the grid and your scroll position completely untouched. If a configured
folder is unreachable — an unmounted drive, a disconnected network share — the
scan is skipped rather than run: a walk over a missing folder reads as simply
empty, which would otherwise overwrite the cached library and greet you with an
empty grid.

## Icons and logo

The UI icons are **not** an icon library — they're hand-written inline SVGs in
`src/renderer/src/components/Icons.tsx`, drawn to Lucide/Feather conventions
(24×24 viewBox, 2px stroke, round caps/joins, `currentColor`). To swap any of
them, edit that file; each export is a self-contained component. Because the
conventions match, `npm i lucide-react` and re-exporting from that file is a
drop-in alternative if you'd rather have a full set.

The logo lives in two places that must stay in sync:
`src/renderer/src/components/Logo.tsx` (in-app, recolours with the theme) and
`scripts/logos.mjs` (rasterises `build/icon.png` for packaging). Regenerate the
app icon with `node scripts/logos.mjs pick <1-6>`; `node scripts/logos.mjs sheet`
renders a contact sheet of all six concepts into `build/logo-options/`.

## Checks

```bash
npm run typecheck     # main + renderer
npm run check:search  # greeklish normalisation + ranking cases
npm run check:scan -- "C:\path\to\music"   # scan a real folder and report
```

`check:search` covers 28 ranking cases across Greek, greeklish, English,
dropped letters and acronyms, and reports search throughput over 50,000
synthetic entries.
