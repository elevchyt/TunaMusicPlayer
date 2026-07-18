import { promises as fs } from 'fs'

/**
 * Minimal RIFF INFO (LIST/INFO) tag reader for WAV files.
 *
 * Why this exists: music-metadata's RIFF reader decodes INFO values as 7-bit
 * ASCII, masking off the high bit of every byte. "Δ" (UTF-8 CE 94) comes back
 * as 0x4E 0x14 — the information is destroyed, not merely mis-decoded, so no
 * amount of re-decoding downstream can recover it. Reading the chunk ourselves
 * is the only way to keep non-ASCII WAV tags intact.
 *
 * Only the chunk headers are read; audio data is skipped by seeking, so this
 * costs a few hundred bytes of I/O regardless of file size.
 */

export interface RiffInfo {
  title?: string
  artist?: string
  album?: string
  albumArtist?: string
  genre?: string
  year?: number
  track?: number
}

/** RIFF INFO four-character codes we care about. */
const FIELDS: Record<string, keyof RiffInfo> = {
  INAM: 'title',
  IART: 'artist',
  IPRD: 'album',
  IALB: 'album',
  IAAR: 'albumArtist',
  ALBA: 'albumArtist',
  IGNR: 'genre',
  ICRD: 'year',
  IYER: 'year',
  IPRT: 'track',
  ITRK: 'track'
}

/** Guard against a corrupt length field asking us to allocate the world. */
const MAX_INFO_BYTES = 1 << 20

function decode(buffer: Buffer): string {
  // Values are NUL-terminated and padded; trim before decoding.
  let end = buffer.length
  while (end > 0 && buffer[end - 1] === 0) end--
  const slice = buffer.subarray(0, end)

  const utf8 = slice.toString('utf8')
  // Writers disagree on encoding; fall back to Latin-1 when the bytes are not
  // valid UTF-8 rather than surfacing replacement characters.
  return utf8.includes('�') ? slice.toString('latin1') : utf8.trim()
}

export async function readRiffInfo(filePath: string): Promise<RiffInfo | null> {
  let handle: fs.FileHandle | undefined
  try {
    handle = await fs.open(filePath, 'r')
    const { size } = await handle.stat()
    if (size < 12) return null

    const header = Buffer.alloc(12)
    await handle.read(header, 0, 12, 0)
    if (header.toString('latin1', 0, 4) !== 'RIFF') return null
    if (header.toString('latin1', 8, 12) !== 'WAVE') return null

    const info: RiffInfo = {}
    let found = false
    let offset = 12
    const chunkHeader = Buffer.alloc(8)

    while (offset + 8 <= size) {
      const read = await handle.read(chunkHeader, 0, 8, offset)
      if (read.bytesRead < 8) break

      const id = chunkHeader.toString('latin1', 0, 4)
      const chunkSize = chunkHeader.readUInt32LE(4)
      const body = offset + 8
      // Chunks are word-aligned: an odd size is followed by a pad byte.
      const advance = 8 + chunkSize + (chunkSize % 2)

      if (id === 'LIST' && chunkSize >= 4 && chunkSize <= MAX_INFO_BYTES) {
        const list = Buffer.alloc(chunkSize)
        await handle.read(list, 0, chunkSize, body)
        if (list.toString('latin1', 0, 4) === 'INFO') {
          parseInfoList(list.subarray(4), info)
          found = true
        }
      }

      if (advance <= 0) break // malformed; avoid an infinite loop
      offset += advance
    }

    return found ? info : null
  } catch {
    return null
  } finally {
    await handle?.close().catch(() => undefined)
  }
}

function parseInfoList(list: Buffer, info: RiffInfo): void {
  let pos = 0
  while (pos + 8 <= list.length) {
    const id = list.toString('latin1', pos, pos + 4)
    const size = list.readUInt32LE(pos + 4)
    const start = pos + 8
    if (size < 0 || start + size > list.length) break

    const field = FIELDS[id]
    if (field) {
      const value = decode(list.subarray(start, start + size))
      if (value) {
        if (field === 'year' || field === 'track') {
          // ICRD may be a full date ("1985-04-02"); take the leading number.
          const parsed = parseInt(value, 10)
          if (Number.isFinite(parsed)) info[field] = parsed
        } else {
          info[field] = value
        }
      }
    }
    pos = start + size + (size % 2)
  }
}
