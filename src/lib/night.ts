// What the hero hands the night each frame, kept in a ref so pointer moves and
// scrolling never re-render React. Positions are CSS pixels from the canvas's
// top left; `lit` holds the windows a visitor turned on, as x (0 to 1 across),
// row (0 to 3) and the second they lit, with x < 0 for an empty slot.
export const MAX_LIT = 12

export type NightInput = {
  x: number
  y: number
  inside: boolean
  exit: number
  lightsOut: number
  lit: Float32Array
  next: number
  invalidate?: () => void
}

export const createNightInput = (): NightInput => ({
  x: 0,
  y: 0,
  inside: false,
  exit: 0,
  lightsOut: 0,
  lit: new Float32Array(MAX_LIT * 3).fill(-1),
  next: 0,
})

export const nightClock = () => performance.now() / 1000

// Turns on a window at a fraction of the width, in a free-ish row.
export function lightWindow(input: NightInput, x: number, instant: boolean) {
  const i = input.next % MAX_LIT
  input.lit[i * 3] = x
  input.lit[i * 3 + 1] = Math.floor(Math.random() * 4)
  input.lit[i * 3 + 2] = nightClock() - (instant ? 10 : 0)
  input.next += 1
  input.invalidate?.()
}
