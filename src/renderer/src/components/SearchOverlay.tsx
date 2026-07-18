import { useEffect, useMemo, useRef, useState } from 'react'
import type { Track } from '@shared/types'
import { buildDocs, search } from '@shared/fuzzy'
import { canonical } from '@shared/greeklish'
import { buildGroups, useStore, type Group } from '../store'
import { Cover } from './Cover'
import { Search } from './Icons'
import { formatTime } from '../audio'

type Row =
  | { kind: 'group'; group: Group }
  | { kind: 'track'; track: Track }

const MAX_GROUPS = 24
const MAX_TRACKS = 40

export function SearchOverlay(): JSX.Element | null {
  const open = useStore((s) => s.searchOpen)
  const seed = useStore((s) => s.searchSeed)
  const library = useStore((s) => s.library)
  const settings = useStore((s) => s.settings)
  const closeSearch = useStore((s) => s.closeSearch)
  const navigate = useStore((s) => s.navigate)
  const playQueue = useStore((s) => s.playQueue)

  const [query, setQuery] = useState(seed)
  const [selected, setSelected] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) {
      setQuery(seed)
      setSelected(0)
      // Focus after paint so the seeded character is not swallowed.
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open, seed])

  const groups = useMemo(
    () => buildGroups(library, settings?.groupBy ?? 'album'),
    [library, settings?.groupBy]
  )

  // Indexes are built once per library/grouping change, never per keystroke.
  const groupDocs = useMemo(
    () => buildDocs(groups, (g) => [g.title, g.subtitle]),
    [groups]
  )

  const trackDocs = useMemo(
    () =>
      buildDocs(library ? Object.values(library.tracks) : [], (t) => [
        t.title,
        t.artist,
        t.album,
        t.albumArtist
      ]),
    [library]
  )

  const rows: Row[] = useMemo(() => {
    if (!query.trim()) return []
    const groupHits = search(groupDocs, query, MAX_GROUPS)
    const trackHits = search(trackDocs, query, MAX_TRACKS)
    return [
      ...groupHits.map((h) => ({ kind: 'group' as const, group: h.item })),
      ...trackHits.map((h) => ({ kind: 'track' as const, track: h.item }))
    ]
  }, [query, groupDocs, trackDocs])

  useEffect(() => setSelected(0), [query])

  // Keep the highlighted row inside the scroll box.
  useEffect(() => {
    const el = listRef.current?.querySelector('.result.selected')
    el?.scrollIntoView({ block: 'nearest' })
  }, [selected])

  if (!open) return null

  const activate = (row: Row, playNow: boolean): void => {
    if (row.kind === 'group') {
      if (playNow) playQueue(row.group.trackIds, 0)
      else navigate({ kind: 'detail', groupId: row.group.id })
    } else {
      const album = library?.albums[row.track.albumId]
      const ids = album?.trackIds ?? [row.track.id]
      playQueue(ids, Math.max(0, ids.indexOf(row.track.id)))
    }
    closeSearch()
  }

  const onKeyDown = (event: React.KeyboardEvent): void => {
    if (event.key === 'Escape') {
      event.preventDefault()
      closeSearch()
    } else if (event.key === 'ArrowDown') {
      event.preventDefault()
      setSelected((i) => Math.min(i + 1, rows.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setSelected((i) => Math.max(i - 1, 0))
    } else if (event.key === 'Enter' && rows[selected]) {
      event.preventDefault()
      // Enter opens, Cmd/Ctrl+Enter plays straight away.
      activate(rows[selected], event.ctrlKey || event.metaKey || rows[selected].kind === 'track')
    }
  }

  const firstTrackIndex = rows.findIndex((r) => r.kind === 'track')
  const normalised = canonical(query)

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && closeSearch()}>
      <div className="search-panel">
        <div className="search-input-row">
          <Search size={18} />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search albums, artists, tracks — Greek or greeklish…"
            spellCheck={false}
            autoComplete="off"
          />
          {normalised && <div className="translit" title="Normalised query">≈ {normalised}</div>}
        </div>

        <div className="search-results" ref={listRef}>
          {query.trim() && rows.length === 0 && (
            <div style={{ padding: '28px 16px', textAlign: 'center', color: 'var(--text-faint)' }}>
              No matches for “{query}”
            </div>
          )}

          {rows.map((row, index) => {
            const label =
              index === 0 && row.kind === 'group' ? (
                <div className="result-group-label" key="lg">
                  Albums &amp; groups
                </div>
              ) : index === firstTrackIndex && firstTrackIndex >= 0 ? (
                <div className="result-group-label" key="lt">
                  Tracks
                </div>
              ) : null

            const key = row.kind === 'group' ? `g:${row.group.id}` : `t:${row.track.id}`
            const cover =
              row.kind === 'group'
                ? row.group.cover
                : library?.albums[row.track.albumId]?.cover ?? null

            return (
              <div key={key}>
                {label}
                <div
                  className={`result${index === selected ? ' selected' : ''}`}
                  onMouseEnter={() => setSelected(index)}
                  onClick={() => activate(row, row.kind === 'track')}
                >
                  <Cover cover={cover} className="result-art" />
                  <div className="result-text">
                    <div className="result-title">
                      {row.kind === 'group' ? row.group.title : row.track.title}
                    </div>
                    <div className="result-sub">
                      {row.kind === 'group'
                        ? row.group.subtitle
                        : `${row.track.artist} — ${row.track.album}`}
                    </div>
                  </div>
                  {row.kind === 'track' && (
                    <div className="track-dur">{formatTime(row.track.duration)}</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <div className="search-footer">
          <span>
            <kbd>↑</kbd>
            <kbd>↓</kbd> navigate
          </span>
          <span>
            <kbd>↵</kbd> open
          </span>
          <span>
            <kbd>Ctrl</kbd>+<kbd>↵</kbd> play
          </span>
          <span>
            <kbd>Esc</kbd> close
          </span>
        </div>
      </div>
    </div>
  )
}
