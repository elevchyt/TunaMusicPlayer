import type { UiMode } from '@shared/types'
import { THEMES } from '@shared/themes'
import { useStore } from '../store'
import { GROUPINGS } from './Sidebar'
import { Folder, Plus, Refresh, Trash } from './Icons'

const UI_MODES: Array<{ key: UiMode; label: string; desc: string }> = [
  { key: 'auto', label: 'Auto', desc: 'Follows the window width' },
  { key: 'desktop', label: 'Desktop', desc: 'Always the full desktop layout' },
  { key: 'mobile', label: 'Mobile', desc: 'Touch layout, even on a big screen' }
]

const GRID_SIZES = [
  { size: 140, label: 'Small' },
  { size: 180, label: 'Medium' },
  { size: 230, label: 'Large' },
  { size: 300, label: 'Huge' }
]

export function SettingsView(): JSX.Element {
  const settings = useStore((s) => s.settings)
  const library = useStore((s) => s.library)
  const scan = useStore((s) => s.scan)
  const setSettings = useStore((s) => s.setSettings)
  const addFolder = useStore((s) => s.addFolder)
  const removeFolder = useStore((s) => s.removeFolder)
  const rescan = useStore((s) => s.rescan)

  if (!settings) return <div className="settings">Loading…</div>

  const scanning = scan.phase !== 'idle' && scan.phase !== 'done' && scan.phase !== 'error'
  const trackCount = library ? Object.keys(library.tracks).length : 0
  const albumCount = library ? Object.keys(library.albums).length : 0

  return (
    <div className="scroll">
      <div className="settings">
        <h2>Settings</h2>

        <div className="setting">
          <div className="setting-head">Music folders</div>
          <div className="setting-desc">
            Every folder is scanned recursively. The library refreshes automatically on launch —
            unchanged files are skipped, so repeat scans are fast.
          </div>
          {settings.folders.length === 0 && (
            <div className="setting-desc" style={{ color: 'var(--text-faint)' }}>
              No folders added yet.
            </div>
          )}
          {settings.folders.map((folder) => (
            <div className="folder-row" key={folder}>
              <Folder size={14} />
              <span className="path" title={folder}>
                {folder}
              </span>
              <button className="icon-btn" onClick={() => removeFolder(folder)} title="Remove">
                <Trash />
              </button>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button className="btn primary" onClick={addFolder}>
              <Plus size={15} /> Add folder
            </button>
            <button className="btn" onClick={() => rescan(true)} disabled={scanning}>
              <span className={scanning ? 'spin' : ''} style={{ display: 'flex' }}>
                <Refresh size={15} />
              </span>
              {scanning ? 'Scanning…' : 'Rescan now'}
            </button>
          </div>
        </div>

        <div className="setting">
          <div className="setting-head">Default grouping</div>
          <div className="setting-desc">
            How the library grid is organised when the app opens.
          </div>
          <div className="chip-row">
            {GROUPINGS.map((group) => (
              <button
                key={group.key}
                className={`chip${settings.groupBy === group.key ? ' active' : ''}`}
                onClick={() => setSettings({ groupBy: group.key })}
              >
                {group.label}
              </button>
            ))}
          </div>
        </div>

        <div className="setting">
          <div className="setting-head">Interface mode</div>
          <div className="setting-desc">
            {UI_MODES.find((m) => m.key === settings.uiMode)?.desc}
          </div>
          <div className="chip-row">
            {UI_MODES.map((mode) => (
              <button
                key={mode.key}
                className={`chip${settings.uiMode === mode.key ? ' active' : ''}`}
                onClick={() => setSettings({ uiMode: mode.key })}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>

        <div className="setting">
          <div className="setting-head">Theme</div>
          <div className="setting-desc">
            {THEMES.find((t) => t.name === settings.theme)?.description ?? 'Accent colour'}
          </div>
          <div className="theme-row">
            {THEMES.map((theme) => (
              <button
                key={theme.name}
                className={`theme-swatch${settings.theme === theme.name ? ' active' : ''}`}
                onClick={() => setSettings({ theme: theme.name })}
                title={theme.description}
                style={{
                  ['--sw' as string]: theme.accent,
                  ['--sw2' as string]: theme.accent2
                }}
              >
                <span className="theme-dot" />
                <span className="theme-name">{theme.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="setting">
          <div className="setting-head">Grid size</div>
          <div className="setting-desc">Cover size in the library grid.</div>
          <div className="chip-row">
            {GRID_SIZES.map((option) => (
              <button
                key={option.size}
                className={`chip${settings.gridSize === option.size ? ' active' : ''}`}
                onClick={() => setSettings({ gridSize: option.size })}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="setting">
          <div className="setting-head">Rescan on startup</div>
          <div className="setting-desc">
            Refresh the library in the background every time TunaMusicPlayer launches.
          </div>
          <div className="chip-row">
            <button
              className={`chip${settings.scanOnStart ? ' active' : ''}`}
              onClick={() => setSettings({ scanOnStart: true })}
            >
              On
            </button>
            <button
              className={`chip${!settings.scanOnStart ? ' active' : ''}`}
              onClick={() => setSettings({ scanOnStart: false })}
            >
              Off
            </button>
          </div>
        </div>

        <div className="setting" style={{ borderBottom: 'none' }}>
          <div className="setting-head">Library</div>
          <div className="setting-desc">
            {albumCount.toLocaleString()} albums · {trackCount.toLocaleString()} tracks
            {library?.scannedAt
              ? ` · last scanned ${new Date(library.scannedAt).toLocaleString()}`
              : ''}
          </div>
        </div>

        <div className="setting" style={{ borderBottom: 'none', paddingTop: 0 }}>
          <div className="setting-head">Keyboard</div>
          <div className="setting-desc" style={{ lineHeight: 2.1 }}>
            <kbd>Space</kbd> play/pause · <kbd>←</kbd>/<kbd>→</kbd> seek 5s ·{' '}
            <kbd>Shift</kbd>+<kbd>←</kbd>/<kbd>→</kbd> seek 1s ·{' '}
            <kbd>Alt</kbd>+<kbd>←</kbd>/<kbd>→</kbd> seek 30s ·{' '}
            <kbd>Ctrl</kbd>+<kbd>←</kbd>/<kbd>→</kbd> previous/next track ·{' '}
            <kbd>↑</kbd>/<kbd>↓</kbd> volume · <kbd>Esc</kbd> back
            <br />
            Just start typing to search — no need to click the box first.{' '}
            <kbd>Ctrl</kbd>+<kbd>F</kbd> or <kbd>/</kbd> opens it empty.
            <br />
            Hold <kbd>Shift</kbd> while dragging the seek bar for fine scrubbing.
          </div>
        </div>
      </div>
    </div>
  )
}
