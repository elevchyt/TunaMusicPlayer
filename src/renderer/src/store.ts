import { create } from 'zustand'
import type { Album, GroupBy, Library, ScanProgress, Settings, Track } from '@shared/types'
import { audio } from './audio'
import { applyTheme } from './theme'

/**
 * A grid tile. For groupBy 'album' this maps 1:1 onto an album; for every other
 * grouping it aggregates the albums that share a key, so the rest of the UI
 * only ever deals with one shape.
 */
export interface Group {
  id: string
  title: string
  subtitle: string
  cover: string | null
  /** Up to four distinct covers, for the 2x2 grid tile of multi-album groups. */
  covers: string[]
  albumIds: string[]
  trackIds: string[]
  sortKey: string
  year: number | null
}

export type View =
  | { kind: 'library' }
  | { kind: 'detail'; groupId: string }
  | { kind: 'settings' }

interface State {
  settings: Settings | null
  library: Library | null
  scan: ScanProgress
  view: View
  history: View[]
  searchOpen: boolean
  searchSeed: string
  toast: string | null

  // playback
  queue: string[]
  queueIndex: number
  playing: boolean
  currentTrackId: string | null
  shuffle: boolean
  repeat: 'off' | 'all' | 'one'
  isMobile: boolean

  init: () => Promise<void>
  setSettings: (patch: Partial<Settings>) => Promise<void>
  rescan: () => Promise<void>
  addFolder: () => Promise<void>
  removeFolder: (folder: string) => Promise<void>

  navigate: (view: View) => void
  back: () => void
  openSearch: (seed: string) => void
  closeSearch: () => void
  setToast: (message: string | null) => void
  setIsMobile: (value: boolean) => void

  playQueue: (trackIds: string[], startIndex: number) => void
  toggle: () => void
  next: () => void
  previous: () => void
  setRate: (rate: number) => void
  setVolume: (volume: number) => void
  toggleShuffle: () => void
  cycleRepeat: () => void
}

const EMPTY_SCAN: ScanProgress = { phase: 'idle', processed: 0, total: 0, current: '' }

export const useStore = create<State>((set, get) => ({
  settings: null,
  library: null,
  scan: EMPTY_SCAN,
  view: { kind: 'library' },
  history: [],
  searchOpen: false,
  searchSeed: '',
  toast: null,

  queue: [],
  queueIndex: -1,
  playing: false,
  currentTrackId: null,
  shuffle: false,
  repeat: 'off',
  isMobile: false,

  init: async () => {
    const [settings, library] = await Promise.all([
      window.tuna.getSettings(),
      window.tuna.getLibrary()
    ])
    set({ settings, library })

    audio.setVolume(settings.volume)
    audio.setRate(settings.playbackRate)
    applyTheme(settings.theme)
    document.documentElement.style.setProperty('--grid-size', `${settings.gridSize}px`)

    window.tuna.onScanProgress((scan) => set({ scan }))
    window.tuna.onLibraryUpdated((lib) => set({ library: lib }))
    audio.onStateChange((playing) => set({ playing }))
    audio.onEnded(() => get().next())
    audio.onError((message) => set({ toast: message, playing: false }))
  },

  setSettings: async (patch) => {
    // Apply visual changes immediately rather than waiting on the IPC
    // round-trip, so switching theme or grid size feels instant.
    if (patch.theme !== undefined) applyTheme(patch.theme)
    if (patch.gridSize !== undefined) {
      document.documentElement.style.setProperty('--grid-size', `${patch.gridSize}px`)
    }
    const settings = await window.tuna.setSettings(patch)
    set({ settings })
  },

  rescan: async () => {
    try {
      const library = await window.tuna.scanLibrary()
      set({ library })
    } catch (error) {
      set({ toast: error instanceof Error ? error.message : 'Scan failed' })
    }
  },

  addFolder: async () => {
    const picked = await window.tuna.pickFolder()
    if (!picked || picked.length === 0) return
    const current = get().settings?.folders ?? []
    const folders = Array.from(new Set([...current, ...picked]))
    await get().setSettings({ folders })
    await get().rescan()
  },

  removeFolder: async (folder) => {
    const folders = (get().settings?.folders ?? []).filter((f) => f !== folder)
    await get().setSettings({ folders })
    await get().rescan()
  },

  navigate: (view) => {
    const { view: current, history } = get()
    if (current.kind === view.kind && JSON.stringify(current) === JSON.stringify(view)) return
    set({ view, history: [...history, current].slice(-20) })
  },

  back: () => {
    const { history } = get()
    if (history.length === 0) {
      set({ view: { kind: 'library' } })
      return
    }
    set({ view: history[history.length - 1], history: history.slice(0, -1) })
  },

  openSearch: (seed) => set({ searchOpen: true, searchSeed: seed }),
  closeSearch: () => set({ searchOpen: false, searchSeed: '' }),
  setToast: (toast) => set({ toast }),
  setIsMobile: (isMobile) => set({ isMobile }),

  playQueue: (trackIds, startIndex) => {
    if (trackIds.length === 0) return
    const { shuffle } = get()
    let queue = trackIds
    let index = startIndex

    if (shuffle) {
      // Keep the clicked track first, shuffle the remainder.
      const head = trackIds[startIndex]
      const rest = trackIds.filter((_, i) => i !== startIndex)
      for (let i = rest.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[rest[i], rest[j]] = [rest[j], rest[i]]
      }
      queue = [head, ...rest]
      index = 0
    }

    set({ queue, queueIndex: index })
    startTrack(get, set, queue[index])
  },

  toggle: () => {
    const { playing, currentTrackId, queue } = get()
    if (!currentTrackId) {
      if (queue.length > 0) startTrack(get, set, queue[0])
      return
    }
    if (playing) audio.pause()
    else audio.play()
  },

  next: () => {
    const { queue, queueIndex, repeat } = get()
    if (queue.length === 0) return

    if (repeat === 'one') {
      audio.seek(0)
      audio.play()
      return
    }
    const nextIndex = queueIndex + 1
    if (nextIndex >= queue.length) {
      if (repeat === 'all') {
        set({ queueIndex: 0 })
        startTrack(get, set, queue[0])
      } else {
        audio.pause()
        audio.seek(0)
      }
      return
    }
    set({ queueIndex: nextIndex })
    startTrack(get, set, queue[nextIndex])
  },

  previous: () => {
    const { queue, queueIndex } = get()
    // Restart the track first, like every other player — only jump back when
    // we're already near the start.
    if (audio.currentTime > 3) {
      audio.seek(0)
      return
    }
    const prevIndex = queueIndex - 1
    if (prevIndex < 0) {
      audio.seek(0)
      return
    }
    set({ queueIndex: prevIndex })
    startTrack(get, set, queue[prevIndex])
  },

  setRate: (rate) => {
    audio.setRate(rate)
    get().setSettings({ playbackRate: rate })
  },

  setVolume: (volume) => {
    audio.setVolume(volume)
    get().setSettings({ volume })
  },

  toggleShuffle: () => set({ shuffle: !get().shuffle }),

  cycleRepeat: () => {
    const order = ['off', 'all', 'one'] as const
    const current = get().repeat
    set({ repeat: order[(order.indexOf(current) + 1) % order.length] })
  }
}))

function startTrack(get: () => State, set: (patch: Partial<State>) => void, trackId: string): void {
  const state = get()
  const track = state.library?.tracks[trackId]
  if (!track) return

  if (!track.playable) {
    set({
      currentTrackId: trackId,
      toast: `${track.ext.slice(1).toUpperCase()} is indexed but not decodable — skipping`
    })
    // Advance rather than stalling on an undecodable file.
    setTimeout(() => get().next(), 60)
    return
  }

  set({ currentTrackId: trackId, toast: null })
  audio.load(
    window.tuna.mediaUrl(track.path),
    state.settings?.playbackRate ?? 1,
    state.settings?.volume ?? 0.9
  )
  audio.play()

  if ('mediaSession' in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title,
      artist: track.artist,
      album: track.album
    })
  }
}

/* ---------- derived selectors ---------- */

function groupKeyFor(album: Album, groupBy: GroupBy): { key: string; title: string } {
  switch (groupBy) {
    case 'albumArtist':
      return { key: album.albumArtist.toLowerCase(), title: album.albumArtist }
    case 'genre':
      return { key: album.genre.toLowerCase(), title: album.genre }
    case 'year':
      return { key: String(album.year ?? 0), title: album.year ? String(album.year) : 'Unknown Year' }
    case 'folder':
      return { key: album.folder.toLowerCase(), title: album.folder.split(/[\\/]/).pop() || album.folder }
    default:
      return { key: album.id, title: album.title }
  }
}

/** Build the grid's groups for the active grouping. Memoised by caller. */
export function buildGroups(library: Library | null, groupBy: GroupBy): Group[] {
  if (!library) return []
  const albums = Object.values(library.albums)

  if (groupBy === 'album') {
    return albums
      .map((album) => ({
        id: album.id,
        title: album.title,
        subtitle: album.albumArtist,
        cover: album.cover,
        covers: album.cover ? [album.cover] : [],
        albumIds: [album.id],
        trackIds: album.trackIds,
        sortKey: `${album.albumArtist} ${album.year ?? 0} ${album.title}`.toLowerCase(),
        year: album.year
      }))
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
  }

  // 'artist' groups by every performing artist on a track, not just the album
  // artist, so guest appearances surface under the guest too.
  if (groupBy === 'artist') {
    const byArtist = new Map<string, Group>()
    for (const track of Object.values(library.tracks)) {
      const key = track.artist.toLowerCase()
      let group = byArtist.get(key)
      if (!group) {
        group = {
          id: `artist:${key}`,
          title: track.artist,
          subtitle: '',
          cover: null,
          covers: [],
          albumIds: [],
          trackIds: [],
          sortKey: track.artist.toLowerCase(),
          year: null
        }
        byArtist.set(key, group)
      }
      group.trackIds.push(track.id)
      if (!group.albumIds.includes(track.albumId)) group.albumIds.push(track.albumId)
      if (!group.cover) group.cover = library.albums[track.albumId]?.cover ?? null
    }
    return finish(Array.from(byArtist.values()), library)
  }

  const byKey = new Map<string, Group>()
  for (const album of albums) {
    const { key, title } = groupKeyFor(album, groupBy)
    let group = byKey.get(key)
    if (!group) {
      group = {
        id: `${groupBy}:${key}`,
        title,
        subtitle: '',
        cover: null,
        covers: [],
        albumIds: [],
        trackIds: [],
        sortKey: groupBy === 'year' ? String(9999 - (album.year ?? 0)).padStart(4, '0') : title.toLowerCase(),
        year: album.year
      }
      byKey.set(key, group)
    }
    group.albumIds.push(album.id)
    group.trackIds.push(...album.trackIds)
    if (!group.cover) group.cover = album.cover
  }
  return finish(Array.from(byKey.values()), library)
}

function finish(groups: Group[], library: Library): Group[] {
  for (const group of groups) {
    const albums = group.albumIds.length
    group.subtitle = `${albums} album${albums === 1 ? '' : 's'} · ${group.trackIds.length} track${
      group.trackIds.length === 1 ? '' : 's'
    }`

    // Collect up to four *distinct* covers for the mosaic tile. Deduplicating
    // matters because albums sharing one folder can resolve to the same art,
    // and a mosaic of four identical covers just looks like a rendering bug.
    const seen = new Set<string>()
    for (const id of group.albumIds) {
      const cover = library.albums[id]?.cover
      if (cover && !seen.has(cover)) {
        seen.add(cover)
        group.covers.push(cover)
        if (group.covers.length === 4) break
      }
    }
    group.cover = group.covers[0] ?? null
  }
  return groups.sort((a, b) => a.sortKey.localeCompare(b.sortKey))
}

export function trackList(library: Library | null, ids: string[]): Track[] {
  if (!library) return []
  const out: Track[] = []
  for (const id of ids) {
    const track = library.tracks[id]
    if (track) out.push(track)
  }
  return out
}
