import { useEffect, useRef, useState } from 'react'
import { useStore } from '../store'
import { Cover } from './Cover'
import { SeekBar } from './SeekBar'
import {
  Disc,
  Next,
  Pause,
  Play,
  Prev,
  Repeat,
  RepeatOne,
  Search as SearchIcon,
  Settings as SettingsIcon,
  Shuffle,
  User,
  Volume,
  VolumeMute
} from './Icons'

export const SPEEDS = [0.5, 0.75, 1.0, 1.25, 1.5]

export function Player(): JSX.Element {
  const library = useStore((s) => s.library)
  const settings = useStore((s) => s.settings)
  const currentTrackId = useStore((s) => s.currentTrackId)
  const playing = useStore((s) => s.playing)
  const shuffle = useStore((s) => s.shuffle)
  const repeat = useStore((s) => s.repeat)
  const isMobile = useStore((s) => s.isMobile)
  const toggle = useStore((s) => s.toggle)
  const next = useStore((s) => s.next)
  const previous = useStore((s) => s.previous)
  const setRate = useStore((s) => s.setRate)
  const setVolume = useStore((s) => s.setVolume)
  const toggleShuffle = useStore((s) => s.toggleShuffle)
  const cycleRepeat = useStore((s) => s.cycleRepeat)
  const navigate = useStore((s) => s.navigate)

  const [speedOpen, setSpeedOpen] = useState(false)
  const speedRef = useRef<HTMLDivElement>(null)

  const track = currentTrackId ? library?.tracks[currentTrackId] : null
  const album = track ? library?.albums[track.albumId] : null
  const rate = settings?.playbackRate ?? 1
  const volume = settings?.volume ?? 0.9

  useEffect(() => {
    if (!speedOpen) return
    const onDown = (event: MouseEvent): void => {
      if (!speedRef.current?.contains(event.target as Node)) setSpeedOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [speedOpen])

  return (
    <div className="player">
      <div className="player-inner">
        <div className="now-playing">
          {track ? (
            <>
              <Cover
                cover={album?.cover ?? null}
                className="np-art"
                eager
                // Jump to the album this track came from.
              />
              <div className="np-text">
                <div className="np-title" title={track.title}>
                  {track.title}
                </div>
                <div
                  className="np-artist"
                  title={track.artist}
                  onClick={() => album && navigate({ kind: 'detail', groupId: album.id })}
                >
                  {track.artist}
                </div>
              </div>
            </>
          ) : (
            <div className="np-text">
              <div className="np-title" style={{ color: 'var(--text-faint)' }}>
                Nothing playing
              </div>
              <div className="np-artist">Pick an album to start</div>
            </div>
          )}
        </div>

        <div className="transport">
          <div className="transport-buttons">
            <button
              className={`icon-btn${shuffle ? ' active' : ''}`}
              onClick={toggleShuffle}
              title="Shuffle"
            >
              <Shuffle />
            </button>
            <button className="icon-btn" onClick={previous} title="Previous">
              <Prev />
            </button>
            <button className="play-btn" onClick={toggle} title={playing ? 'Pause (Space)' : 'Play (Space)'}>
              {playing ? <Pause size={17} /> : <Play size={17} />}
            </button>
            <button className="icon-btn" onClick={next} title="Next">
              <Next />
            </button>
            <button
              className={`icon-btn${repeat !== 'off' ? ' active' : ''}`}
              onClick={cycleRepeat}
              title={`Repeat: ${repeat}`}
            >
              {repeat === 'one' ? <RepeatOne /> : <Repeat />}
            </button>
          </div>
          <SeekBar disabled={!track} />
        </div>

        <div className="player-right">
          <div className="anchor" ref={speedRef}>
            <button
              className={`speed-btn${rate !== 1 ? ' modified' : ''}`}
              onClick={() => setSpeedOpen((open) => !open)}
              title="Playback speed"
            >
              {rate.toFixed(2).replace(/0$/, '')}×
            </button>
            {speedOpen && (
              <div className="popover">
                {SPEEDS.map((speed) => (
                  <button
                    key={speed}
                    className={`popover-item${speed === rate ? ' active' : ''}`}
                    onClick={() => {
                      setRate(speed)
                      setSpeedOpen(false)
                    }}
                  >
                    <span>{speed.toFixed(2)}×</span>
                    {speed === 1 && <span style={{ fontSize: 10 }}>default</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {!isMobile && (
            <div className="volume">
              <button
                className="icon-btn"
                onClick={() => setVolume(volume > 0 ? 0 : 0.9)}
                title="Mute"
              >
                {volume === 0 ? <VolumeMute /> : <Volume />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={volume}
                onChange={(event) => setVolume(Number(event.target.value))}
                onWheel={(event) => {
                  event.preventDefault()
                  const delta = event.deltaY < 0 ? 0.05 : -0.05
                  setVolume(Math.max(0, Math.min(1, volume + delta)))
                }}
                // --vol drives the filled portion of the track gradient.
                style={{ ['--vol' as string]: `${volume * 100}%` }}
                title={`Volume ${Math.round(volume * 100)}%`}
              />
            </div>
          )}
        </div>
      </div>

      {isMobile && <MobileNav />}
    </div>
  )
}

/** Bottom tab bar — replaces the sidebar in mobile mode. */
function MobileNav(): JSX.Element {
  const settings = useStore((s) => s.settings)
  const view = useStore((s) => s.view)
  const setSettings = useStore((s) => s.setSettings)
  const navigate = useStore((s) => s.navigate)
  const openSearch = useStore((s) => s.openSearch)

  const onLibrary = view.kind !== 'settings'

  return (
    <nav className="mobile-nav">
      <button
        className={onLibrary && settings?.groupBy === 'album' ? 'active' : ''}
        onClick={() => {
          setSettings({ groupBy: 'album' })
          navigate({ kind: 'library' })
        }}
      >
        <Disc size={19} />
        <span>Albums</span>
      </button>
      <button
        className={onLibrary && settings?.groupBy === 'artist' ? 'active' : ''}
        onClick={() => {
          setSettings({ groupBy: 'artist' })
          navigate({ kind: 'library' })
        }}
      >
        <User size={19} />
        <span>Artists</span>
      </button>
      <button onClick={() => openSearch('')}>
        <SearchIcon size={19} />
        <span>Search</span>
      </button>
      <button
        className={view.kind === 'settings' ? 'active' : ''}
        onClick={() => navigate({ kind: 'settings' })}
      >
        <SettingsIcon size={19} />
        <span>Settings</span>
      </button>
    </nav>
  )
}
