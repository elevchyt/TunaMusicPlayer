import { contextBridge, ipcRenderer } from 'electron'
import type { Library, ScanProgress, Settings } from '../shared/types'

const api = {
  getSettings: (): Promise<Settings> => ipcRenderer.invoke('settings:get'),
  setSettings: (patch: Partial<Settings>): Promise<Settings> =>
    ipcRenderer.invoke('settings:set', patch),

  getLibrary: (): Promise<Library | null> => ipcRenderer.invoke('library:get'),
  scanLibrary: (): Promise<Library> => ipcRenderer.invoke('library:scan'),

  pickFolder: (): Promise<string[] | null> => ipcRenderer.invoke('dialog:pickFolder'),
  revealInFolder: (filePath: string): Promise<void> => ipcRenderer.invoke('shell:reveal', filePath),
  toggleFullscreen: (): Promise<boolean> => ipcRenderer.invoke('window:toggleFullscreen'),

  onScanProgress: (callback: (progress: ScanProgress) => void): (() => void) => {
    const listener = (_event: unknown, progress: ScanProgress): void => callback(progress)
    ipcRenderer.on('scan:progress', listener)
    return () => ipcRenderer.off('scan:progress', listener)
  },

  onLibraryUpdated: (callback: (library: Library) => void): (() => void) => {
    const listener = (_event: unknown, library: Library): void => callback(library)
    ipcRenderer.on('library:updated', listener)
    return () => ipcRenderer.off('library:updated', listener)
  },

  /** Build a playable/displayable URL for a local file via the `tuna://` scheme. */
  mediaUrl: (filePath: string): string => `tuna://media/${encodeURIComponent(filePath)}`,
  coverUrl: (file: string): string => `tuna://cover/${encodeURIComponent(file)}`
}

contextBridge.exposeInMainWorld('tuna', api)

export type TunaApi = typeof api
