import { useEffect, useMemo } from 'react'
import { audio } from './audio'
import { buildGroups, useStore } from './store'
import { Detail } from './components/Detail'
import { Grid } from './components/Grid'
import { Player } from './components/Player'
import { SearchOverlay } from './components/SearchOverlay'
import { SettingsView } from './components/SettingsView'
import { Sidebar } from './components/Sidebar'
import { Back, Plus, Refresh, Search } from './components/Icons'

const MOBILE_BREAKPOINT = 860

/** Seek step in seconds for the arrow keys, by modifier. */
function seekStep(event: KeyboardEvent): number {
  if (event.altKey) return 30
  if (event.shiftKey) return 1
  return 5
}

export default function App(): JSX.Element {
  const settings = useStore((s) => s.settings)
  const library = useStore((s) => s.library)
  const view = useStore((s) => s.view)
  const scan = useStore((s) => s.scan)
  const toast = useStore((s) => s.toast)
  const isMobile = useStore((s) => s.isMobile)
  const searchOpen = useStore((s) => s.searchOpen)

  const init = useStore((s) => s.init)
  const navigate = useStore((s) => s.navigate)
  const back = useStore((s) => s.back)
  const openSearch = useStore((s) => s.openSearch)
  const setIsMobile = useStore((s) => s.setIsMobile)
  const setToast = useStore((s) => s.setToast)
  const addFolder = useStore((s) => s.addFolder)
  const rescan = useStore((s) => s.rescan)
  const playQueue = useStore((s) => s.playQueue)

  useEffect(() => {
    init()
  }, [init])

  // --- responsive / UI mode preset ---
  useEffect(() => {
    if (!settings) return
    if (settings.uiMode === 'mobile') {
      setIsMobile(true)
      return
    }
    if (settings.uiMode === 'desktop') {
      setIsMobile(false)
      return
    }
    const query = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`)
    const apply = (): void => setIsMobile(query.matches)
    apply()
    query.addEventListener('change', apply)
    return () => query.removeEventListener('change', apply)
  }, [settings?.uiMode, setIsMobile, settings])

  const groups = useMemo(
    () => buildGroups(library, settings?.groupBy ?? 'album'),
    [library, settings?.groupBy]
  )

  const counts = useMemo(() => {
    if (!library) return {}
    return {
      album: Object.keys(library.albums).length,
      artist: new Set(Object.values(library.tracks).map((t) => t.artist)).size,
      genre: new Set(Object.values(library.albums).map((a) => a.genre)).size,
      year: new Set(Object.values(library.albums).map((a) => a.year ?? 0)).size,
      folder: new Set(Object.values(library.albums).map((a) => a.folder)).size
    } as Record<string, number>
  }, [library])

  const activeGroup = view.kind === 'detail' ? groups.find((g) => g.id === view.groupId) : undefined

  // --- global keyboard ---
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      const target = event.target as HTMLElement | null
      const typing =
        !!target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)

      // The search overlay owns every key while it is open.
      if (searchOpen) return

      const store = useStore.getState()

      if (event.key === 'Escape') {
        if (view.kind !== 'library') back()
        return
      }

      // Ctrl+F and "/" are the explicit ways in; plain typing is handled below.
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'f') {
        event.preventDefault()
        openSearch('')
        return
      }

      if (typing) return

      switch (event.key) {
        case ' ':
          event.preventDefault()
          // Blur any focused button so Space does not also trigger its click.
          if (document.activeElement && document.activeElement !== document.body) {
            (document.activeElement as HTMLElement).blur()
          }
          store.toggle()
          return
        case 'ArrowRight':
          event.preventDefault()
          if (event.ctrlKey || event.metaKey) store.next()
          else audio.nudge(seekStep(event))
          return
        case 'ArrowLeft':
          event.preventDefault()
          if (event.ctrlKey || event.metaKey) store.previous()
          else audio.nudge(-seekStep(event))
          return
        case 'ArrowUp':
          event.preventDefault()
          store.setVolume(Math.min(1, (store.settings?.volume ?? 0.9) + 0.05))
          return
        case 'ArrowDown':
          event.preventDefault()
          store.setVolume(Math.max(0, (store.settings?.volume ?? 0.9) - 0.05))
          return
        case '/':
          event.preventDefault()
          openSearch('')
          return
      }

      // Type-to-search: any printable character with no modifier opens the
      // palette seeded with that character — Greek and Latin alike.
      if (
        event.key.length === 1 &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey &&
        event.key !== ' '
      ) {
        event.preventDefault()
        openSearch(event.key)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [searchOpen, view.kind, back, openSearch])

  // Auto-dismiss transient messages.
  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(timer)
  }, [toast, setToast])

  const scanning = scan.phase !== 'idle' && scan.phase !== 'done' && scan.phase !== 'error'
  const hasFolders = (settings?.folders.length ?? 0) > 0
  const groupLabel =
    view.kind === 'settings' ? 'Settings' : activeGroup ? activeGroup.title : titleFor(settings?.groupBy)

  return (
    <div className={`app${isMobile ? ' mobile' : ''}`}>
      {!isMobile && <Sidebar counts={counts} />}

      <main className="main">
        <div className="topbar">
          {view.kind !== 'library' && (
            <button className="icon-btn" onClick={back} title="Back (Esc)">
              <Back />
            </button>
          )}
          <h1>{groupLabel}</h1>
          {view.kind === 'library' && groups.length > 0 && (
            <div className="sub">{groups.length}</div>
          )}
          <div className="spacer" />
          {!isMobile && view.kind === 'library' && (
            <button className="btn ghost" onClick={rescan} disabled={scanning} title="Rescan library">
              <span className={scanning ? 'spin' : ''} style={{ display: 'flex' }}>
                <Refresh size={15} />
              </span>
            </button>
          )}
          <button className="search-cue" onClick={() => openSearch('')}>
            <Search size={14} />
            {!isMobile && (
              <>
                <span>Search</span>
                <kbd>type anything</kbd>
              </>
            )}
          </button>
        </div>

        {view.kind === 'settings' ? (
          <SettingsView />
        ) : activeGroup ? (
          <Detail group={activeGroup} />
        ) : groups.length > 0 ? (
          <Grid
            groups={groups}
            resetKey={settings?.groupBy ?? 'album'}
            tileSize={settings?.gridSize ?? 180}
            onOpen={(group) => navigate({ kind: 'detail', groupId: group.id })}
            onPlay={(group) => playQueue(group.trackIds, 0)}
          />
        ) : (
          <div className="empty">
            <div className="empty-inner">
              <h2>{hasFolders ? 'No music found' : 'Add your music'}</h2>
              <p>
                {hasFolders
                  ? 'The folders you added do not contain any readable audio files yet. Try a rescan, or add another folder.'
                  : 'Point TunaMusicPlayer at the folder holding your albums. Everything is read from the files’ own tags — nothing is uploaded anywhere.'}
              </p>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                <button className="btn primary" onClick={addFolder}>
                  <Plus size={15} /> Add music folder
                </button>
                {hasFolders && (
                  <button className="btn" onClick={rescan} disabled={scanning}>
                    <Refresh size={15} /> Rescan
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {(scanning || toast) && (
          <div className="scan-status">
            {toast ? (
              <span style={{ color: 'var(--danger)' }}>{toast}</span>
            ) : (
              <>
                <span className="spin" style={{ display: 'flex' }}>
                  <Refresh size={13} />
                </span>
                <span>{scanPhaseLabel(scan.phase)}</span>
                <div className="progress">
                  <i
                    style={{
                      width: `${scan.total > 0 ? (scan.processed / scan.total) * 100 : 8}%`
                    }}
                  />
                </div>
                <span>
                  {scan.processed}
                  {scan.total > 0 ? ` / ${scan.total}` : ''}
                </span>
              </>
            )}
          </div>
        )}
      </main>

      <Player />
      <SearchOverlay />
    </div>
  )
}

function titleFor(groupBy: string | undefined): string {
  switch (groupBy) {
    case 'artist':
      return 'Artists'
    case 'genre':
      return 'Genres'
    case 'year':
      return 'Years'
    case 'folder':
      return 'Folders'
    default:
      return 'Albums'
  }
}

function scanPhaseLabel(phase: string): string {
  switch (phase) {
    case 'walking':
      return 'Finding files'
    case 'parsing':
      return 'Reading tags'
    case 'covers':
      return 'Extracting artwork'
    default:
      return 'Scanning'
  }
}
