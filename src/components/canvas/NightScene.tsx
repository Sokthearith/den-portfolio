import { useEffect, useMemo, useRef, type RefObject } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { ShaderMaterial, Vector2, Vector3 } from 'three'
import { tokenRGB } from '../../lib/tokens'
import { MAX_LIT, nightClock, type NightInput } from '../../lib/night'
import { useTheme } from '../../lib/theme'
import { isSoftware } from '../../lib/gpu'

// The night drawn as light: slow ribbons over a low horizon and a far row of
// lit windows, one of them amber. One full-screen shader, transparent, over
// the CSS sky in .night. The horizon sits at HORIZON from the bottom, the same
// line the CSS gradient draws.
export const HORIZON = 0.18
const START_TIME = 40 // a settled frame for the still and reduced-motion views


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
  uniform vec2 uPointer;
  uniform float uPointerOn;
  uniform float uExit;
  uniform float uLightsOut;
  uniform float uRain;
  uniform vec3 uLit[${MAX_LIT}];
  uniform float uNow;
  uniform float uAmber;

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
      // The visitor's pointer pushes the light aside, like a breath of wind,
      // and the ribbon brightens where it bends.
      float dxp = (px.x - uPointer.x) / (240.0 * uDpr);
      float dyp = (y * uRes.y - uPointer.y) / uDpr;
      float near = uPointerOn * exp(-dxp * dxp) * exp(-abs(dyp) / 220.0);
      y += near * sign(dyp + 0.001) * 60.0 * uDpr / uRes.y;
      float d = abs(p.y - y) * uRes.y / uDpr;
      float core = exp(-d * d / 2.2);
      float halo = exp(-d / 56.0);
      float along = smoothstep(0.0, 0.25, p.x) * smoothstep(1.0, 0.7, p.x);
      float pulse = 0.35 + 0.65 * (0.5 + 0.5 * sin(p.x * 2.4 - uTime * 0.07 + fi * 2.1));
      float k = (core * 0.42 + halo * 0.2) * along * pulse * (0.45 + 0.55 * hash(fi + 11.0));
      k *= (1.0 + near * 2.0) * (1.0 - uExit * 0.85);
      col += uRibbon * k;
      alpha += k;
    }

    // The far row: windows in clusters just above the horizon.
    float cellW = 9.0 * uDpr;
    float cell = floor(px.x / cellW);
    float town = step(0.34, hash(floor(cell / 10.0) + 31.0));
    // Going to sleep: as uLightsOut rises the town's windows go dark, each at
    // its own moment, until only den's is left.
    float lit = step(0.5, hash(cell + 1.0)) * town * step(uLightsOut, hash(cell + 21.0) * 0.98);
    float flick = mix(1.0, step(0.0, sin(uTime * 0.04 + hash(cell + 5.0) * 60.0)), step(0.88, hash(cell + 9.0)));
    float row = floor(hash(cell + 2.0) * 4.0);
    vec2 c = vec2((cell + 0.5) * cellW, uHorizon * uRes.y + (row * 8.0 + 4.0) * uDpr);
    float dw = length(px - c) / uDpr;
    float win = (exp(-dw * dw / 2.2) + exp(-dw / 6.0) * 0.22) * lit * flick * (0.35 + 0.65 * hash(cell + 3.0));
    col += uWindow * win;
    alpha += win;

    // The one lit window.
    vec2 a = vec2(uAmber * uRes.x, uHorizon * uRes.y + 11.0 * uDpr);
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

    // Rain, when the visitor has it playing: fine streaks falling through the
    // sky, leaning a little with the wind, gone at the horizon.
    if (uRain > 0.001 && px.y > uHorizon * uRes.y) {
      float colW = 7.0 * uDpr;
      float rc = floor(px.x / colW);
      float falling = step(1.0 - uRain * 0.75, hash(rc + 49.0));
      float speed = (520.0 + 300.0 * hash(rc + 41.0)) * uDpr;
      float len = (22.0 + 34.0 * hash(rc + 43.0)) * uDpr;
      float span = uRes.y + len;
      float head = uRes.y - mod(uTime * speed + hash(rc + 47.0) * span, span);
      float dd = px.y - head;
      float cx = (rc + 0.5) * colW + dd * 0.12;
      float dx = abs(px.x - cx) / uDpr;
      float streak = exp(-dx * dx / 0.3) * step(0.0, dd) * step(dd, len) * (1.0 - dd / len);
      float drop = streak * falling * uRain * 0.16;
      col += uRibbon * drop;
      alpha += drop;
    }

    // The windows a visitor turned on, warming up over most of a second.
    for (int j = 0; j < ${MAX_LIT}; j++) {
      vec3 L = uLit[j];
      if (L.x < 0.0) continue;
      float on = smoothstep(L.z, L.z + 0.8, uNow);
      vec2 w = vec2(L.x * uRes.x, uHorizon * uRes.y + (L.y * 8.0 + 4.0) * uDpr);
      float dl = length(px - w) / uDpr;
      // A brief flare as it comes on, so the visitor sees their light land.
      float age = max(uNow - L.z, 0.0);
      float flare = exp(-age * 1.4) * exp(-dl / 22.0) * 0.9 * step(L.z, uNow);
      float glow = (exp(-dl * dl / 3.2) + exp(-dl / 8.0) * 0.36) * on + flare;
      float under = (uHorizon * uRes.y - px.y) / uDpr;
      float dxl = abs(px.x - w.x) / uDpr;
      float refl = under > 0.0 ? exp(-dxl * dxl / 1.8) * exp(-under / 50.0) * 0.3 * on : 0.0;
      col += uWindow * (glow + refl);
      alpha += glow + refl;
    }

    gl_FragColor = vec4(col, clamp(alpha, 0.0, 1.0));
  }
`

// `amber` is where den's window sits, as a fraction of the width.
type Props = { running: boolean; input: RefObject<NightInput>; amber?: number }

function Night({ running, input, amber = 0.64 }: Props) {
  const time = useRef(START_TIME)
  const pointerOn = useRef(0)
  const size = useThree((s) => s.size)
  const invalidate = useThree((s) => s.invalidate)

  useEffect(() => {
    const inp = input.current
    inp.invalidate = invalidate
    return () => { inp.invalidate = undefined }
  }, [input, invalidate])

  const gl = useThree((s) => s.gl)
  const theme = useTheme()

  // Colours come from the section the night sits in, read again whenever the
  // theme changes (theme is a dependency for that reason), so at dawn the
  // town is drawn in dawn's colours.
  const material = useMemo(() => {
    const host = gl.domElement
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
        uRibbon: { value: v(tokenRGB('--color-muted', host)) },
        uWindow: { value: v(tokenRGB('--color-ink-2', host)) },
        uAccent: { value: v(tokenRGB('--color-accent', host)) },
        uPointer: { value: new Vector2(-9999, -9999) },
        uPointerOn: { value: 0 },
        uExit: { value: 0 },
        uLightsOut: { value: 0 },
        uRain: { value: 0 },
        uLit: { value: Array.from({ length: MAX_LIT }, () => new Vector3(-1, 0, 0)) },
        uNow: { value: 0 },
        uAmber: { value: amber },
      },
    })
  }, [gl, amber, theme])
  useEffect(() => () => material.dispose(), [material])

  // The horizon comes from the --horizon of the section the night sits in (the
  // hero or the footer), so the CSS land and the drawn windows share one line;
  // a still night redraws on resize.
  useEffect(() => {
    const host = gl.domElement.closest('.night')
    const h = host ? parseFloat(getComputedStyle(host).getPropertyValue('--horizon')) / 100 : NaN
    material.uniforms.uHorizon.value = Number.isFinite(h) ? h : HORIZON
    invalidate()
  }, [size, invalidate, material, gl])

  // Read the real drawing buffer each frame, so the horizon always meets the
  // CSS one whatever size or pixel ratio the canvas settled on.
  useFrame(({ gl }, delta) => {
    const u = material.uniforms
    const inp = input.current
    const dpr = gl.getPixelRatio()
    if (running) time.current += Math.min(delta, 0.1)
    gl.getDrawingBufferSize(u.uRes.value)
    u.uDpr.value = dpr
    u.uTime.value = time.current
    u.uNow.value = nightClock()

    // The pointer's push eases in and out; it only plays while the night does.
    const target = running && inp.inside ? 1 : 0
    pointerOn.current += (target - pointerOn.current) * Math.min(1, Math.min(delta, 0.05) * 5)
    if (!running) pointerOn.current = 0
    u.uPointerOn.value = pointerOn.current
    u.uPointer.value.set(inp.x * dpr, gl.domElement.clientHeight * dpr - inp.y * dpr)
    u.uExit.value = inp.exit
    u.uLightsOut.value = inp.lightsOut
    u.uRain.value += (inp.rain - u.uRain.value) * Math.min(1, Math.min(delta, 0.05) * 3)

    for (let i = 0; i < MAX_LIT; i++) u.uLit.value[i].set(inp.lit[i * 3], inp.lit[i * 3 + 1], inp.lit[i * 3 + 2])
  })

  return (
    <mesh frustumCulled={false} material={material}>
      <planeGeometry args={[2, 2]} />
    </mesh>
  )
}

export default function NightScene({ running, input, amber, onStill }: Props & { onStill: () => void }) {
  return (
    <Canvas
      className="night__canvas"
      aria-hidden="true"
      // Soft light needs no extra pixels; one per CSS pixel keeps it cheap at
      // full screen.
      dpr={1}
      frameloop={running ? 'always' : 'demand'}
      gl={{ alpha: true, antialias: false, premultipliedAlpha: true, powerPreference: 'low-power' }}
      onCreated={({ gl }) => {
        if (isSoftware(gl.getContext())) onStill()
        // Fade the night in once its first frame is drawn, rather than popping.
        requestAnimationFrame(() => gl.domElement.parentElement?.parentElement?.setAttribute('data-ready', ''))
      }}
      flat
      linear
    >
      <Night running={running} input={input} amber={amber} />
    </Canvas>
  )
}
