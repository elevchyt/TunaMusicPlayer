import { createReadStream, promises as fs } from 'fs'
import path from 'path'
import { Readable } from 'stream'

/**
 * Range-aware file responder for the `tuna://` protocol.
 *
 * This exists because `net.fetch('file://…')` does not honour the Range header:
 * it always returns the whole file with a 200. An <audio> element treats a
 * source that cannot serve 206 Partial Content as non-seekable and silently
 * refuses to move the playhead — assignments to currentTime just snap back.
 * Serving real 206 responses is what makes seeking (and therefore the seek bar
 * and the arrow-key shortcuts) work at all.
 */

const MIME: Record<string, string> = {
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
  '.m4b': 'audio/mp4',
  '.mp4': 'audio/mp4',
  '.aac': 'audio/aac',
  '.flac': 'audio/flac',
  '.wav': 'audio/wav',
  '.wave': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.oga': 'audio/ogg',
  '.opus': 'audio/ogg',
  '.webm': 'audio/webm',
  '.mka': 'audio/x-matroska',
  '.aiff': 'audio/aiff',
  '.aif': 'audio/aiff',
  '.aifc': 'audio/aiff',
  '.wma': 'audio/x-ms-wma',
  '.ape': 'audio/x-ape',
  '.wv': 'audio/x-wavpack',
  '.mpc': 'audio/x-musepack',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.bmp': 'image/bmp'
}

function mimeFor(filePath: string): string {
  return MIME[path.extname(filePath).toLowerCase()] ?? 'application/octet-stream'
}

/** Parse a single-range `bytes=start-end` header against a known file size. */
function parseRange(header: string, size: number): { start: number; end: number } | null {
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim())
  if (!match) return null
  const [, rawStart, rawEnd] = match

  let start: number
  let end: number
  if (rawStart === '') {
    // Suffix form: the last N bytes.
    const suffix = parseInt(rawEnd, 10)
    if (!Number.isFinite(suffix) || suffix <= 0) return null
    start = Math.max(0, size - suffix)
    end = size - 1
  } else {
    start = parseInt(rawStart, 10)
    end = rawEnd === '' ? size - 1 : parseInt(rawEnd, 10)
  }

  if (!Number.isFinite(start) || !Number.isFinite(end)) return null
  if (start < 0 || start >= size || end < start) return null
  return { start, end: Math.min(end, size - 1) }
}

function bodyFor(filePath: string, start: number, end: number): ReadableStream {
  // Readable.toWeb gives us a streaming body, so large files are never buffered.
  return Readable.toWeb(createReadStream(filePath, { start, end })) as ReadableStream
}

export async function serveFile(filePath: string, request: Request): Promise<Response> {
  let size: number
  try {
    const stat = await fs.stat(filePath)
    if (!stat.isFile()) return new Response('Not found', { status: 404 })
    size = stat.size
  } catch {
    return new Response('Not found', { status: 404 })
  }

  const contentType = mimeFor(filePath)
  const rangeHeader = request.headers.get('Range')

  if (request.method === 'HEAD') {
    return new Response(null, {
      status: 200,
      headers: {
        'Content-Length': String(size),
        'Content-Type': contentType,
        'Accept-Ranges': 'bytes'
      }
    })
  }

  if (!rangeHeader) {
    return new Response(bodyFor(filePath, 0, size - 1), {
      status: 200,
      headers: {
        'Content-Length': String(size),
        'Content-Type': contentType,
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'no-cache'
      }
    })
  }

  const range = parseRange(rangeHeader, size)
  if (!range) {
    return new Response(null, {
      status: 416,
      headers: { 'Content-Range': `bytes */${size}`, 'Accept-Ranges': 'bytes' }
    })
  }

  const length = range.end - range.start + 1
  return new Response(bodyFor(filePath, range.start, range.end), {
    status: 206,
    headers: {
      'Content-Range': `bytes ${range.start}-${range.end}/${size}`,
      'Content-Length': String(length),
      'Content-Type': contentType,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'no-cache'
    }
  })
}
