import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment, Lightformer } from '@react-three/drei'
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js'
import Tile from './Tile'

export default function Scene({ onReady }) {
  const keyLightRef = useRef()
  const fillLightRef = useRef()

  useEffect(() => {
    RectAreaLightUniformsLib.init()
    keyLightRef.current?.lookAt(0, 0, 0)
    fillLightRef.current?.lookAt(0, 0, 0)
  }, [])

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
      camera={{ position: [70, 55, 70], fov: 40, near: 1, far: 2000 }}
      onCreated={(state) => onReady?.(state)}
    >
      <ambientLight intensity={0.1} />

      {/* Key light (top-left) */}
      <rectAreaLight
        ref={keyLightRef}
        position={[-30, 55, 30]}
        intensity={2.0}
        width={40}
        height={40}
        color="#ffffff"
      />

      {/* Fill light (right) */}
      <rectAreaLight
        ref={fillLightRef}
        position={[45, 15, 15]}
        intensity={0.5}
        width={30}
        height={30}
        color="#ffffff"
      />

      {/* Procedural studio environment - built entirely in-scene so it never
          depends on fetching an external HDR file (that dependency broke
          hard whenever the CDN wasn't reachable). */}
      <Environment resolution={256} background={false}>
        <Lightformer
          form="rect"
          intensity={3}
          color="#ffffff"
          position={[-30, 40, 30]}
          rotation={[-Math.PI / 3, Math.PI / 4, 0]}
          scale={[50, 50, 1]}
        />
        <Lightformer
          form="rect"
          intensity={1}
          color="#ffffff"
          position={[40, 10, 10]}
          rotation={[0, -Math.PI / 2, 0]}
          scale={[30, 30, 1]}
        />
        <Lightformer form="ring" intensity={2} color="#ffffff" position={[0, 20, -50]} scale={10} />
      </Environment>

      <Tile />

      <OrbitControls enableDamping />
    </Canvas>
  )
}
