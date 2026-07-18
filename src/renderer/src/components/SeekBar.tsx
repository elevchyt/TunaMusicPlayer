import { useEffect, useRef, useState } from 'react'
import { audio, formatTime } from '../audio'

/**
 * Scrub bar with a fine-scrub mode.
 *
 * Normal drag maps the pointer straight onto the track. Holding Shift switches
 * to relative mode: pointer travel is scaled down by FINE_RATIO around the grab
 * point, so on a 60-minute file you can still land on an exact second without
 * needing a 4000px-wide window.
 *
 * The fill/thumb are written directly to the DOM from the audio engine's rAF
 * loop — this component only re-renders while a drag is in progress.
 */

const FINE_RATIO = 0.12

interface Props {
  disabled?: boolean
}

export function SeekBar({ disabled = false }: Props): JSX.Element {
  const trackRef = useRef<HTMLDivElement>(null)
  const fillRef = useRef<HTMLDivElement>(null)
  const bufferedRef = useRef<HTMLDivElement>(null)
  const thumbRef = useRef<HTMLDivElement>(null)
  const elapsedRef = useRef<HTMLDivElement>(null)
  const totalRef = useRef<HTMLDivElement>(null)

  const [dragging, setDragging] = useState(false)
  const [fine, setFine] = useState(false)
  const [hover, setHover] = useState<{ x: number; time: number } | null>(null)

  // Drag origin, kept in a ref so the pointer handlers stay identity-stable.
  const drag = useRef({ startX: 0, startTime: 0, duration: 0, time: 0 })

  useEffect(() => {
    const paint = (current: number, duration: number, buffered: number): void => {
      const pct = duration > 0 ? (current / duration) * 100 : 0
      if (fillRef.current) fillRef.current.style.width = `${pct}%`
      if (thumbRef.current) thumbRef.current.style.left = `${pct}%`
      if (bufferedRef.current) {
        bufferedRef.current.style.width = `${duration > 0 ? (buffered / duration) * 100 : 0}%`
      }
      if (elapsedRef.current) elapsedRef.current.textContent = formatTime(current)
      if (totalRef.current) totalRef.current.textContent = formatTime(duration)
    }
    // While dragging, the pointer owns the playhead — ignore engine updates.
    return audio.onTime((current, duration, buffered) => {
      if (!drag.current.duration) paint(current, duration, buffered)
      else if (bufferedRef.current && duration > 0) {
        bufferedRef.current.style.width = `${(buffered / duration) * 100}%`
      }
    })
  }, [])

  const timeAt = (clientX: number, shiftKey: boolean): number => {
    const rect = trackRef.current?.getBoundingClientRect()
    if (!rect || rect.width === 0) return 0
    const duration = drag.current.duration || audio.duration
    if (duration <= 0) return 0

    if (shiftKey && drag.current.duration > 0) {
      const deltaPx = clientX - drag.current.startX
      const deltaSec = (deltaPx / rect.width) * duration * FINE_RATIO
      return clamp(drag.current.startTime + deltaSec, 0, duration)
    }
    const ratio = clamp((clientX - rect.left) / rect.width, 0, 1)
    return ratio * duration
  }

  const paintTo = (time: number, duration: number): void => {
    const pct = duration > 0 ? (time / duration) * 100 : 0
    if (fillRef.current) fillRef.current.style.width = `${pct}%`
    if (thumbRef.current) thumbRef.current.style.left = `${pct}%`
    if (elapsedRef.current) elapsedRef.current.textContent = formatTime(time)
  }

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>): void => {
    if (disabled) return
    const duration = audio.duration
    if (duration <= 0) return

    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = {
      startX: event.clientX,
      startTime: audio.currentTime,
      duration,
      time: audio.currentTime
    }
    setDragging(true)
    setFine(event.shiftKey)

    // A plain click jumps immediately; a shift-click anchors for fine dragging.
    if (!event.shiftKey) {
      const time = timeAt(event.clientX, false)
      drag.current.time = time
      drag.current.startTime = time
      drag.current.startX = event.clientX
      paintTo(time, duration)
    }
  }

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>): void => {
    const duration = drag.current.duration || audio.duration
    if (duration <= 0) return

    if (drag.current.duration > 0) {
      // Re-anchor when Shift is pressed or released mid-drag so the playhead
      // does not jump at the moment the mode flips.
      if (event.shiftKey !== fine) {
        drag.current.startX = event.clientX
        drag.current.startTime = drag.current.time
        setFine(event.shiftKey)
      }
      const time = timeAt(event.clientX, event.shiftKey)
      drag.current.time = time
      paintTo(time, duration)
      setHover({ x: event.clientX, time })
      return
    }

    const rect = trackRef.current?.getBoundingClientRect()
    if (rect) setHover({ x: event.clientX, time: timeAt(event.clientX, false) })
  }

  const endDrag = (event: React.PointerEvent<HTMLDivElement>): void => {
    if (drag.current.duration > 0) {
      audio.seek(drag.current.time)
      try {
        event.currentTarget.releasePointerCapture(event.pointerId)
      } catch {
        // capture may already be gone
      }
    }
    drag.current = { startX: 0, startTime: 0, duration: 0, time: 0 }
    setDragging(false)
    setFine(false)
  }

  const tooltipX = (): number => {
    const rect = trackRef.current?.getBoundingClientRect()
    if (!rect || !hover) return 0
    return clamp(hover.x - rect.left, 0, rect.width)
  }

  return (
    <div className="seek-wrap">
      <div className="lcd" ref={elapsedRef}>
        0:00
      </div>
      <div
        className={`seek${dragging ? ' dragging' : ''}${fine ? ' fine' : ''}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onPointerLeave={() => !dragging && setHover(null)}
        role="slider"
        aria-label="Seek"
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="seek-track" ref={trackRef}>
          <div className="seek-buffered" ref={bufferedRef} />
          <div className="seek-fill" ref={fillRef} />
        </div>
        <div className="seek-thumb" ref={thumbRef} />
        {hover && (
          <div className="seek-tooltip" style={{ left: tooltipX() }}>
            {formatTime(hover.time)}
            {fine && <span className="fine-tag">fine</span>}
          </div>
        )}
      </div>
      <div className="lcd dim" ref={totalRef}>
        0:00
      </div>
    </div>
  )
}

function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value
}
