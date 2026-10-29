// Your projects. Put the best one first. `uses` lists the skills from
// skills.ts that this project is built with; `stack` is everything shown.
// Each case comes apart into its real layers: `anatomy` lists them from the
// screen on top down to where the data starts, each drawn as `draw`, with
// one optional branch off a layer. `screen` is the sample data its interface
// fragment shows, until there are screenshots.
export type Part = { name: string; detail: string; uses?: string[] }
export type LayerDraw = 'screen' | 'postgres' | 'api' | 'esp32' | 'telegram' | 'socket' | 'mysql' | 'check' | 'gemini'
export type Layer = Part & { draw: LayerDraw }

// Agrix's dashboard: one reading against the app's default thresholds
// (backend/src/config/env.js), and the soil moisture over the last day.
export type AgrixScreen = {
  kind: 'agrix'
  farm: string
  reading: { moisture: number; temperature: number; ph: number }
  thresholds: { moisture: number; ph: number; temperature: number }
  moistureDay: number[]
}

// Planify's week: the tasks its local planner places, with the planning
// preferences it honours.
export type PlanTask = { name: string; subject: string; priority: 'high' | 'medium' | 'low'; due: number; hours: number; group?: boolean }
export type PlanifyScreen = {
  kind: 'planify'
  window: [start: string, end: string]
  sessionMinutes: number
  tasks: PlanTask[]
}

export type Project = {
  id: string
  name: string
  line: string
  stack: { label: string; items: string[] }[]
  uses: string[]
  github: string
  anatomy: { caption: string; figure: string; layers: Layer[]; branch?: Layer & { from: string } }
  screen?: AgrixScreen | PlanifyScreen
  // Screenshots go here once you have them, e.g.
  // { src: '/work/agrix/dashboard.png', alt: 'The Agrix dashboard with one farm open' }
  images?: { src: string; alt: string }[]
}

export const projects: Project[] = [
  {
    id: 'agrix',
    name: 'Agrix',
    line: 'A smart farming dashboard for live sensor data, in English and Khmer.',
    stack: [
      { label: 'Frontend', items: ['React', 'Vite', 'Tailwind CSS', 'Recharts'] },
      { label: 'Backend', items: ['Node.js', 'Express', 'Prisma', 'JWT'] },
      { label: 'Data', items: ['PostgreSQL', 'Docker'] },
    ],
    uses: ['HTML', 'CSS', 'JavaScript', 'React', 'Node.js', 'Express', 'Docker', 'Git', 'GitHub'],
    anatomy: {
      caption: 'How a reading travels',
      figure: 'Agrix, taken apart',
      layers: [
        { name: 'Dashboard', detail: 'health, history and advice', uses: ['React', 'JavaScript', 'HTML', 'CSS'], draw: 'screen' },
        { name: 'PostgreSQL', detail: 'on Supabase, via Prisma', uses: ['Docker'], draw: 'postgres' },
        { name: 'Express API', detail: 'checks, stores, decides', uses: ['Node.js', 'Express', 'JavaScript'], draw: 'api' },
        { name: 'ESP32', detail: 'posts each reading with a device key', draw: 'esp32' },
      ],
      branch: { name: 'Telegram', detail: 'alerts on bad readings', draw: 'telegram', from: 'Express API' },
    },
    // Sample: one dry evening on one field. 27% is under the 30% line, so
    // the app's own rule takes 20 off the health score and asks for water.
    screen: {
      kind: 'agrix',
      farm: 'Field B',
      reading: { moisture: 27, temperature: 29.4, ph: 6.2 },
      thresholds: { moisture: 30, ph: 5.5, temperature: 35 },
      moistureDay: [41, 41, 40, 40, 39, 39, 38, 38, 37, 36, 35, 34, 33, 33, 32, 32, 31, 31, 30, 30, 29, 28, 28, 27],
    },
    github: 'https://github.com/Sokthearith/Agrix01',
  },
  {
    id: 'planify',
    name: 'Planify',
    line: 'A study planner for tasks, groups and schedules, live in every tab.',
    stack: [
      { label: 'Frontend', items: ['React', 'Vite'] },
      { label: 'Backend', items: ['Node.js', 'Express', 'Sequelize', 'Socket.IO'] },
      { label: 'Data', items: ['MySQL', 'Gemini API'] },
    ],
    uses: ['HTML', 'CSS', 'JavaScript', 'React', 'Node.js', 'Express', 'MySQL', 'Git', 'GitHub'],
    anatomy: {
      caption: 'How a schedule gets made',
      figure: 'Planify, taken apart',
      layers: [
        { name: 'The week', detail: 'every block by day, live in React', uses: ['React', 'JavaScript', 'HTML', 'CSS'], draw: 'screen' },
        { name: 'Socket.IO', detail: 'pushes the plan to every open tab', draw: 'socket' },
        { name: 'MySQL', detail: 'keeps the plan, through Sequelize', uses: ['MySQL'], draw: 'mysql' },
        { name: 'The API check', detail: 'rejects overlaps, or falls back to a local plan', uses: ['Node.js', 'Express', 'JavaScript'], draw: 'check' },
        { name: 'Gemini', detail: 'drafts the week from your tasks and deadlines', draw: 'gemini' },
      ],
    },
    // Sample: a student's week of coursework, evenings after class. `due` is
    // the weekday it is due, Monday = 0.
    screen: {
      kind: 'planify',
      window: ['17:00', '21:00'],
      sessionMinutes: 60,
      tasks: [
        { name: 'Linked list lab', subject: 'Data structures', priority: 'high', due: 2, hours: 3 },
        { name: 'ER diagram for the library system', subject: 'Databases', priority: 'high', due: 3, hours: 2 },
        { name: 'Sprint review notes', subject: 'Group project', priority: 'medium', due: 4, hours: 1, group: true },
        { name: 'Read chapter 4: processes', subject: 'Operating systems', priority: 'medium', due: 4, hours: 2 },
        { name: 'Probability practice quiz', subject: 'Statistics', priority: 'low', due: 3, hours: 1 },
        { name: 'Essay outline', subject: 'English', priority: 'low', due: 4, hours: 1.5 },
      ],
    },
    github: 'https://github.com/Sokthearith/Planify',
  },
]

export const projectsUsing = (skill: string) => projects.filter((p) => p.uses.includes(skill))
