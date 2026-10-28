import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { Environment, Lightformer, RoundedBox, Text } from '@react-three/drei'
import { Color, MathUtils, SRGBColorSpace, type Group, type PerspectiveCamera } from 'three'
import { skillGroups } from '../../data/skills'
import { tokenRGB } from '../../lib/tokens'

// The stack as a rack of machined keys, one light from above. A pressed key
// sits low with its index line lit in the accent; the HTML buttons beside the
// canvas drive the same state and are the accessible control.

const FONT = '/fonts/figtree-500-latin.woff'
const KEY_H = 0.34
const KEY_D = 0.86
const GAP = 0.2
const ROW_GAP = 0.36
const LABEL_W = 1.7
const PAD = 0.45
const keyWidth = (s: string) => Math.max(1.0, 0.44 + s.length * 0.17)

type Palette = { metal: Color; bed: Color; ink: Color; label: Color; accent: Color; idle: Color }

function usePalette(): Palette {
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
  }, [])
}

function useLayout() {
  return useMemo(() => {
    const rows = skillGroups.map((g, r) => {
      let x = LABEL_W
      const keys = g.skills.map((name) => {
        const w = keyWidth(name)
        const key = { name, x: x + w / 2, w }
        x += w + GAP
        return key
      })
      return { label: g.name, z: r * (KEY_D + ROW_GAP), keys, width: x - GAP }
    })
    const width = Math.max(...rows.map((r) => r.width))
    const depth = (rows.length - 1) * (KEY_D + ROW_GAP) + KEY_D
    return { rows, width, depth, ox: -width / 2, oz: -depth / 2 + KEY_D / 2 }
  }, [])
}

type KeyProps = {
  name: string
  w: number
  active: boolean
  reduced: boolean
  palette: Palette
  onPress: (name: string) => void
}

function Key({ name, w, active, reduced, palette, onPress }: KeyProps) {
  const ref = useRef<Group>(null)
  const [hover, setHover] = useState(false)
  const invalidate = useThree((s) => s.invalidate)
  const target = active ? -0.14 : hover ? 0.03 : 0

  useEffect(() => invalidate(), [target, invalidate])

  useFrame((_, dt) => {
    const g = ref.current
    if (!g) return
    const y = reduced ? target : MathUtils.damp(g.position.y, target, 16, dt)
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

// Frames the rack from above at TILT, as close as the canvas's shape allows.
const TILT = MathUtils.degToRad(52)
const FOV = 16
function Fit({ width, depth }: { width: number; depth: number }) {
  const camera = useThree((s) => s.camera) as PerspectiveCamera
  const size = useThree((s) => s.size)
  const invalidate = useThree((s) => s.invalidate)
  useEffect(() => {
    const aspect = size.width / size.height
    const v = Math.tan(MathUtils.degToRad(FOV) / 2)
    const h = v * aspect
    const across = (width / 2) / h
    const down = (depth / 2) * Math.sin(TILT) / v + (depth / 2) * Math.cos(TILT)
    const dist = Math.max(across, down) * 1.03 + (depth / 2) * Math.cos(TILT) * 0.6
    camera.fov = FOV
    camera.position.set(0, dist * Math.sin(TILT), dist * Math.cos(TILT))
    camera.lookAt(0, 0, 0)
    camera.updateProjectionMatrix()
    invalidate()
  }, [camera, size, width, depth, invalidate])
  return null
}

function Rack({ active, reduced, onPress }: { active: string; reduced: boolean; onPress: (name: string) => void }) {
  const palette = usePalette()
  const { rows, width, depth, ox, oz } = useLayout()
  const lit = rows.flatMap((r) => r.keys.map((k) => ({ ...k, z: r.z }))).find((k) => k.name === active)

  return (
    <group>
      <Fit width={width + PAD * 2} depth={depth + PAD * 2} />
      {/* The bed the keys sit in. */}
      <RoundedBox args={[width + PAD * 2, 0.24, depth + PAD * 2]} radius={0.12} smoothness={4} position={[0, -0.12, 0]}>
        <meshStandardMaterial color={palette.bed} metalness={0.55} roughness={0.5} />
      </RoundedBox>

      <group position={[ox, 0, oz]}>
        {rows.map((row) => (
          <group key={row.label} position={[0, 0, row.z]}>
            <Text
              font={FONT}
              fontSize={0.23}
              position={[0.05, 0.002, 0]}
              rotation={[-Math.PI / 2, 0, 0]}
              anchorX="left"
              anchorY="middle"
              color={palette.label}
            >
              {row.label}
            </Text>
            {row.keys.map((k) => (
              <group key={k.name} position={[k.x, 0, 0]}>
                <Key name={k.name} w={k.w} active={k.name === active} reduced={reduced} palette={palette} onPress={onPress} />
              </group>
            ))}
          </group>
        ))}
        {lit && <pointLight position={[lit.x, 0.5, lit.z + 0.5]} color={palette.accent} intensity={1.6} distance={2.4} decay={2} />}
      </group>
    </group>
  )
}

export default function SkillRack({ active, reduced, onPress }: { active: string; reduced: boolean; onPress: (name: string) => void }) {
  return (
    <Canvas
      className="rack__canvas"
      aria-hidden="true"
      frameloop="demand"
      dpr={[1, 2]}
      camera={{ position: [0, 7, 5.2], fov: FOV }}
      gl={{ alpha: true, antialias: true }}
    >
      <ambientLight intensity={0.15} />
      <directionalLight position={[1.5, 8, 2]} intensity={1.4} />
      <Environment resolution={64} frames={1}>
        <Lightformer form="rect" intensity={2.2} position={[0, 6, 0]} rotation-x={Math.PI / 2} scale={[12, 4, 1]} />
        <Lightformer form="rect" intensity={0.35} position={[0, 1.5, 7]} scale={[12, 1.5, 1]} />
      </Environment>
      <Rack active={active} reduced={reduced} onPress={onPress} />
    </Canvas>
  )
}
