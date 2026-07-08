import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls, Environment, Lightformer, ContactShadows } from '@react-three/drei'
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js'
import Tile from './Tile'
import { useTileStore } from '../state/useTileStore'

function luminance(hex) {
  const n = parseInt(hex.slice(1), 16)
  const r = ((n >> 16) & 255) / 255
  const g = ((n >> 8) & 255) / 255
  const b = (n & 255) / 255
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

// Columns for the set grid: explicit when set, else a landscape-biased fit.
function gridColumns(count, gridCols) {
  if (gridCols > 0) return Math.max(1, gridCols)
  return Math.max(1, Math.min(count, Math.ceil(Math.sqrt(count * 2.2))))
}

function CameraRig({ mode, position, target }) {
  const camera = useThree((s) => s.camera)
  const controls = useThree((s) => s.controls)
  useEffect(() => {
    camera.position.set(...position)
    if (controls) {
      controls.target.set(...target)
      controls.update()
    }
    // Re-frame only when the composition changes, not on every store tick
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, controls])
  return null
}

// Full set laid flat face-up in an aligned rectangular grid on the floor.
function SetGrid({ tiles, backSrc, cols, width, depth, tileH }) {
  const gapX = width + 7
  const gapZ = depth + 9
  const rows = Math.max(1, Math.ceil(tiles.length / cols))
  return (
    <group>
      {tiles.map((tile, i) => {
        const r = Math.floor(i / cols)
        const c = i % cols
        return (
          <Tile
            key={tile.id}
            faceASrc={tile.src}
            faceBSrc={backSrc ?? null}
            lowDetail
            position={[(c - (cols - 1) / 2) * gapX, tileH / 2, (r - (rows - 1) / 2) * gapZ]}
          />
        )
      })}
      {tiles.length === 0 && <Tile position={[0, tileH / 2, 0]} />}
    </group>
  )
}

function Arrangement({ mode, set, cols, width, depth, tileH }) {
  switch (mode) {
    case 'grid':
      return <SetGrid tiles={set.tiles} backSrc={set.backSrc} cols={cols} width={width} depth={depth} tileH={tileH} />
    case 'stack':
      return (
        <group>
          {[0, 1, 2, 3].map((i) => (
            <Tile
              key={i}
              lowDetail={i > 0}
              position={[i * 1.2 - 2, tileH / 2 + i * (tileH + 0.35), i * 0.8]}
              rotation={[0, (i % 2 ? -1 : 1) * 0.07 * i, 0]}
            />
          ))}
        </group>
      )
    case 'pair':
      // Both tiles lie flat on the floor - one front-up, one flipped to
      // show the back-up - side by side.
      return (
        <group>
          <Tile position={[-width * 0.72, tileH / 2, 0]} rotation={[0, 0, 0]} />
          <Tile
            faceBSrc={set.backSrc ?? undefined}
            position={[width * 0.72, tileH / 2, 0]}
            rotation={[Math.PI, 0, 0]}
          />
        </group>
      )
    case 'flatlay':
      // Marketing flat lay: every tile lies flat on the surface (pure yaw
      // spin only); the third is flipped face-down to show the back.
      return (
        <group>
          <Tile position={[-width * 0.85, tileH / 2, -depth * 0.35]} rotation={[0, 0.35, 0]} />
          <Tile lowDetail position={[width * 0.55, tileH / 2, depth * 0.2]} rotation={[0, -0.22, 0]} />
          <Tile
            lowDetail
            faceBSrc={set.backSrc ?? undefined}
            position={[width * 0.1, tileH / 2, depth * 1.15]}
            rotation={[Math.PI, 0.12, 0]}
          />
        </group>
      )
    case 'layers':
      return <Tile explodedOverride position={[0, tileH / 2 + 2, 0]} />
    default:
      return <Tile position={[0, tileH / 2 + 0.01, 0]} />
  }
}

export default function Scene({ onReady }) {
  const keyLightRef = useRef()
  const fillLightRef = useRef()
  const viewMode = useTileStore((s) => s.viewMode)
  const set = useTileStore((s) => s.set)
  const width = useTileStore((s) => s.width)
  const depth = useTileStore((s) => s.depth)
  const layers = useTileStore((s) => s.layers)
  const bgColor = useTileStore((s) => s.bgColor)
  const gridCols = useTileStore((s) => s.gridCols)
  const tileH = layers.reduce((sum, l) => sum + l.thickness, 0)

  useEffect(() => {
    RectAreaLightUniformsLib.init()
    keyLightRef.current?.lookAt(0, 0, 0)
    fillLightRef.current?.lookAt(0, 0, 0)
  }, [])

  const lightBg = luminance(bgColor) > 0.5

  const cols = gridColumns(set.tiles.length, gridCols)
  const rows = Math.max(1, Math.ceil(Math.max(set.tiles.length, 1) / cols))
  const gridW = cols * (width + 7)
  const gridD = rows * (depth + 9)
  const gridExtent = Math.max(gridW, gridD)

  const CAMS = {
    single: { position: [55, 42, 55], target: [0, tileH / 2, 0] },
    layers: { position: [60, 45, 60], target: [0, tileH + 8, 0] },
    grid: { position: [0, gridExtent * 1.25 + 55, gridExtent * 0.62 + 40], target: [0, 0, 0] },
    stack: { position: [115, 95, 135], target: [0, (tileH + 0.35) * 2, 0] },
    pair: { position: [0, width * 2.6, width * 3.2], target: [0, tileH / 2, 0] },
    flatlay: { position: [8, 108, 56], target: [0, 0, depth * 0.35] },
  }
  const cam = CAMS[viewMode] ?? CAMS.single

  const shadowScale = viewMode === 'grid' ? gridExtent * 1.5 : 160

  return (
    <Canvas
      gl={{
        antialias: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.2,
        outputColorSpace: THREE.SRGBColorSpace,
        preserveDrawingBuffer: true,
      }}
      shadows="soft"
      camera={{ position: [55, 42, 55], fov: 40, near: 1, far: 4000 }}
      onCreated={(state) => onReady?.(state)}
    >
      <color attach="background" args={[bgColor]} />

      <ambientLight intensity={lightBg ? 0.55 : 0.12} />

      {/* Key softbox (top-left) */}
      <rectAreaLight
        ref={keyLightRef}
        position={[-30, 55, 30]}
        intensity={lightBg ? 1.4 : 2.0}
        width={40}
        height={40}
      />
      {/* Fill (right) */}
      <rectAreaLight ref={fillLightRef} position={[45, 15, 15]} intensity={0.5} width={30} height={30} />
      {/* Rim from behind so engraved edges catch a counter-highlight */}
      <directionalLight position={[10, 50, -60]} intensity={0.7} />

      {/* Procedural studio environment - no external HDR dependency */}
      <Environment resolution={256} background={false}>
        <Lightformer form="rect" intensity={3} position={[-30, 40, 30]} rotation={[-Math.PI / 3, Math.PI / 4, 0]} scale={[50, 50, 1]} />
        <Lightformer form="rect" intensity={2.2} position={[0, 55, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[80, 80, 1]} />
        <Lightformer form="rect" intensity={1} position={[40, 10, 10]} rotation={[0, -Math.PI / 2, 0]} scale={[30, 30, 1]} />
        <Lightformer form="ring" intensity={2} position={[0, 20, -50]} scale={10} />
      </Environment>

      <group name="tile-root">
        <Arrangement mode={viewMode} set={set} cols={cols} width={width} depth={depth} tileH={tileH} />
      </group>

      <ContactShadows
        position={[0, -0.01, 0]}
        opacity={lightBg ? 0.4 : 0.55}
        scale={shadowScale}
        blur={2.4}
        far={tileH * 1.6}
        resolution={1024}
        color="#1a150f"
      />

      <CameraRig mode={viewMode} position={cam.position} target={cam.target} />
      <OrbitControls makeDefault enableDamping />
    </Canvas>
  )
}
