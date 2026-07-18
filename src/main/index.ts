import { app, BrowserWindow, dialog, ipcMain, protocol, shell } from 'electron'
import { existsSync, promises as fsp } from 'fs'
import path from 'path'
import type { Library, ScanProgress, Settings } from '../shared/types'
import { LIBRARY_VERSION, scanLibrary } from './scanner'
import { serveFile } from './serve'
import { coverDir, loadLibrary, loadSettings, saveLibrary, saveSettings } from './store'

let mainWindow: BrowserWindow | null = null
let settings: Settings
let library: Library | null = null
let scanning = false

// `stream` + `supportFetchAPI` are what make HTTP range requests work, which is
// what the <audio> element needs in order to seek without buffering the file.
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'tuna',
    privileges: { standard: true, secure: true, stream: true, supportFetchAPI: true, bypassCSP: true }
  }
])

/** Only serve files that live under a configured library folder or the cover cache. */
function isAllowedPath(target: string): boolean {
  const resolved = path.resolve(target)
  const roots = [...settings.folders.map((f) => path.resolve(f)), path.resolve(coverDir())]
  return roots.some((root) => {
    const rel = path.relative(root, resolved)
    return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel))
  })
}

function registerProtocol(): void {
  protocol.handle('tuna', async (request) => {
    let url: URL
    try {
      url = new URL(request.url)
    } catch {
      return new Response('Bad URL', { status: 400 })
    }

    const encoded = url.pathname.replace(/^\//, '')
    if (!encoded) return new Response('Not found', { status: 404 })

    let target: string
    try {
      target =
        url.host === 'cover'
          ? path.join(coverDir(), decodeURIComponent(encoded))
          : decodeURIComponent(encoded)
    } catch {
      return new Response('Bad path', { status: 400 })
    }

    if (!isAllowedPath(target)) return new Response('Forbidden', { status: 403 })

    try {
      return await serveFile(target, request)
    } catch {
      return new Response('Not found', { status: 404 })
    }
  })
}

/**
 * Window icon for development and for Linux, where the running window does not
 * pick up the packaged icon automatically. Packaged Windows builds take theirs
 * from the executable, so a missing file here is harmless.
 */
function windowIcon(): string | undefined {
  const candidate = app.isPackaged
    ? path.join(process.resourcesPath, 'icon.png')
    : path.join(__dirname, '../../build/icon.png')
  return existsSync(candidate) ? candidate : undefined
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 360,
    minHeight: 480,
    show: false,
    backgroundColor: '#0b0d10',
    autoHideMenuBar: true,
    title: 'TunaMusicPlayer',
    icon: windowIcon(),
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      // Keeps decode work off the main thread on both Windows and Linux.
      backgroundThrottling: false
    }
  })

  mainWindow.on('ready-to-show', () => mainWindow?.show())

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }
}

function emitProgress(progress: ScanProgress): void {
  mainWindow?.webContents.send('scan:progress', progress)
}

/**
 * Cheap fingerprint of a library's contents. Used to decide whether a finished
 * scan is worth pushing to the renderer — most launches find nothing new, and
 * replacing the library wholesale rebuilds every group and resets the grid, so
 * a no-op scan should leave the UI completely untouched.
 */
function librarySignature(lib: Library): string {
  const ids = Object.keys(lib.tracks).sort()
  let hash = 0
  for (const id of ids) {
    const track = lib.tracks[id]
    const part = `${id}:${track.mtimeMs}:${track.size}`
    for (let i = 0; i < part.length; i++) {
      hash = (Math.imul(hash, 31) + part.charCodeAt(i)) | 0
    }
  }
  return `${ids.length}:${Object.keys(lib.albums).length}:${hash}`
}

/** Folders we can actually read right now. */
async function reachableFolders(folders: string[]): Promise<{ ok: string[]; missing: string[] }> {
  const ok: string[] = []
  const missing: string[] = []
  await Promise.all(
    folders.map(async (folder) => {
      try {
        const stat = await fsp.stat(folder)
        if (stat.isDirectory()) ok.push(folder)
        else missing.push(folder)
      } catch {
        missing.push(folder)
      }
    })
  )
  return { ok, missing }
}

/**
 * Returns the new library only when it actually differs, so callers can skip
 * notifying the renderer on a no-op rescan.
 */
async function runScan(): Promise<{ library: Library; changed: boolean }> {
  if (scanning) throw new Error('A scan is already running')

  const previous = library

  if (settings.folders.length === 0) {
    const empty: Library = { version: LIBRARY_VERSION, scannedAt: Date.now(), tracks: {}, albums: {} }
    const changed = !previous || Object.keys(previous.tracks).length > 0
    library = empty
    if (changed) await saveLibrary(empty)
    emitProgress({ phase: 'done', processed: 0, total: 0, current: '' })
    return { library: empty, changed }
  }

  const { ok, missing } = await reachableFolders(settings.folders)

  // A music folder on an unmounted drive or a disconnected network share reads
  // as simply empty during the walk. Scanning anyway would produce a library
  // with zero tracks and overwrite the cached one — the user would open the app
  // to an empty grid. Keep what we have and say why instead.
  if (ok.length === 0) {
    emitProgress({
      phase: 'error',
      processed: 0,
      total: 0,
      current: '',
      message:
        missing.length === 1
          ? `Folder unavailable: ${missing[0]} — keeping the existing library`
          : `${missing.length} folders unavailable — keeping the existing library`
    })
    return { library: previous ?? { version: LIBRARY_VERSION, scannedAt: 0, tracks: {}, albums: {} }, changed: false }
  }

  scanning = true
  try {
    const scanned = await scanLibrary({
      folders: ok,
      coverDir: coverDir(),
      previous,
      onProgress: emitProgress
    })

    const changed = !previous || librarySignature(previous) !== librarySignature(scanned)
    library = scanned
    if (changed) await saveLibrary(scanned)

    emitProgress({
      phase: 'done',
      processed: 0,
      total: 0,
      current: '',
      message: missing.length > 0 ? `${missing.length} folder(s) unavailable and skipped` : undefined
    })
    return { library: scanned, changed }
  } catch (error) {
    emitProgress({
      phase: 'error',
      processed: 0,
      total: 0,
      current: '',
      message: error instanceof Error ? error.message : String(error)
    })
    throw error
  } finally {
    scanning = false
  }
}

function registerIpc(): void {
  ipcMain.handle('settings:get', () => settings)

  ipcMain.handle('settings:set', async (_event, patch: Partial<Settings>) => {
    settings = { ...settings, ...patch }
    await saveSettings(settings)
    return settings
  })

  ipcMain.handle('library:get', () => library)

  ipcMain.handle('library:scan', async () => (await runScan()).library)

  ipcMain.handle('dialog:pickFolder', async () => {
    if (!mainWindow) return null
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory', 'multiSelections'],
      title: 'Add music folders'
    })
    return result.canceled ? null : result.filePaths
  })

  ipcMain.handle('shell:reveal', (_event, filePath: string) => {
    if (isAllowedPath(filePath)) shell.showItemInFolder(filePath)
  })

  ipcMain.handle('window:toggleFullscreen', () => {
    if (!mainWindow) return false
    const next = !mainWindow.isFullScreen()
    mainWindow.setFullScreen(next)
    return next
  })
}

app.whenReady().then(async () => {
  settings = await loadSettings()
  library = await loadLibrary()

  registerProtocol()
  registerIpc()
  createWindow()

  // The cached library is served immediately via `library:get`, and the refresh
  // runs in the background — startup never blocks on a scan, and the renderer
  // is only notified if the scan actually found a difference, so an unchanged
  // library leaves the grid (and the user's scroll position) untouched.
  if (settings.scanOnStart && settings.folders.length > 0) {
    mainWindow?.webContents.once('did-finish-load', () => {
      runScan()
        .then(({ library: lib, changed }) => {
          if (changed) mainWindow?.webContents.send('library:updated', lib)
        })
        .catch(() => undefined)
    })
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// Single instance: focus the existing window instead of opening a second one.
if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })
}
