import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment } from '@react-three/drei'
import Tile from './Tile'

export default function Scene() {
  return (
    <Canvas camera={{ position: [4, 3, 4], fov: 40 }}>

      <ambientLight intensity={0.4} />

      <directionalLight position={[5, 5, 5]} intensity={1.5} />
      <directionalLight position={[-5, 2, 2]} intensity={0.6} />
      <directionalLight position={[0, 5, -5]} intensity={1} />

      <Environment preset="city" />

      <group scale={[0.1, 0.1, 0.1]}>
        <Tile />
      </group>

      <OrbitControls enableDamping />

    </Canvas>
  )
}