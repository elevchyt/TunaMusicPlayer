import { createHash } from 'crypto'
import { promises as fs } from 'fs'
import path from 'path'
import { parseFile } from 'music-metadata'
import { readRiffInfo } from './riff'
import type { Album, Library, ScanProgress, Track } from '../shared/types'

export const LIBRARY_VERSION = 1

/** Every container we are willing to index. */
const AUDIO_EXT = new Set([
  '.mp3',
  '.m4a',
  '.m4b',
  '.mp4',
  '.aac',
  '.flac',
  '.wav',
  '.wave',
  '.ogg',
  '.oga',
  '.opus',
  '.webm',
  '.wma',
  '.aiff',
  '.aif',
  '.aifc',
  '.ape',
  '.wv',
  '.mpc',
  '.tta',
  '.dsf',
  '.dff',
  '.mka',
  '.spx',
  '.amr',
  '.au',
  '.ra'
])

/**
 * Formats Chromium decodes natively. Anything indexed but outside this set is
 * still listed — it is flagged so the UI can say why it will not play instead
 * of failing silently.
 */
const PLAYABLE_EXT = new Set([
  '.mp3',
  '.m4a',
  '.m4b',
  '.mp4',
  '.aac',
  '.flac',
  '.wav',
  '.wave',
  '.ogg',
  '.oga',
  '.opus',
  '.webm',
  '.mka',
  '.aiff',
  '.aif'
])

const SKIP_DIRS = new Set(['node_modules', '.git', '$RECYCLE.BIN', 'System Volume Information'])

/** Filenames checked for album art when the tags carry no embedded picture. */
const COVER_NAMES = ['cover', 'folder', 'front', 'album', 'albumart', 'art', 'thumb']
const COVER_EXT = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp']

const PARSE_CONCURRENCY = 8

export function hashId(input: string): string {
  return createHash('sha1').update(input).digest('hex').slice(0, 16)
}

async function walk(root: string, out: string[], onDir: (dir: string) => void): Promise<void> {
  let entries
  try {
    entries = await fs.readdir(root, { withFileTypes: true })
  } catch {
    return // unreadable directory — skip rather than abort the whole scan
  }
  onDir(root)
  for (const entry of entries) {
    const full = path.join(root, entry.name)
    if (entry.isSymbolicLink()) continue
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name) || entry.name.startsWith('.')) continue
      await walk(full, out, onDir)
    } else if (entry.isFile()) {
      if (AUDIO_EXT.has(path.extname(entry.name).toLowerCase())) out.push(full)
    }
  }
}

function firstString(value: unknown): string {
  if (Array.isArray(value)) return typeof value[0] === 'string' ? value[0] : ''
  return typeof value === 'string' ? value : ''
}

/**
 * Undo Latin-1-decoded UTF-8 ("Δοκιμή" arriving as "ÎÎ¿ÎºÎ¹Î¼Î®").
 *
 * WAV/RIFF INFO and some ID3v1 tags carry no encoding declaration, so writers
 * emit UTF-8 bytes that readers decode as Latin-1. Round-tripping through
 * latin1 -> utf8 recovers the original.
 *
 * The round-trip check is what makes this safe: genuinely Latin-1 text like
 * "Björk" or "Café" contains bytes that are not valid UTF-8 sequences, so the
 * re-decode produces U+FFFD, the comparison fails, and the input is returned
 * untouched. Only strings that were unambiguously mis-decoded get rewritten.
 */
function repairEncoding(value: string): string {
  if (!value) return value
  // Fast path: pure ASCII cannot be mojibake.
  let hasHighByte = false
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i)
    if (code > 0xff) return value // real non-Latin text — already correct
    if (code >= 0x80) hasHighByte = true
  }
  if (!hasHighByte) return value

  const decoded = Buffer.from(value, 'latin1').toString('utf8')
  if (decoded.includes('�')) return value
  // Only accept when the bytes round-trip exactly, i.e. the input really was a
  // valid UTF-8 sequence that had been read one byte at a time.
  return Buffer.from(decoded, 'utf8').toString('latin1') === value ? decoded : value
}

function cleanTitleFromPath(filePath: string): string {
  return path.basename(filePath, path.extname(filePath)).replace(/^\d+[\s._-]+/, '')
}

async function readTrack(filePath: string, stat: { mtimeMs: number; size: number }): Promise<Track> {
  const ext = path.extname(filePath).toLowerCase()
  let title = ''
  let artist = ''
  let albumArtist = ''
  let album = ''
  let genre = ''
  let year: number | null = null
  let trackNo: number | null = null
  let discNo: number | null = null
  let duration = 0

  try {
    // skipCovers keeps the hot path cheap; art is fetched once per album later.
    const md = await parseFile(filePath, { duration: true, skipCovers: true })
    const c = md.common
    title = repairEncoding((c.title ?? '').trim())
    artist = repairEncoding((c.artist ?? '').trim())
    albumArtist = repairEncoding((c.albumartist ?? '').trim())
    album = repairEncoding((c.album ?? '').trim())
    genre = repairEncoding(firstString(c.genre).trim())
    year = typeof c.year === 'number' ? c.year : null
    trackNo = c.track?.no ?? null
    discNo = c.disk?.no ?? null
    duration = md.format.duration ?? 0
  } catch {
    // Corrupt or unsupported tags — still index the file using its path.
  }

  // WAV: re-read the INFO chunk ourselves, since the library's ASCII decoding
  // destroys every non-ASCII character (see riff.ts).
  if (ext === '.wav' || ext === '.wave') {
    const info = await readRiffInfo(filePath)
    if (info) {
      if (info.title) title = info.title
      if (info.artist) artist = info.artist
      if (info.albumArtist) albumArtist = info.albumArtist
      if (info.album) album = info.album
      if (info.genre) genre = info.genre
      if (info.year) year = info.year
      if (info.track) trackNo = info.track
    }
  }

  if (!title) title = cleanTitleFromPath(filePath)
  if (!artist) artist = albumArtist || 'Unknown Artist'
  if (!albumArtist) albumArtist = artist
  if (!album) album = path.basename(path.dirname(filePath)) || 'Unknown Album'

  return {
    id: hashId(filePath),
    path: filePath,
    title,
    artist,
    albumArtist,
    album,
    genre: genre || 'Unknown Genre',
    year,
    track: trackNo,
    disc: discNo,
    duration,
    albumId: '',
    mtimeMs: stat.mtimeMs,
    size: stat.size,
    ext,
    playable: PLAYABLE_EXT.has(ext)
  }
}

/** Run `worker` over `items` with a bounded number of in-flight promises. */
async function pool<T>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<void>
): Promise<void> {
  let next = 0
  const runners = new Array(Math.min(concurrency, items.length)).fill(0).map(async () => {
    for (;;) {
      const i = next++
      if (i >= items.length) return
      await worker(items[i], i)
    }
  })
  await Promise.all(runners)
}

async function findCoverFile(dir: string): Promise<string | null> {
  let entries: string[]
  try {
    entries = await fs.readdir(dir)
  } catch {
    return null
  }
  const lower = entries.map((e) => ({ name: e, low: e.toLowerCase() }))
  for (const base of COVER_NAMES) {
    for (const ext of COVER_EXT) {
      const found = lower.find((e) => e.low === base + ext)
      if (found) return path.join(dir, found.name)
    }
  }
  // Fall back to any image in the directory.
  const anyImage = lower.find((e) => COVER_EXT.includes(path.extname(e.low)))
  return anyImage ? path.join(dir, anyImage.name) : null
}

/**
 * Resolve album art: embedded picture first, then a cover image sitting next to
 * the tracks. Written into `coverDir` as `<albumId>.<ext>`.
 */
async function extractCover(album: Album, tracks: Track[], coverDir: string): Promise<string | null> {
  for (const track of tracks.slice(0, 3)) {
    try {
      const md = await parseFile(track.path, { duration: false, skipCovers: false })
      const pic = md.common.picture?.[0]
      if (pic) {
        const ext = pic.format.includes('png') ? '.png' : '.jpg'
        const file = album.id + ext
        await fs.writeFile(path.join(coverDir, file), Buffer.from(pic.data))
        return file
      }
    } catch {
      // try the next track
    }
  }

  const external = await findCoverFile(album.folder)
  if (external) {
    try {
      const file = album.id + path.extname(external).toLowerCase()
      await fs.copyFile(external, path.join(coverDir, file))
      return file
    } catch {
      return null
    }
  }
  return null
}

function albumKey(track: Track): string {
  // Same album title under different artists must not merge, and a missing
  // album tag falls back to the containing folder so loose files still group.
  return `${track.albumArtist.toLowerCase()}|${track.album.toLowerCase()}|${path
    .dirname(track.path)
    .toLowerCase()}`
}

export interface ScanOptions {
  folders: string[]
  coverDir: string
  previous: Library | null
  onProgress: (p: ScanProgress) => void
}

export async function scanLibrary(options: ScanOptions): Promise<Library> {
  const { folders, coverDir, previous, onProgress } = options
  await fs.mkdir(coverDir, { recursive: true })

  onProgress({ phase: 'walking', processed: 0, total: 0, current: '' })
  const files: string[] = []
  let dirsSeen = 0
  for (const folder of folders) {
    await walk(folder, files, (dir) => {
      dirsSeen++
      if (dirsSeen % 25 === 0) {
        onProgress({ phase: 'walking', processed: files.length, total: 0, current: dir })
      }
    })
  }

  // Index the previous run by path so unchanged files skip metadata parsing.
  const prevByPath = new Map<string, Track>()
  if (previous) {
    for (const track of Object.values(previous.tracks)) prevByPath.set(track.path, track)
  }

  const tracks: Record<string, Track> = {}
  let processed = 0

  await pool(files, PARSE_CONCURRENCY, async (filePath) => {
    try {
      const stat = await fs.stat(filePath)
      const cached = prevByPath.get(filePath)
      let track: Track
      if (cached && cached.mtimeMs === stat.mtimeMs && cached.size === stat.size) {
        track = { ...cached, albumId: '' }
      } else {
        track = await readTrack(filePath, { mtimeMs: stat.mtimeMs, size: stat.size })
      }
      tracks[track.id] = track
    } catch {
      // File vanished mid-scan or is unreadable — leave it out.
    }
    processed++
    if (processed % 20 === 0 || processed === files.length) {
      onProgress({ phase: 'parsing', processed, total: files.length, current: filePath })
    }
  })

  // --- group into albums ---
  const albums: Record<string, Album> = {}
  const byKey = new Map<string, Album>()

  for (const track of Object.values(tracks)) {
    const key = albumKey(track)
    let album = byKey.get(key)
    if (!album) {
      album = {
        id: hashId(key),
        title: track.album,
        albumArtist: track.albumArtist,
        year: track.year,
        genre: track.genre,
        trackIds: [],
        duration: 0,
        cover: null,
        folder: path.dirname(track.path)
      }
      byKey.set(key, album)
      albums[album.id] = album
    }
    album.trackIds.push(track.id)
    album.duration += track.duration
    if (album.year === null && track.year !== null) album.year = track.year
    track.albumId = album.id
  }

  // Order tracks by disc, then track number, then title.
  for (const album of Object.values(albums)) {
    album.trackIds.sort((a, b) => {
      const ta = tracks[a]
      const tb = tracks[b]
      const da = ta.disc ?? 1
      const db = tb.disc ?? 1
      if (da !== db) return da - db
      const na = ta.track ?? Number.MAX_SAFE_INTEGER
      const nb = tb.track ?? Number.MAX_SAFE_INTEGER
      if (na !== nb) return na - nb
      return ta.title.localeCompare(tb.title)
    })
  }

  // --- covers ---
  const prevAlbums = previous?.albums ?? {}
  const albumList = Object.values(albums)
  let coverDone = 0

  await pool(albumList, 4, async (album) => {
    const prev = prevAlbums[album.id]
    if (prev?.cover) {
      // Reuse the cached file if it is still on disk.
      try {
        await fs.access(path.join(coverDir, prev.cover))
        album.cover = prev.cover
        coverDone++
        return
      } catch {
        // fall through and re-extract
      }
    }
    album.cover = await extractCover(
      album,
      album.trackIds.map((id) => tracks[id]),
      coverDir
    )
    coverDone++
    if (coverDone % 5 === 0 || coverDone === albumList.length) {
      onProgress({
        phase: 'covers',
        processed: coverDone,
        total: albumList.length,
        current: album.title
      })
    }
  })

  onProgress({
    phase: 'done',
    processed: files.length,
    total: files.length,
    current: ''
  })

  return { version: LIBRARY_VERSION, scannedAt: Date.now(), tracks, albums }
}
