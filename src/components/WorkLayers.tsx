import type { AgrixScreen, LayerDraw, PlanifyScreen } from '../data/projects'
import { clock, planWeek } from '../lib/screens'

// The layers under each app's screen, drawn flat on a 1200 × 700 face (the
// branch on 520 × 340) in the room's colours. Every word on them is the
// app's own: its routes, its table's columns, its alert, its checks.

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
const short = (name: string, max = 22) => (name.length > max ? `${name.slice(0, max - 1)}…` : name)

function Esp32() {
  const pins = Array.from({ length: 13 }, (_, i) => 196 + i * 22)
  return (
    <svg viewBox="0 0 1200 700" aria-hidden="true">
      {[[60, 60], [1140, 60], [60, 640], [1140, 640]].map(([x, y]) => <circle key={`${x}${y}`} className="xpd-bg" cx={x} cy={y} r="16" />)}
      <rect className="xpd-mid" x="380" y="110" width="380" height="60" />
      <path className="xpd-line xpd-line--ink" d="M400 150 h40 v-24 h30 v24 h30 v-24 h30 v24 h30 v-24 h30 v24 h30 v-24 h30 v24 h30 v-24 h30 v24 h60" />
      <rect className="xpd-mid" x="380" y="170" width="380" height="320" />
      <rect className="xpd-metal" x="414" y="204" width="312" height="200" />
      <text className="xpd-t xpd-t--big" x="570" y="326" textAnchor="middle">ESP32</text>
      {pins.map((y) => <rect key={`l${y}`} className="xpd-pin" x="356" y={y} width="24" height="10" />)}
      {pins.map((y) => <rect key={`r${y}`} className="xpd-pin" x="760" y={y} width="24" height="10" />)}
      <rect className="xpd-bg" x="540" y="490" width="60" height="44" />
      {/* The three probes' leads: moisture, temperature, pH. */}
      {[214, 346, 478].map((y, i) => (
        <g key={y}>
          <path className="xpd-wire" d={`M784 ${y + 20 - i * 8} H900 V${y + 30} H1000`} />
          <rect className="xpd-metal" x="1000" y={y} width="120" height="64" />
          <rect className="xpd-bg" x="1016" y={y + 16} width="88" height="32" />
        </g>
      ))}
      <rect className="xpd-mid" x="120" y="250" width="160" height="200" />
      <circle className="xpd-bg" cx="200" cy="350" r="52" />
    </svg>
  )
}

function Api() {
  const routes = [['POST', '/sensors/data'], ['GET', '/sensors/latest'], ['GET', '/sensors/history'], ['GET', '/recommendations']]
  return (
    <svg viewBox="0 0 1200 700" aria-hidden="true">
      <text className="xpd-t xpd-t--head" x="140" y="110">Express</text>
      {routes.map(([method, path], i) => (
        <g key={path}>
          <rect className="xpd-mid" x="140" y={150 + i * 120} width="920" height="96" />
          <text className="xpd-t" x="180" y={210 + i * 120}>{method}</text>
          <text className="xpd-t xpd-t--muted" x="330" y={210 + i * 120}>{path}</text>
        </g>
      ))}
    </svg>
  )
}

function Postgres({ screen }: { screen: AgrixScreen }) {
  const rows = screen.moistureDay.slice(-4)
  const ago = ['3 h ago', '2 h ago', '1 h ago', 'now']
  const cols = [160, 430, 660, 860]
  return (
    <svg viewBox="0 0 1200 700" aria-hidden="true">
      <text className="xpd-t xpd-t--head" x="140" y="110">SensorData</text>
      <rect className="xpd-mid" x="120" y="150" width="960" height="84" />
      {['temperature', 'moisture', 'ph', 'createdAt'].map((c, i) => <text key={c} className="xpd-t xpd-t--muted" x={cols[i]} y="205">{c}</text>)}
      {rows.map((m, r) => (
        <g key={r}>
          <rect className="xpd-mid" x="120" y={322 + r * 92} width="960" height="4" />
          {[screen.reading.temperature, m, screen.reading.ph, ago[r]].map((v, i) => <text key={i} className="xpd-t" x={cols[i]} y={296 + r * 92}>{v}</text>)}
        </g>
      ))}
    </svg>
  )
}

function Telegram({ screen }: { screen: AgrixScreen }) {
  return (
    <svg viewBox="0 0 520 340" aria-hidden="true">
      <rect className="xpd-mid" x="40" y="70" width="440" height="200" />
      <text className="xpd-t xpd-t--muted" x="72" y="128">Agrix</text>
      <text className="xpd-t" x="72" y="186">Moisture is low at {screen.reading.moisture}%.</text>
      <text className="xpd-t" x="72" y="238">Water required.</text>
    </svg>
  )
}

function Gemini({ screen }: { screen: PlanifyScreen }) {
  const blocks = planWeek(screen).blocks.slice(0, 4)
  return (
    <svg viewBox="0 0 1200 700" aria-hidden="true">
      <text className="xpd-t xpd-t--head" x="140" y="110">gemini-2.5-flash</text>
      {blocks.map((b, i) => (
        <g key={`${b.task.name}${b.start}`}>
          <rect className="xpd-mid" x="140" y={150 + i * 120} width="920" height="96" />
          <text className="xpd-t" x="180" y={210 + i * 120}>{short(b.task.name, 26)}</text>
          <text className="xpd-t xpd-t--muted" x="1020" y={210 + i * 120} textAnchor="end">{DAYS[b.day]} {clock(b.start)}–{clock(b.end)}</text>
        </g>
      ))}
    </svg>
  )
}

function Check() {
  const checks = ['No overlaps', 'Inside the focus window', 'Before each deadline']
  return (
    <svg viewBox="0 0 1200 700" aria-hidden="true">
      {checks.map((c, i) => (
        <g key={c}>
          <rect className="xpd-mid" x="120" y={130 + i * 130} width="620" height="100" />
          <rect className="xpd-bg" x="150" y={155 + i * 130} width="50" height="50" />
          <path className="xpd-tick" d={`M160 ${181 + i * 130} l12 12 l20 -26`} />
          <text className="xpd-t" x="230" y={194 + i * 130}>{c}</text>
        </g>
      ))}
      <path className="xpd-wire" d="M740 310 H820" />
      <rect className="xpd-mid" x="820" y="230" width="280" height="160" />
      <text className="xpd-t" x="850" y="300">Local</text>
      <text className="xpd-t" x="850" y="350">fallback</text>
    </svg>
  )
}

function Mysql({ screen }: { screen: PlanifyScreen }) {
  const blocks = planWeek(screen).blocks.slice(0, 4)
  const cols = [160, 640, 780, 930]
  return (
    <svg viewBox="0 0 1200 700" aria-hidden="true">
      <text className="xpd-t xpd-t--head" x="140" y="110">planData.entries</text>
      <rect className="xpd-mid" x="120" y="150" width="960" height="84" />
      {['taskName', 'day', 'startTime', 'endTime'].map((c, i) => <text key={c} className="xpd-t xpd-t--muted" x={cols[i]} y="205">{c}</text>)}
      {blocks.map((b, r) => (
        <g key={`${b.task.name}${b.start}`}>
          <rect className="xpd-mid" x="120" y={322 + r * 92} width="960" height="4" />
          {[short(b.task.name), DAYS[b.day], clock(b.start), clock(b.end)].map((v, i) => <text key={i} className="xpd-t" x={cols[i]} y={296 + r * 92}>{v}</text>)}
        </g>
      ))}
    </svg>
  )
}

function Socket() {
  return (
    <svg viewBox="0 0 1200 700" aria-hidden="true">
      {[110, 450, 790].map((x) => (
        <g key={x}>
          <rect className="xpd-mid" x={x} y="110" width="300" height="320" />
          <rect className="xpd-bg" x={x} y="110" width="300" height="44" />
          {[190, 250, 310].map((y) => <rect key={y} className="xpd-bg" x={x + 28} y={y} width={y === 310 ? 150 : 244} height="34" />)}
          <path className="xpd-wire" d={`M600 590 L${x + 150} 430`} />
        </g>
      ))}
      <circle className="xpd-ink" cx="600" cy="590" r="34" />
    </svg>
  )
}

export function LayerDrawing({ draw, agrix, planify }: { draw: LayerDraw; agrix?: AgrixScreen; planify?: PlanifyScreen }) {
  switch (draw) {
    case 'esp32': return <Esp32 />
    case 'api': return <Api />
    case 'postgres': return agrix ? <Postgres screen={agrix} /> : null
    case 'telegram': return agrix ? <Telegram screen={agrix} /> : null
    case 'gemini': return planify ? <Gemini screen={planify} /> : null
    case 'check': return <Check />
    case 'mysql': return planify ? <Mysql screen={planify} /> : null
    case 'socket': return <Socket />
    default: return null
  }
}
