// Reads a colour token as an element sees it (the page root by default) and
// resolves it to sRGB (0 to 1), so the WebGL scenes paint with the CSS colours.
export function tokenRGB(name: string, el: Element = document.documentElement): [number, number, number] {
  const value = getComputedStyle(el).getPropertyValue(name).trim()
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 1
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx || !value) return [1, 1, 1]
  ctx.fillStyle = value
  ctx.fillRect(0, 0, 1, 1)
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data
  return [r / 255, g / 255, b / 255]
}

// A 160px noise tile, set as --grain for the night and the panels.
export function paintGrain() {
  const size = 160
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const img = ctx.createImageData(size, size)
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 96 + Math.random() * 64
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v
    img.data[i + 3] = 255
  }
  ctx.putImageData(img, 0, 0)
  document.documentElement.style.setProperty('--grain', `url(${canvas.toDataURL()})`)
}
