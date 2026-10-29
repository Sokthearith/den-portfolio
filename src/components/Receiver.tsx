import { useEffect, useState } from 'react'
import type { Listening } from '../lib/now'
import { ago } from '../lib/time'

const clock = (ms: number) => {
  const s = Math.max(0, Math.round(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

// Where the song is now: the server's position plus the time since it said
// so, ticking once a second while the song plays.
function useProgress(l: Listening) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!l.playing) return
    const id = window.setInterval(() => { if (!document.hidden) setNow(Date.now()) }, 1000)
    return () => window.clearInterval(id)
  }, [l.playing])
  if (!l.track) return { elapsed: 0, share: 0 }
  const duration = l.track.durationMs || 1
  const elapsed = l.playing && l.at !== undefined ? Math.min(duration, (l.progressMs ?? 0) + (now - l.at)) : 0
  return { elapsed, share: elapsed / duration }
}

// The night shift's radio: the record playing or last played, its place in
// time, and the tape of what played before it, each with its cover.
export default function Receiver({ listening }: { listening: Listening }) {
  const track = listening.track!
  const { elapsed, share } = useProgress(listening)
  const recent = listening.recent ?? []
  const onAir = Boolean(listening.playing)

  return (
    <div className="tuner" data-reveal data-on-air={onAir}>
      <h3>Listening</h3>
      <p className="tuner__state" role="status">
        {onAir ? 'On air' : listening.playedAt ? `Off air, last played ${ago(listening.playedAt)}` : 'Off air'}
      </p>

      <div className="tuner__face">
        {track.art && <img className="tuner__art" src={track.art} alt={`Cover of ${track.album}`} width={300} height={300} loading="lazy" />}
        <div className="tuner__screen">
          <p className="tuner__title">
            <a href={track.url} target="_blank" rel="noreferrer">{track.title}</a>
          </p>
          <p className="tuner__artist">{track.artist}</p>
        </div>
      </div>
      <div className="tuner__rail" role="progressbar" aria-label="Song position" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(share * 100)} aria-valuetext={onAir ? `${clock(elapsed)} of ${clock(track.durationMs)}` : 'not playing'}>
        <span className="tuner__fill" style={{ transform: `scaleX(${onAir ? share : 0})` }} />
      </div>
      <p className="tuner__times">
        <span>{onAir ? clock(elapsed) : '0:00'}</span>
        <span>{clock(track.durationMs)}</span>
      </p>

      {recent.length > 0 && (
        <div className="tuner__tape">
          <h4>Before that</h4>
          <ol>
            {recent.map((p) => (
              <li key={`${p.url}-${p.playedAt}`}>
                {p.art ? <img src={p.art} alt="" width={300} height={300} loading="lazy" /> : <span className="tuner__blank" />}
                <a href={p.url} target="_blank" rel="noreferrer">
                  <span className="tuner__song">{p.title}</span>
                  <span className="tuner__by">{p.artist}</span>
                </a>
                <time dateTime={p.playedAt}>{ago(p.playedAt)}</time>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}
