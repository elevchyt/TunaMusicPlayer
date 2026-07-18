import { useMemo } from 'react'
import type { Track } from '@shared/types'
import { formatDuration, formatTime } from '../audio'
import { trackList, useStore, type Group } from '../store'
import { CoverMosaic } from './Cover'
import { Play, Shuffle } from './Icons'

interface Props {
  group: Group
}

export function Detail({ group }: Props): JSX.Element {
  const library = useStore((s) => s.library)
  const currentTrackId = useStore((s) => s.currentTrackId)
  const playing = useStore((s) => s.playing)
  const playQueue = useStore((s) => s.playQueue)
  const toggleShuffle = useStore((s) => s.toggleShuffle)

  // Split the group into its albums so multi-album groups (an artist, a genre)
  // still read as a stack of records rather than one flat list.
  const sections = useMemo(() => {
    if (!library) return []
    return group.albumIds
      .map((id) => library.albums[id])
      .filter(Boolean)
      .map((album) => ({
        album,
        // For an artist group, show only that artist's tracks from the album.
        tracks: trackList(
          library,
          album.trackIds.filter((tid) => group.trackIds.includes(tid))
        )
      }))
      .filter((section) => section.tracks.length > 0)
      .sort((a, b) => (a.album.year ?? 0) - (b.album.year ?? 0))
  }, [library, group])

  const totalDuration = group.trackIds.reduce(
    (sum, id) => sum + (library?.tracks[id]?.duration ?? 0),
    0
  )

  const playAll = (): void => playQueue(group.trackIds, 0)

  const shufflePlay = (): void => {
    toggleShuffle()
    playQueue(group.trackIds, 0)
  }

  const years = sections
    .map((s) => s.album.year)
    .filter((y): y is number => typeof y === 'number' && y > 0)
  const yearLabel =
    years.length === 0
      ? null
      : Math.min(...years) === Math.max(...years)
        ? String(years[0])
        : `${Math.min(...years)}–${Math.max(...years)}`

  return (
    <div className="scroll">
      <div className="detail-head">
        <CoverMosaic covers={group.covers} className="detail-art" />
        <div className="detail-meta">
          <div className="eyebrow">{group.albumIds.length === 1 ? 'Album' : 'Collection'}</div>
          <h2>{group.title}</h2>
          <div className="facts">
            {[
              group.albumIds.length === 1
                ? library?.albums[group.albumIds[0]]?.albumArtist
                : `${group.albumIds.length} albums`,
              yearLabel,
              `${group.trackIds.length} tracks`,
              formatDuration(totalDuration)
            ]
              .filter(Boolean)
              .join(' · ')}
          </div>
          <div className="detail-actions">
            <button className="btn primary" onClick={playAll}>
              <Play size={15} /> Play
            </button>
            <button className="btn" onClick={shufflePlay}>
              <Shuffle size={15} /> Shuffle
            </button>
          </div>
        </div>
      </div>

      {sections.map((section) => (
        <div className="album-section" key={section.album.id}>
          {sections.length > 1 && (
            <div className="album-section-head">
              <h3>{section.album.title}</h3>
              <div className="facts">
                {section.album.year ?? '—'} · {section.tracks.length} tracks
              </div>
            </div>
          )}
          {section.tracks.map((track, index) => (
            <TrackRow
              key={track.id}
              track={track}
              index={index + 1}
              isCurrent={track.id === currentTrackId}
              playing={playing}
              onPlay={() =>
                playQueue(
                  section.tracks.map((t) => t.id),
                  index
                )
              }
            />
          ))}
        </div>
      ))}

      <div style={{ height: 24 }} />
    </div>
  )
}

interface RowProps {
  track: Track
  index: number
  isCurrent: boolean
  playing: boolean
  onPlay: () => void
}

function TrackRow({ track, index, isCurrent, playing, onPlay }: RowProps): JSX.Element {
  return (
    <div
      className={`track-row${isCurrent ? ' current' : ''}${track.playable ? '' : ' unplayable'}`}
      onDoubleClick={onPlay}
      onClick={onPlay}
      title={track.playable ? track.path : `${track.ext} cannot be decoded by the player`}
    >
      {isCurrent ? (
        <div className={`eq${playing ? '' : ' paused'}`}>
          <i />
          <i />
          <i />
        </div>
      ) : (
        <div className="track-num">{track.track ?? index}</div>
      )}
      <div className="track-info">
        <div className="track-name">{track.title}</div>
        <div className="track-artist">{track.artist}</div>
      </div>
      <div className="track-badge">{track.ext.slice(1)}</div>
      <div className="track-dur">{formatTime(track.duration)}</div>
    </div>
  )
}
