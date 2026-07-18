/**
 * Runs the real scanner against a folder of audio and reports what it found.
 * Usage: npm run check:scan -- "C:\path\to\music"
 */
import path from 'path'
import { scanLibrary } from '../src/main/scanner'

const MUSIC = process.argv[2]
if (!MUSIC) {
  console.error('usage: check:scan -- <music folder>')
  process.exit(2)
}
const COVERS = path.join(process.cwd(), 'node_modules', '.cache', 'scan-covers')

async function main(): Promise<void> {
const lib = await scanLibrary({
  folders: [MUSIC],
  coverDir: COVERS,
  previous: null,
  onProgress: (p) => {
    if (p.phase === 'done') console.log('scan complete')
  }
})

const albums = Object.values(lib.albums)
const tracks = Object.values(lib.tracks)

console.log(`\n${albums.length} albums, ${tracks.length} tracks\n`)

for (const album of albums.sort((a, b) => a.title.localeCompare(b.title))) {
  console.log(
    `${album.title}  —  ${album.albumArtist}  [${album.year}] ${album.genre}  ` +
      `cover=${album.cover ?? 'NONE'}  tracks=${album.trackIds.length}  dur=${album.duration.toFixed(1)}s`
  )
  for (const id of album.trackIds) {
    const t = lib.tracks[id]
    console.log(
      `    ${String(t.track).padStart(2)}. ${t.title.padEnd(32)} ${t.ext.padEnd(6)} ` +
        `${t.duration.toFixed(1)}s playable=${t.playable}`
    )
  }
}

// A fallback title starting with a digit means the tags did not parse and the
// filename was used instead — that is the signal a container is unsupported.
const noTitle = tracks.filter((t) => /^\d/.test(t.title))
const noArtist = tracks.filter((t) => t.artist === 'Unknown Artist')
const noDuration = tracks.filter((t) => t.duration <= 0)
const noCover = albums.filter((a) => !a.cover)

console.log('\n--- checks ---')
console.log(`tracks with unparsed titles : ${noTitle.length} ${noTitle.map((t) => t.ext).join(',')}`)
console.log(`tracks with no artist tag   : ${noArtist.length} ${noArtist.map((t) => t.ext).join(',')}`)
console.log(`tracks with no duration     : ${noDuration.length} ${noDuration.map((t) => t.ext).join(',')}`)
console.log(`albums with no cover        : ${noCover.length} ${noCover.map((a) => a.title).join(',')}`)
console.log(`formats indexed             : ${[...new Set(tracks.map((t) => t.ext))].sort().join(' ')}`)

const failed = noTitle.length + noArtist.length + noDuration.length + noCover.length
console.log(failed === 0 ? '\nSCAN OK' : `\n${failed} PROBLEM(S)`)
process.exit(failed === 0 ? 0 : 1)
}

main()
