import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { Environment, Lightformer, OrbitControls, RoundedBox, Text } from '@react-three/drei'
import { Color, MathUtils, SRGBColorSpace, type Group, type PerspectiveCamera } from 'three'
import { skillGroups } from '../../data/skills'
import { tokenRGB } from '../../lib/tokens'
import { isSoftware } from '../../lib/gpu'

// The stack as a rack of machined keys, one light from above. A pressed key
// sits low with its index line lit in the accent; the list beside the canvas
// drives the same state and is the accessible control.

const FONT = '/fonts/figtree-500-latin.woff'
const KEY_H = 0.34
const KEY_D = 0.86
const GAP = 0.2
const ROW_GAP = 0.36
const LABEL_W = 1.7
const PAD = 0.45
const keyWidth = (s: string) => Math.max(1.0, 0.44 + s.length * 0.17)

type Palette = { metal: Color; bed: Color; ink: Color; label: Color; accent: Color; idle: Color }

// Re-read whenever the theme changes, so the rack is aluminium at dawn.
function usePalette(theme: string): Palette {
  return useMemo(() => {
    const c = (name: string) => new Color().setRGB(...tokenRGB(name), SRGBColorSpace)
    return {
      metal: c('--metal-hi'),
      bed: c('--metal-lo'),
      ink: c('--color-ink'),
      label: c('--color-muted'),
      // The focus amber: the accent's hue at more chroma, so a 2px line still reads lit.
      accent: c('--color-focus'),
      idle: c('--color-rule'),
    }
  }, [theme])
}

type Layout = {
  labels: { text: string; x: number; z: number }[]
  keys: { name: string; x: number; z: number; w: number; delay: number }[]
  width: number
  depth: number
}

// Positions are measured from the rack's top-left corner and centred at the
// end. Wide: one row per group, its name in a column on the left. Tall: each
// group's name on its own line above keys that wrap at WRAP, so the rack
// stands upright in the home page's portrait frame.
const WRAP = 6.2
// A label sits near the back of its line, clear of the keys' height in front of it.
const LABEL_D = 0.75

function useLayout(tall: boolean): Layout {
  return useMemo(() => {
    const labels: Layout['labels'] = []
    const keys: Layout['keys'] = []
    let width = 0
    let top = 0
    skillGroups.forEach((g, r) => {
      if (tall) {
        labels.push({ text: g.name, x: 0.05, z: top + 0.22 })
        top += LABEL_D
      } else {
        labels.push({ text: g.name, x: 0.05, z: top + KEY_D / 2 })
      }
      const left = tall ? 0 : LABEL_W
      let x = left
      g.skills.forEach((name, i) => {
        const w = keyWidth(name)
        if (tall && x > left && x + w > WRAP) {
          x = left
          top += KEY_D + GAP
        }
        keys.push({ name, x: x + w / 2, z: top + KEY_D / 2, w, delay: r * 0.14 + i * 0.05 })
        x += w + GAP
        width = Math.max(width, x - GAP)
      })
      top += KEY_D + ROW_GAP
    })
    const depth = top - ROW_GAP
    return { labels, keys, width, depth }
  }, [tall])
}

type KeyProps = {
  name: string
  w: number
  active: boolean
  reduced: boolean
  entered: boolean
  delay: number
  palette: Palette
  onPress: (name: string) => void
}

// Before the rack is on screen the keys sit sunk inside the bed; on arrival
// they rise into place row by row.
const SUNK = -0.6

function Key({ name, w, active, reduced, entered, delay, palette, onPress }: KeyProps) {
  const ref = useRef<Group>(null)
  const since = useRef<number | null>(null)
  const [hover, setHover] = useState(false)
  const invalidate = useThree((s) => s.invalidate)
  const target = active ? -0.14 : hover ? 0.03 : 0

  useEffect(() => invalidate(), [target, invalidate])
  useEffect(() => {
    if (entered && since.current === null) {
      since.current = performance.now() / 1000
      invalidate()
    }
  }, [entered, invalidate])

  useFrame((_, dt) => {
    const g = ref.current
    if (!g) return
    if (!reduced) {
      const waited = since.current === null ? -1 : performance.now() / 1000 - since.current
      if (waited < delay) {
        g.position.y = SUNK
        if (since.current !== null) invalidate()
        return
      }
    }
    const y = reduced ? target : MathUtils.damp(g.position.y, target, g.position.y < -0.2 ? 9 : 16, dt)
    g.position.y = Math.abs(y - target) < 0.0005 ? target : y
    if (g.position.y !== target) invalidate()
  })

  const over = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    setHover(true)
    document.body.style.cursor = 'pointer'
  }
  const out = () => {
    setHover(false)
    document.body.style.cursor = ''
  }
  useEffect(() => () => { document.body.style.cursor = '' }, [])

  return (
    <group ref={ref}>
      <RoundedBox
        args={[w, KEY_H, KEY_D]}
        radius={0.07}
        smoothness={4}
        position={[0, KEY_H / 2, 0]}
        onPointerOver={over}
        onPointerOut={out}
        onClick={(e) => { e.stopPropagation(); onPress(name) }}
      >
        <meshStandardMaterial color={palette.metal} metalness={0.7} roughness={0.34} />
      </RoundedBox>
      <Text
        font={FONT}
        fontSize={0.24}
        letterSpacing={-0.01}
        position={[0, KEY_H + 0.002, -0.06]}
        rotation={[-Math.PI / 2, 0, 0]}
        anchorX="center"
        anchorY="middle"
        color={active ? palette.accent : palette.ink}
      >
        {name}
      </Text>
      <mesh position={[0, KEY_H + 0.003, KEY_D / 2 - 0.16]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[Math.min(w * 0.42, 0.5), 0.04]} />
        <meshBasicMaterial color={active ? palette.accent : palette.idle} toneMapped={false} />
      </mesh>
    </group>
  )
}

// Frames the rack as close as the canvas's shape allows. The scroll swings
// the camera: from nearly overhead as the rack arrives to a low, slightly
// turned look as it leaves. Reduced motion holds the middle view. `rise`
// (0 to 1, the Skills scene) starts the camera straight above, the rack a
// flat plan, and tilts it toward the viewer; without the scene it is 1.
const FOV = 16
const TILT_FLAT = MathUtils.degToRad(89)
const TILT_IN = MathUtils.degToRad(66)
const TILT_OUT = MathUtils.degToRad(40)
export type RackScroll = { value: number; rise?: number; invalidate?: () => void }

function Fit({ width, depth, scroll }: { width: number; depth: number; scroll: RefObject<RackScroll> }) {
  const camera = useThree((s) => s.camera) as PerspectiveCamera
  const size = useThree((s) => s.size)
  const invalidate = useThree((s) => s.invalidate)
  const gl = useThree((s) => s.gl)
  // Without a GPU the rack holds its resting view and the scroll never redraws it.
  const still = useMemo(() => isSoftware(gl.getContext()), [gl])

  useEffect(() => {
    const sc = scroll.current
    if (!still) sc.invalidate = invalidate
    invalidate()
    return () => { sc.invalidate = undefined }
  }, [scroll, invalidate, size, still])

  useFrame(() => {
    const p = still ? 0.5 : scroll.current.value
    const rise = still ? 1 : scroll.current.rise ?? 1
    const tilt = MathUtils.lerp(TILT_FLAT, MathUtils.lerp(TILT_IN, TILT_OUT, p), rise)
    const aspect = size.width / size.height
    const v = Math.tan(MathUtils.degToRad(FOV) / 2)
    const h = v * aspect
    const across = (width / 2) / h
    const down = (depth / 2) * Math.sin(tilt) / v + (depth / 2) * Math.cos(tilt)
    const dist = Math.max(across, down) * 1.05 + (depth / 2) * Math.cos(tilt) * 0.6
    const turn = (p - 0.5) * 0.22 * rise
    camera.fov = FOV
    camera.position.set(Math.sin(turn) * dist * Math.cos(tilt), dist * Math.sin(tilt), Math.cos(turn) * dist * Math.cos(tilt))
    camera.lookAt(0, 0, 0)
    camera.updateProjectionMatrix()
  })
  return null
}

type RackProps = { active: string; reduced: boolean; entered: boolean; theme: string; scroll: RefObject<RackScroll>; onPress: (name: string) => void }

// In the lab the visitor holds the camera, so the scroll does not.
function Rack({ active, reduced, entered, theme, scroll, onPress, loose = false }: RackProps & { loose?: boolean }) {
  const palette = usePalette(theme)
  const { labels, keys, width, depth } = useLayout(!loose)
  const lit = keys.find((k) => k.name === active)

  return (
    <group>
      {!loose && <Fit width={width + PAD * 2} depth={depth + PAD * 2} scroll={scroll} />}
      {/* The bed the keys sit in. */}
      <RoundedBox args={[width + PAD * 2, 0.24, depth + PAD * 2]} radius={0.12} smoothness={4} position={[0, -0.12, 0]}>
        <meshStandardMaterial color={palette.bed} metalness={0.55} roughness={0.5} />
      </RoundedBox>

      <group position={[-width / 2, 0, -depth / 2]}>
        {labels.map((l) => (
          <Text
            key={l.text}
            font={FONT}
            fontSize={0.23}
            position={[l.x, 0.002, l.z]}
            rotation={[-Math.PI / 2, 0, 0]}
            anchorX="left"
            anchorY="middle"
            color={palette.label}
          >
            {l.text}
          </Text>
        ))}
        {keys.map((k) => (
          <group key={k.name} position={[k.x, 0, k.z]}>
            <Key name={k.name} w={k.w} active={k.name === active} reduced={reduced} entered={entered} delay={k.delay} palette={palette} onPress={onPress} />
          </group>
        ))}
        {lit && <pointLight position={[lit.x, 0.5, lit.z + 0.5]} color={palette.accent} intensity={1.6} distance={2.4} decay={2} />}
      </group>
    </group>
  )
}

function Light() {
  return (
    <>
      <ambientLight intensity={0.15} />
      <directionalLight position={[1.5, 8, 2]} intensity={1.4} />
      <Environment resolution={64} frames={1}>
        <Lightformer form="rect" intensity={2.2} position={[0, 6, 0]} rotation-x={Math.PI / 2} scale={[12, 4, 1]} />
        <Lightformer form="rect" intensity={0.35} position={[0, 1.5, 7]} scale={[12, 1.5, 1]} />
      </Environment>
    </>
  )
}

export default function SkillRack({ active, reduced, entered, theme, scroll, onPress }: RackProps) {
  return (
    <Canvas
      className="skillset__canvas"
      aria-hidden="true"
      frameloop="demand"
      dpr={[1, 2]}
      camera={{ position: [0, 7, 5.2], fov: FOV }}
      gl={{ alpha: true, antialias: true }}
    >
      <Light />
      <Rack active={active} reduced={reduced} entered={entered} theme={theme} scroll={scroll} onPress={onPress} />
    </Canvas>
  )
}

// The lab's loose rack: drag to turn it round, press a key. The camera keeps
// above the bed so the keys never vanish under it.
export function LooseRack({ active, reduced, theme, onPress }: Pick<RackProps, 'active' | 'reduced' | 'theme' | 'onPress'>) {
  const scroll = useRef<RackScroll>({ value: 0.5 })
  return (
    <Canvas
      className="loose__canvas"
      aria-hidden="true"
      frameloop="demand"
      dpr={[1, 2]}
      camera={{ position: [0, 12.5, 12.5], fov: 30 }}
      gl={{ alpha: true, antialias: true }}
    >
      <Light />
      <Rack active={active} reduced={reduced} entered theme={theme} scroll={scroll} onPress={onPress} loose />
      <OrbitControls enablePan={false} enableZoom={false} enableDamping={!reduced} minPolarAngle={0.15} maxPolarAngle={1.25} rotateSpeed={0.7} />
    </Canvas>
  )
}
