import { ReactNode, useEffect, useState } from 'react'
import { Disc } from './Icons'

interface Props {
  cover: string | null
  className?: string
  /** Loads eagerly for above-the-fold art; the grid leaves this off. */
  eager?: boolean
  /** Overlay content, e.g. the hover play button. */
  children?: ReactNode
}

interface MosaicProps {
  covers: string[]
  className?: string
  children?: ReactNode
}

/**
 * 2x2 mosaic of up to four covers, used for groups that span several albums.
 * Falls back to a single cover when the group only has one.
 */
export function CoverMosaic({ covers, className = '', children }: MosaicProps): JSX.Element {
  const tiles = covers.slice(0, 4)
  if (tiles.length <= 1) {
    return (
      <Cover cover={tiles[0] ?? null} className={className}>
        {children}
      </Cover>
    )
  }
  return (
    <div className={className}>
      <div className={`cover-mosaic count-${tiles.length}`}>
        {tiles.map((cover, index) => (
          <MosaicTile key={`${cover}-${index}`} cover={cover} />
        ))}
      </div>
      {children}
    </div>
  )
}

function MosaicTile({ cover }: { cover: string }): JSX.Element {
  const [failed, setFailed] = useState(false)
  useEffect(() => setFailed(false), [cover])
  return (
    <div>
      {failed ? (
        <div className="fallback">
          <Disc size={16} />
        </div>
      ) : (
        <img
          src={window.tuna.coverUrl(cover)}
          alt=""
          loading="lazy"
          decoding="async"
          draggable={false}
          onError={() => setFailed(true)}
        />
      )}
    </div>
  )
}

export function Cover({ cover, className = '', eager = false, children }: Props): JSX.Element {
  const [failed, setFailed] = useState(false)

  // Recycled grid tiles reuse this component, so reset the error flag when the
  // art changes or a previously-broken cover would stay broken forever.
  useEffect(() => setFailed(false), [cover])

  return (
    <div className={className}>
      {!cover || failed ? (
        <div className="fallback">
          <Disc size={30} />
        </div>
      ) : (
        <img
          src={window.tuna.coverUrl(cover)}
          alt=""
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          draggable={false}
          onError={() => setFailed(true)}
        />
      )}
      {children}
    </div>
  )
}
