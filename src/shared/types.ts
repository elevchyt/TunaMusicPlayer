export interface Track {
  /** Stable id derived from the absolute file path. */
  id: string
  path: string
  title: string
  artist: string
  albumArtist: string
  album: string
  genre: string
  year: number | null
  track: number | null
  disc: number | null
  duration: number
  /** Album id this track belongs to; tracks are always grouped into an album. */
  albumId: string
  /** File mtime (ms) + size, used to skip re-parsing unchanged files on rescan. */
  mtimeMs: number
  size: number
  ext: string
  /** True when Chromium can decode this container/codec directly. */
  playable: boolean
}

export interface Album {
  id: string
  title: string
  albumArtist: string
  year: number | null
  genre: string
  trackIds: string[]
  duration: number
  /** Relative filename inside the cover cache dir, or null when no art was found. */
  cover: string | null
  /** Directory the album's tracks live in — used by the "folder" grouping. */
  folder: string
}

export interface Library {
  version: number
  scannedAt: number
  tracks: Record<string, Track>
  albums: Record<string, Album>
}

export type GroupBy = 'album' | 'albumArtist' | 'artist' | 'genre' | 'year' | 'folder'

export type UiMode = 'auto' | 'desktop' | 'mobile'

export type ThemeName = 'aqua' | 'winamp' | 'amber' | 'violet' | 'rose' | 'azure'

export interface Settings {
  folders: string[]
  groupBy: GroupBy
  uiMode: UiMode
  theme: ThemeName
  volume: number
  playbackRate: number
  gridSize: number
  scanOnStart: boolean
}

export interface ScanProgress {
  phase: 'idle' | 'walking' | 'parsing' | 'covers' | 'done' | 'error'
  processed: number
  total: number
  current: string
  message?: string
}
