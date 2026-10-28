// Your stack, as it appears on the rack. Each name must match the `uses` list
// in projects.ts for the key to light the projects built with it.
export type SkillGroup = { name: string; skills: string[] }

export const skillGroups: SkillGroup[] = [
  { name: 'Frontend', skills: ['HTML', 'CSS', 'JavaScript', 'React'] },
  { name: 'Backend', skills: ['Node.js', 'Express', 'Python'] },
  { name: 'Database', skills: ['MySQL'] },
  { name: 'Tools', skills: ['Git', 'GitHub', 'Figma', 'Docker', 'Linux', 'VS Code'] },
]

// Tools you work in every day but no project lists as a dependency.
export const dailyTools = ['Figma', 'Linux', 'VS Code']

export const defaultSkill = 'React'
