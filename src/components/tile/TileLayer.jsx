import { useMemo } from 'react'
import * as THREE from 'three'
import { MeshTransmissionMaterial } from '@react-three/drei'
import { buildSilhouette } from './TileSilhouette'

// Single layer of the stack (Base / Body / Inlay / Cap). All layers share the
// same footprint silhouette so they stay flush at the edges - only the
// outermost faces (cap top, base bottom) get a bevel.
export default function TileLayer({
  layer,
  index,
  y,
  width,
  depth,
  cornerTL,
  cornerTR,
  cornerBL,
  cornerBR,
  edgeBevel,
  smoothness,
  finish,
}) {
  const isCap = layer.id === 'cap'
  const isBase = layer.id === 'base'
  const isInlay = layer.material === 'metallic'

  const safeBevel = Math.min(
    edgeBevel,
    cornerTL,
    cornerTR,
    cornerBL,
    cornerBR,
    layer.thickness * 0.45
  )

  const geometry = useMemo(() => {
    const shape = buildSilhouette(width, depth, cornerTL, cornerTR, cornerBR, cornerBL)
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: layer.thickness,
      bevelEnabled: isCap || isBase,
      bevelSize: safeBevel,
      bevelThickness: safeBevel,
      bevelSegments: smoothness,
      curveSegments: smoothness,
    })
    geo.rotateX(-Math.PI / 2)
    geo.computeVertexNormals()
    return geo
  }, [width, depth, cornerTL, cornerTR, cornerBL, cornerBR, layer.thickness, isCap, isBase, safeBevel, smoothness])

  const polygonOffsetFactor = -(index + 1)

  if (isCap) {
    return (
      <mesh geometry={geometry} position={[0, y, 0]} castShadow receiveShadow>
        <MeshTransmissionMaterial
          transmission={0.92}
          thickness={0.6}
          roughness={0.02}
          ior={1.5}
          color={layer.color}
          chromaticAberration={0.008}
          samples={4}
          resolution={256}
          clearcoat={1}
          clearcoatRoughness={0.02}
          envMapIntensity={2}
          polygonOffset
          polygonOffsetFactor={polygonOffsetFactor}
        />
      </mesh>
    )
  }

  return (
    <mesh geometry={geometry} position={[0, y, 0]} castShadow receiveShadow>
      <meshStandardMaterial
        color={layer.color}
        roughness={finish === 'matte' ? Math.max(layer.roughness ?? 0.6, 0.7) : layer.roughness ?? 0.6}
        metalness={layer.metalness ?? 0}
        envMapIntensity={isInlay ? 2.5 : 1}
        polygonOffset
        polygonOffsetFactor={polygonOffsetFactor}
      />
    </mesh>
  )
}
