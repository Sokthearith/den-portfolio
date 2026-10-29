import { useEffect, useState, type CSSProperties } from 'react'
import type { Listening } from '../lib/now'
import { ago } from '../lib/time'

const clock = (ms: number) => {
  const s = Math.max(0, Math.round(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

// The cover's average colour, so the display glows the colour of the record.
// Spotify's image host allows the read; if anything fails, the display keeps
// the panel's own colour.
function useArtColour(url: string | null | undefined) {
  const [colour, setColour] = useState<string | null>(null)
  useEffect(() => {
    if (!url) return
    let alive = true
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const c = document.createElement('canvas')
        c.width = c.height = 8
        const ctx = c.getContext('2d', { willReadFrequently: true })!
        ctx.drawImage(img, 0, 0, 8, 8)
        const d = ctx.getImageData(0, 0, 8, 8).data
        let r = 0, g = 0, b = 0
        for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2] }
        const n = d.length / 4
        if (alive) setColour(`rgb(${Math.round(r / n)} ${Math.round(g / n)} ${Math.round(b / n)})`)
      } catch { /* a tainted canvas: keep the panel colour */ }
    }
    img.src = url
    return () => { alive = false }
  }, [url])
  return colour
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

// The night shift's radio: a machined receiver with the record's cover, a
// display lit in the record's colour, the song's place in time, and the tape
// of what played before it.
export default function Receiver({ listening }: { listening: Listening }) {
  const track = listening.track!
  const colour = useArtColour(track.art)
  const { elapsed, share } = useProgress(listening)
  const recent = listening.recent ?? []
  const onAir = Boolean(listening.playing)

  return (
    <div className="radio panel" data-reveal data-on-air={onAir} style={colour ? ({ '--art': colour } as CSSProperties) : undefined}>
      <div className="radio__top">
        <h3>Listening</h3>
        <p className="radio__state" role="status">
          {onAir ? 'On air' : listening.playedAt ? `Off air, last played ${ago(listening.playedAt)}` : 'Off air'}
        </p>
      </div>

      <div className="radio__face">
        {track.art && <img className="radio__art" src={track.art} alt={`Cover of ${track.album}`} width={300} height={300} loading="lazy" />}
        <div className="radio__screen">
          <p className="radio__title">
            <a href={track.url} target="_blank" rel="noreferrer">{track.title}</a>
          </p>
          <p className="radio__artist">{track.artist}</p>
          <div className="radio__rail" role="progressbar" aria-label="Song position" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(share * 100)} aria-valuetext={onAir ? `${clock(elapsed)} of ${clock(track.durationMs)}` : 'not playing'}>
            <span className="radio__fill" style={{ transform: `scaleX(${onAir ? share : 0})` }} />
          </div>
          <p className="radio__times">
            <span>{onAir ? clock(elapsed) : '0:00'}</span>
            <span>{clock(track.durationMs)}</span>
          </p>
        </div>
      </div>

      {recent.length > 0 && (
        <div className="radio__tape">
          <h4>Before that</h4>
          <ol>
            {recent.map((p) => (
              <li key={`${p.url}-${p.playedAt}`}>
                <a href={p.url} target="_blank" rel="noreferrer">
                  <span className="radio__song">{p.title}</span>
                  <span className="radio__by">{p.artist}</span>
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
