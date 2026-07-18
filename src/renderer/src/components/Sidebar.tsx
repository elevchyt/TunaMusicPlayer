import type { GroupBy } from '@shared/types'
import { useStore } from '../store'
import { Calendar, Disc, Folder, Refresh, Settings as SettingsIcon, Tag, User } from './Icons'
import { Logo } from './Logo'

export const GROUPINGS: Array<{ key: GroupBy; label: string; icon: JSX.Element }> = [
  { key: 'album', label: 'Albums', icon: <Disc /> },
  { key: 'artist', label: 'Artists', icon: <User /> },
  { key: 'genre', label: 'Genres', icon: <Tag /> },
  { key: 'year', label: 'Years', icon: <Calendar /> },
  { key: 'folder', label: 'Folders', icon: <Folder /> }
]

interface Props {
  counts: Record<string, number>
}

export function Sidebar({ counts }: Props): JSX.Element {
  const settings = useStore((s) => s.settings)
  const view = useStore((s) => s.view)
  const scan = useStore((s) => s.scan)
  const setSettings = useStore((s) => s.setSettings)
  const navigate = useStore((s) => s.navigate)
  const rescan = useStore((s) => s.rescan)

  const scanning = scan.phase !== 'idle' && scan.phase !== 'done' && scan.phase !== 'error'

  return (
    <aside className="sidebar">
      <div className="brand">
        <Logo size={26} />
        <div className="brand-name">
          Tuna<span>Music</span>
        </div>
      </div>

      <div className="nav-section">
        <div className="nav-label">Browse by</div>
        {GROUPINGS.map((group) => (
          <button
            key={group.key}
            className={`nav-item${
              settings?.groupBy === group.key && view.kind !== 'settings' ? ' active' : ''
            }`}
            onClick={() => {
              setSettings({ groupBy: group.key })
              navigate({ kind: 'library' })
            }}
          >
            {group.icon}
            <span>{group.label}</span>
            {counts[group.key] !== undefined && <span className="count">{counts[group.key]}</span>}
          </button>
        ))}
      </div>

      <div className="nav-section">
        <div className="nav-label">Library</div>
        <button className="nav-item" onClick={rescan} disabled={scanning}>
          <span className={scanning ? 'spin' : ''} style={{ display: 'flex' }}>
            <Refresh />
          </span>
          <span>{scanning ? 'Scanning…' : 'Rescan library'}</span>
        </button>
        <button
          className={`nav-item${view.kind === 'settings' ? ' active' : ''}`}
          onClick={() => navigate({ kind: 'settings' })}
        >
          <SettingsIcon />
          <span>Settings</span>
        </button>
      </div>

    </aside>
  )
}
