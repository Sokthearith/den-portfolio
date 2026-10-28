// Your projects. Put the best one first. `uses` lists the skills from
// skills.ts that this project is built with; `stack` is everything shown.
// Each case shows how it works: `system` draws the parts and what flows
// between them, `flow` numbers the steps of its one clever job.
export type Part = { name: string; detail: string; uses?: string[] }

export type Project = {
  id: string
  name: string
  line: string
  stack: { label: string; items: string[] }[]
  uses: string[]
  github: string
  system?: { caption: string; parts: Part[]; branch: Part & { from: number } }
  flow?: { caption: string; steps: Part[] }
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
    system: {
      caption: 'How a reading travels',
      parts: [
        { name: 'ESP32', detail: 'posts with a device key' },
        { name: 'Express API', detail: 'checks, stores, decides', uses: ['Node.js', 'Express', 'JavaScript'] },
        { name: 'PostgreSQL', detail: 'on Supabase, via Prisma', uses: ['Docker'] },
        { name: 'Dashboard', detail: 'health, history, advice', uses: ['React', 'JavaScript', 'HTML', 'CSS'] },
      ],
      branch: { from: 1, name: 'Telegram', detail: 'alerts on bad readings' },
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
    flow: {
      caption: 'How a schedule gets made',
      steps: [
        { name: 'Gemini drafts it', detail: 'from your tasks and deadlines' },
        { name: 'The API checks it', detail: 'and falls back to a local plan', uses: ['Node.js', 'Express', 'JavaScript'] },
        { name: 'Every tab gets it', detail: 'saved in MySQL, pushed by Socket.IO', uses: ['MySQL', 'React'] },
      ],
    },
    github: 'https://github.com/Sokthearith/Planify',
  },
]

export const projectsUsing = (skill: string) => projects.filter((p) => p.uses.includes(skill))
