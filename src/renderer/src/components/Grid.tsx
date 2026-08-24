import { useLayoutEffect, useRef, useState } from 'react'
import { gridScrollFor, rememberGridScroll, type Group } from '../store'
import { CoverMosaic } from './Cover'
import { Play } from './Icons'

interface Props {
  groups: Group[]
  onOpen: (group: Group) => void
  onPlay: (group: Group) => void
  tileSize: number
  /** Changes only when the user switches lists; drives the scroll reset. */
  resetKey: string
}

const GAP = 20
const OVERSCAN = 2

/**
 * Windowed grid — only the rows intersecting the viewport are mounted, so a
 * 20k-album library scrolls as cheaply as a 20-album one.
 */
export function Grid({ groups, onOpen, onPlay, tileSize, resetKey }: Props): JSX.Element {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  const [scrollTop, setScrollTop] = useState(0)
  const [viewportHeight, setViewportHeight] = useState(0)

  useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const observer = new ResizeObserver(() => {
      setWidth(el.clientWidth)
      setViewportHeight(el.clientHeight)
    })
    observer.observe(el)
    setWidth(el.clientWidth)
    setViewportHeight(el.clientHeight)
    return () => observer.disconnect()
  }, [])

  // Restore the offset this list was left at. The grid unmounts while a detail
  // view is open, so without this, coming back always lands at the top. A list
  // the user has not visited yet resolves to 0, which is the old behaviour.
  //
  // Only ever runs once per list: a background rescan rebuilds the same groups
  // underneath the user, and re-applying the offset then would fight whatever
  // they are doing. Waits for the first measurement too, since scrollTo is
  // clamped while the viewport still has no height.
  const restoredKey = useRef<string | null>(null)
  useLayoutEffect(() => {
    if (width === 0 || restoredKey.current === resetKey) return
    restoredKey.current = resetKey
    const top = gridScrollFor(resetKey)
    scrollRef.current?.scrollTo({ top })
    setScrollTop(top)
  }, [resetKey, width])

  const padding = 20
  const available = Math.max(0, width - padding * 2)
  const columns = Math.max(1, Math.floor((available + GAP) / (tileSize + GAP)))
  const columnWidth = columns > 0 ? (available - GAP * (columns - 1)) / columns : tileSize
  // Square art + two lines of text beneath it.
  const rowHeight = columnWidth + 56
  const rowCount = Math.ceil(groups.length / columns)

  const firstRow = Math.max(0, Math.floor((scrollTop - padding) / (rowHeight + GAP)) - OVERSCAN)
  const visibleRows = Math.ceil(viewportHeight / (rowHeight + GAP)) + OVERSCAN * 2
  const lastRow = Math.min(rowCount, firstRow + visibleRows)

  const rows: JSX.Element[] = []
  for (let r = firstRow; r < lastRow; r++) {
    const items = groups.slice(r * columns, r * columns + columns)
    rows.push(
      <div
        key={r}
        className="grid-row"
        style={{
          top: padding + r * (rowHeight + GAP),
          height: rowHeight,
          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`
        }}
      >
        {items.map((group) => (
          <div
            key={group.id}
            className="card"
            onClick={() => onOpen(group)}
            role="button"
            tabIndex={-1}
          >
            <CoverMosaic covers={group.covers} className="card-art">
              <button
                className="card-play"
                title="Play"
                onClick={(event) => {
                  event.stopPropagation()
                  onPlay(group)
                }}
              >
                <Play size={17} />
              </button>
            </CoverMosaic>
            <div>
              <div className="card-title" title={group.title}>
                {group.title}
              </div>
              <div className="card-sub" title={group.subtitle}>
                {group.subtitle}
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div
      className="scroll"
      ref={scrollRef}
      onScroll={(event) => {
        const top = event.currentTarget.scrollTop
        setScrollTop(top)
        rememberGridScroll(resetKey, top)
      }}
    >
      <div
        className="grid-viewport"
        style={{ height: padding * 2 + rowCount * (rowHeight + GAP) - GAP }}
      >
        {rows}
      </div>
    </div>
  )
}
