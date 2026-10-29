import { useState } from 'react'
import type { AgrixScreen, PlanifyScreen } from '../data/projects'
import { agrixHealth, clock, planWeek } from '../lib/screens'

// Each app shown as a working piece of its own interface, built in HTML
// because there are no screenshots yet. The data is sample data (projects.ts);
// the rules that turn it into numbers are the apps' own (lib/screens.ts).

// Agrix's words in English and in the Khmer its interface really ships
// (frontend/src/i18n/locale.js), so the language switch is the app's own.
const AGRIX = {
  en: {
    dashboard: 'Dashboard', live: 'Live', greeting: 'Good evening', doing: 'Here’s how your farm is doing.',
    health: 'Farm health', score: 'Health score', warning: 'Warning', healthy: 'Healthy', critical: 'Critical',
    attention: (n: string) => `${n} condition needs your attention`,
    moisture: 'Soil moisture', temperature: 'Soil temperature', ph: 'Soil pH', low: 'Low', normal: 'Normal', good: 'Good',
    history: 'Sensor history', recommendations: 'Recommendations', water: 'Water crops', waterWhy: 'Watering may be needed.', high: 'High',
    device: 'ESP32 farm device', online: 'Online', updated: 'Updated just now', language: 'Language',
  },
  km: {
    dashboard: 'ផ្ទាំងគ្រប់គ្រង', live: 'ផ្ទាល់', greeting: 'សាយណ្ហសួស្ដី', doing: 'នេះជាស្ថានភាពកសិដ្ឋានរបស់អ្នក។',
    health: 'សុខភាពកសិដ្ឋាន', score: 'ពិន្ទុសុខភាព', warning: 'ប្រយ័ត្ន', healthy: 'ល្អ', critical: 'ធ្ងន់ធ្ងរ',
    attention: (n: string) => `មានស្ថានភាព ${n} ត្រូវការការយកចិត្តទុកដាក់`,
    moisture: 'សំណើមដី', temperature: 'សីតុណ្ហភាពដី', ph: 'កម្រិត pH ដី', low: 'ទាប', normal: 'ធម្មតា', good: 'ល្អ',
    history: 'ប្រវត្តិឧបករណ៍', recommendations: 'ការណែនាំ', water: 'ស្រោចទឹកដំណាំ', waterWhy: 'អាចត្រូវការស្រោចទឹក។', high: 'ខ្ពស់',
    device: 'ឧបករណ៍កសិដ្ឋាន ESP32', online: 'បានភ្ជាប់', updated: 'ទើបតែធ្វើបច្ចុប្បន្នភាព', language: 'ភាសា',
  },
} as const

// The moisture line over the last day, with the 30% line it fell through.
function MoistureChart({ values, threshold, label }: { values: number[]; threshold: number; label: string }) {
  const w = 560, h = 180, lo = 24, hi = 44
  const x = (i: number) => (i / (values.length - 1)) * w
  const y = (v: number) => h - ((v - lo) / (hi - lo)) * h
  const last = values.length - 1
  return (
    <svg className="ax-chart" viewBox={`-36 -8 ${w + 48} ${h + 16}`} role="img" aria-label={label}>
      {[25, 30, 35, 40].map((v) => (
        <g key={v}>
          <line className={v === threshold ? 'ax-chart__limit' : 'ax-chart__grid'} x1="0" x2={w} y1={y(v)} y2={y(v)} />
          <text className="ax-chart__tick" x="-10" y={y(v)} dy="0.32em" textAnchor="end">{v}%</text>
        </g>
      ))}
      <polyline className="ax-chart__line" points={values.map((v, i) => `${x(i)},${y(v)}`).join(' ')} />
      <circle className="ax-chart__now" cx={x(last)} cy={y(values[last])} r="5" />
    </svg>
  )
}

export function AgrixScreenView({ screen }: { screen: AgrixScreen }) {
  const [lang, setLang] = useState<'en' | 'km'>('en')
  const t = AGRIX[lang]
  const num = new Intl.NumberFormat(lang === 'km' ? 'km-KH' : 'en-US', { maximumFractionDigits: 1 })
  const health = agrixHealth(screen)
  const { reading: r, thresholds: th } = screen
  const state = { moisture: r.moisture < th.moisture ? t.low : t.normal, temperature: r.temperature > th.temperature ? t.high : t.normal, ph: r.ph < th.ph ? t.low : t.good }

  return (
    <div className="ax" data-ui lang={lang}>
      <div className="ax__upper">
        <header className="ax__bar">
          <span className="ax__mark">Agrix</span>
          <span className="ax__nav">{t.dashboard}</span>
          <span className="ax__farm">{screen.farm}</span>
          <div className="ax__lang" role="group" aria-label={t.language}>
            <button type="button" aria-pressed={lang === 'en'} onClick={() => setLang('en')} lang="en">English</button>
            <button type="button" aria-pressed={lang === 'km'} onClick={() => setLang('km')} lang="km">ខ្មែរ</button>
          </div>
          <span className="ax__live"><span className="ax__dot" aria-hidden="true" />{t.live}</span>
        </header>
        <div className="ax__hello">
          <p className="ax__greeting">{t.greeting}</p>
          <p className="ax__doing">{t.doing}</p>
        </div>
        <div className="ax__kpis">
          <div className="ax__kpi ax__kpi--health">
            <p className="ax__label">{t.score}</p>
            <p className="ax__value">{num.format(health.score)}<span className="ax__of">/{num.format(100)}</span></p>
            <p className="ax__note"><span className="ax__state" data-state={health.status}>{t[health.status]}</span> {t.attention(num.format(health.broken.length))}</p>
          </div>
          <div className="ax__kpi" data-broken={health.broken.includes('moisture') || undefined}>
            <p className="ax__label">{t.moisture}</p>
            <p className="ax__value">{num.format(r.moisture)}<span className="ax__of">%</span></p>
            <p className="ax__note">{state.moisture} · {num.format(th.moisture)}%</p>
          </div>
          <div className="ax__kpi">
            <p className="ax__label">{t.temperature}</p>
            <p className="ax__value">{num.format(r.temperature)}<span className="ax__of">°C</span></p>
            <p className="ax__note">{state.temperature} · {num.format(th.temperature)}°C</p>
          </div>
          <div className="ax__kpi">
            <p className="ax__label">{t.ph}</p>
            <p className="ax__value">{num.format(r.ph)}</p>
            <p className="ax__note">{state.ph} · {num.format(th.ph)}</p>
          </div>
        </div>
      </div>
      <div className="ax__lower">
        <section className="ax__panel ax__panel--chart">
          <p className="ax__title">{t.history} <span className="ax__sub">{t.moisture}</span></p>
          <MoistureChart values={screen.moistureDay} threshold={th.moisture} label={`${t.moisture}: ${screen.moistureDay[0]}% → ${r.moisture}%`} />
        </section>
        <section className="ax__panel">
          <p className="ax__title">{t.recommendations}</p>
          <div className="ax__rec">
            <p className="ax__rec-title">{t.water} <span className="ax__priority">{t.high}</span></p>
            <p className="ax__rec-why">{t.waterWhy} {num.format(r.moisture)}% &lt; {num.format(th.moisture)}%</p>
          </div>
          <div className="ax__device">
            <p className="ax__rec-title">{t.device}</p>
            <p className="ax__rec-why"><span className="ax__dot" aria-hidden="true" />{t.online} · {t.updated}</p>
          </div>
        </section>
      </div>
    </div>
  )
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
const hours = (min: number) => (min % 60 ? `${Math.floor(min / 60)} h ${min % 60} min` : `${min / 60} h`)

export function PlanifyScreenView({ screen }: { screen: PlanifyScreen }) {
  const plan = planWeek(screen)
  const [day, setDay] = useState(0)
  const today = plan.blocks.filter((b) => b.day === day)
  const load = DAYS.map((_, d) => plan.blocks.filter((b) => b.day === d).reduce((sum, b) => sum + b.end - b.start, 0))
  const most = Math.max(...load)

  return (
    <div className="pf" data-ui>
      <div className="pf__upper">
        <header className="pf__bar">
          <span className="pf__mark">Planify</span>
          <span className="pf__nav">AI schedule</span>
          <span className="pf__provider">Local fallback</span>
          <span className="pf__window">Focus {screen.window[0]}–{screen.window[1]} · {screen.sessionMinutes} min sessions</span>
        </header>
        <dl className="pf__metrics">
          <div><dt>Blocks</dt><dd>{plan.blocks.length}</dd></div>
          <div><dt>Focus time</dt><dd>{hours(plan.focus)}</dd></div>
          <div><dt>High priority</dt><dd>{hours(plan.high)}</dd></div>
          <div><dt>Next deadline</dt><dd>{DAY_NAMES[plan.nextDue]}</dd></div>
        </dl>
        <div className="pf__days" role="group" aria-label="Day">
          {DAYS.map((d, i) => (
            <button type="button" key={d} aria-pressed={day === i} onClick={() => setDay(i)}>
              <span className="pf__day">{d}</span>
              <span className="pf__count">{plan.blocks.filter((b) => b.day === i).length || '–'}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="pf__lower">
        <ol className="pf__blocks" aria-label={`${DAY_NAMES[day]}’s focus blocks`}>
          {today.length === 0 && <li className="pf__empty">Nothing planned. Every task fits before Friday.</li>}
          {today.map((b) => (
            <li className="pf__block" data-priority={b.task.priority} key={`${b.task.name}-${b.start}`}>
              <span className="pf__time">{clock(b.start)}–{clock(b.end)}</span>
              <span className="pf__task">{b.task.name}</span>
              <span className="pf__meta">{b.task.subject}{b.task.group ? ' · group' : ''} · due {DAY_NAMES[b.task.due]}</span>
              <span className="pf__priority">{b.task.priority}</span>
            </li>
          ))}
        </ol>
        <section className="pf__load">
          <p className="pf__title">Weekly load</p>
          <ul className="pf__bars">
            {load.map((m, i) => (
              <li key={DAYS[i]} data-today={i === day || undefined}>
                <span className="pf__fill" style={{ blockSize: `${most ? (m / most) * 100 : 0}%` }} />
                <span className="pf__day">{DAYS[i]}</span>
                <span className="pf__mins">{m ? hours(m) : '–'}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}
