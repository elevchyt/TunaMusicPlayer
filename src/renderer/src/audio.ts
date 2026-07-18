/**
 * Thin wrapper over a single <audio> element.
 *
 * Time updates are pushed through a manual rAF loop to subscribers rather than
 * React state: the seek bar writes straight to the DOM, so a 60fps playhead
 * costs no re-renders. Only low-frequency facts (track, duration, paused) go
 * into the React store.
 */

export type TimeListener = (currentTime: number, duration: number, buffered: number) => void
export type EndedListener = () => void
export type StateListener = (playing: boolean) => void
export type ErrorListener = (message: string) => void

class AudioEngine {
  readonly el: HTMLAudioElement
  private timeListeners = new Set<TimeListener>()
  private endedListeners = new Set<EndedListener>()
  private stateListeners = new Set<StateListener>()
  private errorListeners = new Set<ErrorListener>()
  private rafId = 0

  constructor() {
    this.el = new Audio()
    this.el.preload = 'auto'
    // Attached (hidden) rather than kept as a detached object so the element is
    // visible to devtools and to automated checks.
    this.el.hidden = true
    this.el.setAttribute('data-tuna-audio', '')
    if (document.body) document.body.appendChild(this.el)
    else document.addEventListener('DOMContentLoaded', () => document.body.appendChild(this.el))

    this.el.addEventListener('ended', () => {
      this.stopLoop()
      this.endedListeners.forEach((fn) => fn())
    })
    this.el.addEventListener('play', () => {
      this.startLoop()
      this.stateListeners.forEach((fn) => fn(true))
    })
    this.el.addEventListener('pause', () => {
      this.stopLoop()
      this.emitTime()
      this.stateListeners.forEach((fn) => fn(false))
    })
    this.el.addEventListener('loadedmetadata', () => this.emitTime())
    this.el.addEventListener('seeked', () => this.emitTime())
    this.el.addEventListener('progress', () => this.emitTime())
    this.el.addEventListener('error', () => {
      this.stopLoop()
      const code = this.el.error?.code
      this.errorListeners.forEach((fn) =>
        fn(
          code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED
            ? 'This format cannot be decoded'
            : 'Playback failed'
        )
      )
    })
  }

  private startLoop(): void {
    if (this.rafId) return
    const tick = (): void => {
      this.emitTime()
      this.rafId = requestAnimationFrame(tick)
    }
    this.rafId = requestAnimationFrame(tick)
  }

  private stopLoop(): void {
    if (this.rafId) cancelAnimationFrame(this.rafId)
    this.rafId = 0
  }

  private emitTime(): void {
    const duration = Number.isFinite(this.el.duration) ? this.el.duration : 0
    let buffered = 0
    const ranges = this.el.buffered
    if (ranges.length > 0) buffered = ranges.end(ranges.length - 1)
    this.timeListeners.forEach((fn) => fn(this.el.currentTime, duration, buffered))
  }

  onTime(fn: TimeListener): () => void {
    this.timeListeners.add(fn)
    this.emitTime()
    return () => this.timeListeners.delete(fn)
  }

  onEnded(fn: EndedListener): () => void {
    this.endedListeners.add(fn)
    return () => this.endedListeners.delete(fn)
  }

  onStateChange(fn: StateListener): () => void {
    this.stateListeners.add(fn)
    return () => this.stateListeners.delete(fn)
  }

  onError(fn: ErrorListener): () => void {
    this.errorListeners.add(fn)
    return () => this.errorListeners.delete(fn)
  }

  load(url: string, rate: number, volume: number): void {
    this.el.src = url
    this.el.playbackRate = rate
    this.el.volume = volume
    this.el.load()
  }

  async play(): Promise<void> {
    try {
      await this.el.play()
    } catch {
      // Autoplay rejection or a source that failed to load; the error handler
      // already surfaced the reason.
    }
  }

  pause(): void {
    this.el.pause()
  }

  seek(seconds: number): void {
    const duration = Number.isFinite(this.el.duration) ? this.el.duration : 0
    this.el.currentTime = Math.max(0, duration > 0 ? Math.min(seconds, duration) : seconds)
    this.emitTime()
  }

  nudge(delta: number): void {
    this.seek(this.el.currentTime + delta)
  }

  setRate(rate: number): void {
    // Preserve pitch so a speed change stays listenable.
    this.el.preservesPitch = true
    this.el.playbackRate = rate
  }

  setVolume(volume: number): void {
    this.el.volume = Math.max(0, Math.min(1, volume))
  }

  get currentTime(): number {
    return this.el.currentTime
  }

  get duration(): number {
    return Number.isFinite(this.el.duration) ? this.el.duration : 0
  }
}

export const audio = new AudioEngine()

export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const total = Math.floor(seconds)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0 sec'
  // Sub-minute totals would otherwise round to a confusing "0 min".
  if (seconds < 60) return `${Math.round(seconds)} sec`
  const mins = Math.round(seconds / 60)
  if (mins < 60) return `${mins} min`
  const h = Math.floor(mins / 60)
  const rest = mins % 60
  return rest === 0 ? `${h} hr` : `${h} hr ${rest} min`
}
