import { RoundedBox } from '@react-three/drei'
import { useTileStore } from '../state/useTileStore'

const MATERIALS = {
  resin: { roughness: 0.6, metalness: 0 },
  acrylic: { roughness: 0.3, metalness: 0 },
  metal: { roughness: 0.25, metalness: 1 },
  wood: { roughness: 0.7, metalness: 0 },
}

export default function Tile() {
  const { layers, width, depth, cornerRadius, finish } = useTileStore()

  let currentY = 0

  return (
    <group>
      {layers.map((layer, i) => {
        const height = layer.thickness

        const yPos = currentY + height / 2

        currentY += height

        const maxRadius = Math.min(width, depth) / 2 - 0.5
        const radius = Math.min(cornerRadius, maxRadius)

        const materialProps = MATERIALS[layer.material] || MATERIALS.resin

        return (
          <RoundedBox
            key={layer.id}
            args={[width, height, depth]}
            radius={radius}
            smoothness={6}
            position={[0, yPos + i * 0.01, 0]} // 👈 prevents z-fighting
          >
            <meshStandardMaterial
              color={layer.color}
              roughness={finish === 'matte' ? 0.7 : materialProps.roughness}
              metalness={materialProps.metalness}
            />
          </RoundedBox>
        )
      })}
    </group>
  )
}