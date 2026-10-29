// Without a GPU the browser draws WebGL on the CPU, where every frame is
// expensive; the scenes hold still there instead of following the page.
const SOFTWARE = /swiftshader|llvmpipe|softpipe|software|basic render/i

export function isSoftware(gl: WebGLRenderingContext | WebGL2RenderingContext) {
  const info = gl.getExtension('WEBGL_debug_renderer_info')
  const name = info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)
  return SOFTWARE.test(String(name))
}
