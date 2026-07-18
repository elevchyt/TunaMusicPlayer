/**
 * Logo concepts for TunaMusicPlayer.
 *
 * `node scripts/logos.mjs sheet`  -> renders a contact sheet of all concepts
 * `node scripts/logos.mjs pick <id>` -> writes build/icon.png (512px) from one
 */
import { mkdirSync, writeFileSync } from 'fs'
import path from 'path'
import sharp from 'sharp'

const ROOT = path.resolve(import.meta.dirname, '..')

// Aqua theme colours, so the icon matches the app's default accent.
const A = '#5eead4'
const A2 = '#3b82f6'
const BG = '#0b0d10'

/** Rounded-square app-icon backplate. */
const plate = (inner, fill = `url(#g)`) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${A}"/><stop offset="1" stop-color="${A2}"/>
    </linearGradient>
    <linearGradient id="d" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#1a1f27"/><stop offset="1" stop-color="#0b0d10"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="114" fill="${fill}"/>
  ${inner}
</svg>`

/**
 * The chosen mark: a clean solid tuna silhouette, no vinyl grooves.
 * Coordinates are laid out so the shape's bounding box is exactly centred in
 * the 512 plate — x spans 90..422 and y spans 142..370, both centred on 256.
 */
export const TUNA_BODY = `M90,256
  C118,190 182,156 258,156
  C296,156 322,168 342,186
  L422,142
  L406,256
  L422,370
  L342,326
  C322,344 296,356 258,356
  C182,356 118,322 90,256 Z`

const CONCEPTS = {
  // 1 — Solid tuna silhouette, centred. (chosen)
  1: plate(`
    <path d="${TUNA_BODY}" fill="${BG}" opacity="0.92"/>
    <circle cx="152" cy="224" r="17" fill="${A}"/>`),

  // 2 — Bold "T" monogram cut from a vinyl record.
  2: plate(`
    <g transform="translate(256,256)">
      <circle r="176" fill="${BG}"/>
      <circle r="176" fill="none" stroke="${A}" stroke-width="7" opacity="0.5"/>
      <circle r="132" fill="none" stroke="${A}" stroke-width="5" opacity="0.3"/>
      <circle r="104" fill="none" stroke="${A}" stroke-width="5" opacity="0.22"/>
      <path d="M-86,-72 H86 V-26 H24 V92 H-24 V-26 H-86 Z" fill="url(#g)"/>
    </g>`),

  // 3 — Equaliser bars rising out of a waveform.
  3: plate(`
    <g transform="translate(256,256)">
      <rect x="-160" y="-40" width="42" height="80" rx="21" fill="${BG}" opacity="0.9"/>
      <rect x="-100" y="-104" width="42" height="208" rx="21" fill="${BG}" opacity="0.9"/>
      <rect x="-40" y="-150" width="42" height="300" rx="21" fill="${BG}" opacity="0.9"/>
      <rect x="20" y="-104" width="42" height="208" rx="21" fill="${BG}" opacity="0.9"/>
      <rect x="80" y="-64" width="42" height="128" rx="21" fill="${BG}" opacity="0.9"/>
      <rect x="140" y="-26" width="42" height="52" rx="21" fill="${BG}" opacity="0.9"/>
    </g>`),

  // 4 — Dark plate, neon tuna outline (Winamp-ish "lit LCD" feel).
  4: plate(
    `<g transform="translate(256,256)">
      <path d="M-152,0 C-112,-80 -34,-118 42,-118 C106,-118 152,-88 170,-58 L216,-106 L208,0 L216,106 L170,58 C152,88 106,118 42,118 C-34,118 -112,80 -152,0 Z"
            fill="none" stroke="url(#g)" stroke-width="16" stroke-linejoin="round"/>
      <circle cx="-96" cy="-36" r="13" fill="${A}"/>
      <g stroke="${A}" stroke-width="15" stroke-linecap="round">
        <path d="M-52,-26 V26" opacity="0.45"/>
        <path d="M-18,-56 V56" opacity="0.65"/>
        <path d="M16,-38 V38" opacity="0.85"/>
        <path d="M50,-66 V66" opacity="0.6"/>
        <path d="M84,-30 V30" opacity="0.4"/>
      </g>
    </g>`,
    'url(#d)'
  ),

  // 5 — Play triangle inside a vinyl, minimal and unmistakable at 16px.
  5: plate(`
    <g transform="translate(256,256)">
      <circle r="180" fill="${BG}"/>
      <circle r="180" fill="none" stroke="${A}" stroke-width="8" opacity="0.45"/>
      <circle r="140" fill="none" stroke="${A}" stroke-width="5" opacity="0.25"/>
      <path d="M-46,-74 L92,0 L-46,74 Z" fill="url(#g)" stroke="url(#g)" stroke-width="26" stroke-linejoin="round"/>
    </g>`),

  // 6 — Tuna tail forming a sound wave, dark plate.
  6: plate(
    `<g transform="translate(256,256)">
      <path d="M-186,0 C-150,-96 -70,-140 10,-140 C70,-140 118,-112 146,-72"
            fill="none" stroke="url(#g)" stroke-width="20" stroke-linecap="round"/>
      <path d="M-186,0 C-150,96 -70,140 10,140 C70,140 118,112 146,72"
            fill="none" stroke="url(#g)" stroke-width="20" stroke-linecap="round" opacity="0.65"/>
      <path d="M150,-96 L206,-150 L196,0 L206,150 L150,96 Z" fill="url(#g)"/>
      <circle cx="-88" cy="-44" r="15" fill="${A}"/>
      <path d="M-116,26 H-40" stroke="${A}" stroke-width="15" stroke-linecap="round" opacity="0.6"/>
    </g>`,
    'url(#d)'
  )
}

const LABELS = {
  1: '1 — Tuna / vinyl body',
  2: '2 — T monogram record',
  3: '3 — Equaliser bars',
  4: '4 — Neon tuna outline',
  5: '5 — Play on vinyl',
  6: '6 — Tuna wave tail'
}

const mode = process.argv[2] ?? 'sheet'

if (mode === 'sheet') {
  const OUT = path.join(ROOT, 'build', 'logo-options')
  mkdirSync(OUT, { recursive: true })

  const TILE = 300
  const PAD = 26
  const LABEL_H = 38
  const cols = 3
  const rows = 2
  const W = cols * TILE + PAD * (cols + 1)
  const H = rows * (TILE + LABEL_H) + PAD * (rows + 1)

  const layers = []
  let i = 0
  for (const [id, svg] of Object.entries(CONCEPTS)) {
    writeFileSync(path.join(OUT, `logo-${id}.svg`), svg)
    await sharp(Buffer.from(svg)).resize(512, 512).png().toFile(path.join(OUT, `logo-${id}.png`))

    const col = i % cols
    const row = Math.floor(i / cols)
    layers.push({
      input: await sharp(Buffer.from(svg)).resize(TILE, TILE).png().toBuffer(),
      left: PAD + col * (TILE + PAD),
      top: PAD + row * (TILE + LABEL_H + PAD)
    })
    i++
  }

  const labelSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <rect width="${W}" height="${H}" fill="#0b0d10"/>
  ${Object.keys(CONCEPTS)
    .map((id, n) => {
      const col = n % cols
      const row = Math.floor(n / cols)
      const x = PAD + col * (TILE + PAD) + TILE / 2
      const y = PAD + row * (TILE + LABEL_H + PAD) + TILE + 26
      return `<text x="${x}" y="${y}" fill="#e7ebf2" font-family="Segoe UI, sans-serif" font-size="19" text-anchor="middle">${LABELS[id]}</text>`
    })
    .join('\n  ')}
</svg>`

  await sharp(Buffer.from(labelSvg)).composite(layers).png().toFile(path.join(OUT, 'sheet.png'))
  console.log(`sheet -> ${path.join(OUT, 'sheet.png')}`)
} else if (mode === 'pick') {
  const id = process.argv[3]
  const svg = CONCEPTS[id]
  if (!svg) {
    console.error(`unknown concept "${id}" — choose one of ${Object.keys(CONCEPTS).join(', ')}`)
    process.exit(1)
  }
  mkdirSync(path.join(ROOT, 'build'), { recursive: true })
  // electron-builder derives the Windows .ico and Linux .png from this file.
  await sharp(Buffer.from(svg)).resize(1024, 1024).png().toFile(path.join(ROOT, 'build', 'icon.png'))
  writeFileSync(path.join(ROOT, 'build', 'icon.svg'), svg)
  console.log(`build/icon.png + build/icon.svg written from concept ${id}`)
} else {
  console.error('usage: logos.mjs [sheet|pick <id>]')
  process.exit(1)
}
