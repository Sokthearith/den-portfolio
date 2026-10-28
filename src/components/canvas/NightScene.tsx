import { useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { ShaderMaterial, Vector2, Vector3 } from 'three'
import { tokenRGB } from '../../lib/tokens'

// The night drawn as light: slow ribbons over a low horizon and a far row of
// lit windows, one of them amber. One full-screen shader, transparent, over
// the CSS sky in .night. The horizon sits at HORIZON from the bottom, the same
// line the CSS gradient draws.
export const HORIZON = 0.18
const START_TIME = 40 // a settled frame for the still and reduced-motion views
const FPS = 30

// Without a GPU the browser draws WebGL on the CPU; there the night stays still.
const SOFTWARE = /swiftshader|llvmpipe|softpipe|software|basic render/i
function isSoftware(gl: WebGLRenderingContext | WebGL2RenderingContext) {
  const info = gl.getExtension('WEBGL_debug_renderer_info')
  const name = info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)
  return SOFTWARE.test(String(name))
}

const vertex = /* glsl */ `
  void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }
`

const fragment = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform vec2 uRes;
  uniform float uDpr;
  uniform float uHorizon;
  uniform vec3 uRibbon;
  uniform vec3 uWindow;
  uniform vec3 uAccent;

  float hash(float n) { return fract(sin(n * 127.1) * 43758.5453); }

  void main() {
    vec2 px = gl_FragCoord.xy;
    vec2 p = px / uRes;
    float aspect = uRes.x / uRes.y;
    vec3 col = vec3(0.0);
    float alpha = 0.0;

    // Ribbons: long soft lines that breathe across the sky, 70 to 120s a cycle.
    for (int i = 0; i < 7; i++) {
      float fi = float(i);
      float base = uHorizon + 0.05 + fi * 0.1 + 0.03 * hash(fi + 3.0);
      float freq = 0.9 + hash(fi) * 1.4;
      float speed = 0.05 + hash(fi + 7.0) * 0.04;
      float y = base
        + 0.04 * sin(p.x * aspect * freq + uTime * speed + fi * 1.7)
        + 0.015 * sin(p.x * aspect * freq * 2.3 - uTime * speed * 0.6 + fi);
      float d = abs(p.y - y) * uRes.y / uDpr;
      float core = exp(-d * d / 2.2);
      float halo = exp(-d / 56.0);
      float along = smoothstep(0.0, 0.25, p.x) * smoothstep(1.0, 0.7, p.x);
      float pulse = 0.35 + 0.65 * (0.5 + 0.5 * sin(p.x * 2.4 - uTime * 0.07 + fi * 2.1));
      float k = (core * 0.42 + halo * 0.2) * along * pulse * (0.45 + 0.55 * hash(fi + 11.0));
      col += uRibbon * k;
      alpha += k;
    }

    // The far row: windows in clusters just above the horizon.
    float cellW = 9.0 * uDpr;
    float cell = floor(px.x / cellW);
    float town = step(0.34, hash(floor(cell / 10.0) + 31.0));
    float lit = step(0.5, hash(cell + 1.0)) * town;
    float flick = mix(1.0, step(0.0, sin(uTime * 0.04 + hash(cell + 5.0) * 60.0)), step(0.88, hash(cell + 9.0)));
    float row = floor(hash(cell + 2.0) * 4.0);
    vec2 c = vec2((cell + 0.5) * cellW, uHorizon * uRes.y + (row * 8.0 + 4.0) * uDpr);
    float dw = length(px - c) / uDpr;
    float win = (exp(-dw * dw / 2.2) + exp(-dw / 6.0) * 0.22) * lit * flick * (0.35 + 0.65 * hash(cell + 3.0));
    col += uWindow * win;
    alpha += win;

    // The one lit window.
    vec2 a = vec2(0.64 * uRes.x, uHorizon * uRes.y + 11.0 * uDpr);
    float da = length(px - a) / uDpr;
    float amber = exp(-da * da / 6.0) + exp(-da / 14.0) * 0.45;
    col += uAccent * amber;
    alpha += amber;

    // Their light on the water below the horizon: long, broken, slow.
    float below = uHorizon * uRes.y - px.y;
    if (below > 0.0) {
      float depth = below / uDpr;
      float fade = exp(-depth / 46.0);
      float shimmer = 0.65 + 0.35 * sin(depth * 0.11 + uTime * 0.5 + hash(cell + 4.0) * 6.0);
      float dx = abs(px.x - c.x) / uDpr;
      float refl = exp(-dx * dx / 1.5) * lit * flick * (0.35 + 0.65 * hash(cell + 3.0)) * fade * shimmer * 0.26;
      float ax = abs(px.x - a.x) / uDpr;
      float ra = exp(-ax * ax / 4.0) * exp(-depth / 120.0) * (0.5 + 0.5 * sin(depth * 0.28 + uTime * 0.5)) * 0.5;
      col += uWindow * refl + uAccent * ra;
      alpha += refl + ra;
    }

    gl_FragColor = vec4(col, clamp(alpha, 0.0, 1.0));
  }
`

function Night({ running }: { running: boolean }) {
  const time = useRef(START_TIME)
  const size = useThree((s) => s.size)
  const invalidate = useThree((s) => s.invalidate)

  const material = useMemo(() => {
    const v = (rgb: [number, number, number]) => new Vector3(...rgb)
    return new ShaderMaterial({
      vertexShader: vertex,
      fragmentShader: fragment,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      premultipliedAlpha: true,
      uniforms: {
        uTime: { value: START_TIME },
        uRes: { value: new Vector2(1, 1) },
        uDpr: { value: 1 },
        uHorizon: { value: HORIZON },
        uRibbon: { value: v(tokenRGB('--color-muted')) },
        uWindow: { value: v(tokenRGB('--color-ink-2')) },
        uAccent: { value: v(tokenRGB('--color-accent')) },
      },
    })
  }, [])

  // The horizon comes from the hero's --horizon, so the CSS land and the drawn
  // windows always share one line; a still night redraws on resize.
  useEffect(() => {
    const hero = document.querySelector('.hero')
    const h = hero ? parseFloat(getComputedStyle(hero).getPropertyValue('--horizon')) / 100 : NaN
    material.uniforms.uHorizon.value = Number.isFinite(h) ? h : HORIZON
    invalidate()
  }, [size, invalidate, material])

  // The night moves on a 70 to 120 second cycle, so 30 frames a second is
  // plenty; drawing on demand at that pace halves the GPU's work.
  useEffect(() => {
    if (!running) return
    const id = window.setInterval(() => invalidate(), 1000 / FPS)
    return () => window.clearInterval(id)
  }, [running, invalidate])

  // Read the real drawing buffer each frame, so the horizon always meets the
  // CSS one whatever size or pixel ratio the canvas settled on.
  useFrame(({ gl }, delta) => {
    if (running) time.current += Math.min(delta, 0.1)
    gl.getDrawingBufferSize(material.uniforms.uRes.value)
    material.uniforms.uDpr.value = gl.getPixelRatio()
    material.uniforms.uTime.value = time.current
  })

  return (
    <mesh frustumCulled={false} material={material}>
      <planeGeometry args={[2, 2]} />
    </mesh>
  )
}

export default function NightScene({ running, onStill }: { running: boolean; onStill: () => void }) {
  return (
    <Canvas
      className="night__canvas"
      aria-hidden="true"
      dpr={[1, 1.25]}
      frameloop="demand"
      gl={{ alpha: true, antialias: false, premultipliedAlpha: true, powerPreference: 'low-power' }}
      onCreated={({ gl }) => { if (isSoftware(gl.getContext())) onStill() }}
      flat
      linear
    >
      <Night running={running} />
    </Canvas>
  )
}
