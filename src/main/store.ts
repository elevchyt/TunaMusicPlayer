import { promises as fs } from 'fs'
import path from 'path'
import { app } from 'electron'
import type { Library, Settings, UiMode } from '../shared/types'
import { GROUP_BY_VALUES } from '../shared/types'
import { DEFAULT_THEME, THEMES } from '../shared/themes'
import { LIBRARY_VERSION } from './scanner'

const UI_MODES: UiMode[] = ['auto', 'desktop', 'mobile']

export const DEFAULT_SETTINGS: Settings = {
  folders: [],
  groupBy: 'album',
  uiMode: 'auto',
  theme: DEFAULT_THEME,
  volume: 0.9,
  playbackRate: 1,
  gridSize: 180,
  scanOnStart: true
}

function userFile(name: string): string {
  return path.join(app.getPath('userData'), name)
}

export function coverDir(): string {
  return path.join(app.getPath('userData'), 'covers')
}

/** Write via a temp file + rename so a crash mid-write cannot corrupt the store. */
async function writeAtomic(file: string, data: string): Promise<void> {
  const tmp = file + '.tmp'
  await fs.writeFile(tmp, data, 'utf8')
  await fs.rename(tmp, file)
}

/**
 * JSON.parse rejects a leading UTF-8 BOM. Our own writes never emit one, but a
 * user (or an external editor) touching these files by hand easily can, and
 * silently reverting to defaults would look like the library had been wiped.
 */
function parseJson<T>(raw: string): T {
  return JSON.parse(raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw) as T
}

/**
 * Coerce stored values that are no longer valid back to their defaults.
 *
 * Settings persist across upgrades, so a preference the user picked under an
 * older build can outlive the option itself — "albumArtist" was a grouping that
 * has since been removed. Left alone it would leave the sidebar with nothing
 * selected and the grid falling through to an unintended branch.
 */
function sanitize(stored: Partial<Settings>): Settings {
  const merged = { ...DEFAULT_SETTINGS, ...stored }
  if (!GROUP_BY_VALUES.includes(merged.groupBy)) merged.groupBy = DEFAULT_SETTINGS.groupBy
  if (!UI_MODES.includes(merged.uiMode)) merged.uiMode = DEFAULT_SETTINGS.uiMode
  if (!THEMES.some((t) => t.name === merged.theme)) merged.theme = DEFAULT_THEME
  if (!Array.isArray(merged.folders)) merged.folders = []
  return merged
}

export async function loadSettings(): Promise<Settings> {
  try {
    const raw = await fs.readFile(userFile('settings.json'), 'utf8')
    return sanitize(parseJson<Partial<Settings>>(raw))
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export async function saveSettings(settings: Settings): Promise<void> {
  await writeAtomic(userFile('settings.json'), JSON.stringify(settings, null, 2))
}

export async function loadLibrary(): Promise<Library | null> {
  try {
    const raw = await fs.readFile(userFile('library.json'), 'utf8')
    const lib = parseJson<Library>(raw)
    if (lib.version !== LIBRARY_VERSION) return null
    return lib
  } catch {
    return null
  }
}

export async function saveLibrary(library: Library): Promise<void> {
  await writeAtomic(userFile('library.json'), JSON.stringify(library))
}
