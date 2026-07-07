import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { MATERIALS } from '../../state/useTileStore'
import { buildLayerGeometry } from './LayerGeometry'
import { useFaceArt } from './useFaceArt'

function makeMaterial(layer, finish, index) {
  const preset = MATERIALS[layer.material] || MATERIALS.resin
  const mat = new THREE.MeshPhysicalMaterial({
    color: layer.color,
    roughness: finish === 'matte' ? Math.max(preset.roughness, 0.65) : preset.roughness,
    metalness: preset.metalness,
    clearcoat: finish === 'matte' ? 0 : preset.clear ? 1 : 0.6,
    clearcoatRoughness: 0.08,
    envMapIntensity: preset.metalness > 0.5 ? 2.5 : 1.2,
    polygonOffset: true,
    polygonOffsetFactor: -(index + 1),
  })
  const opacity = layer.opacity ?? 1
  if (preset.clear || opacity < 1) {
    mat.transparent = true
    mat.opacity = preset.clear ? Math.min(opacity, 0.95) : opacity
  }
  return mat
}

export default function TileLayer({
  layer,
  index,
  isTop,
  isBottom,
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
  faceA,
  faceB,
  lowDetail = false,
}) {
  const preset = MATERIALS[layer.material] || MATERIALS.resin
  // Face art targets: A renders on this layer's top face, B on its bottom.
  const myFaceA = faceA && (faceA.layerId ? faceA.layerId === layer.id : isTop) ? faceA : null
  const myFaceB = faceB && (faceB.layerId ? faceB.layerId === layer.id : isBottom) ? faceB : null
  const surface = {
    color: layer.color,
    opacity: layer.opacity ?? 1,
    clear: preset.clear ?? false,
    roughness: preset.roughness,
    metalness: preset.metalness,
  }
  const quality = lowDetail ? { gridRes: 72, texRes: 512 } : { gridRes: 160, texRes: 1024 }
  const artA = useFaceArt(myFaceA, surface, quality)
  const artB = useFaceArt(myFaceB, surface, quality)

  const geometry = useMemo(
    () =>
      buildLayerGeometry({
        width,
        depth,
        thickness: layer.thickness,
        cornerTL,
        cornerTR,
        cornerBR,
        cornerBL,
        bevelTop: isTop ? edgeBevel : 0,
        bevelBottom: isBottom ? edgeBevel : 0,
        cornerSegs: smoothness,
        bevelSegs: Math.max(3, Math.round(smoothness * 0.75)),
        topArt: artA.heightArt,
        bottomArt: artB.heightArt,
      }),
    [width, depth, layer.thickness, cornerTL, cornerTR, cornerBR, cornerBL,
      isTop, isBottom, edgeBevel, smoothness, artA.heightArt, artB.heightArt]
  )
  useEffect(() => () => geometry.dispose(), [geometry])

  // Material groups: 0 = sides, 1 = top face, 2 = bottom face
  const materials = useMemo(() => {
    const side = makeMaterial(layer, finish, index)
    const top = makeMaterial(layer, finish, index)
    const bottom = makeMaterial(layer, finish, index)

    const applyArt = (mat, art, face) => {
      if (!face) return
      if (art.map) {
        // Artwork canvas is already composited over the layer color
        mat.map = art.map
        mat.color = new THREE.Color('#ffffff')
      }
      if (art.alphaMap) {
        mat.alphaMap = art.alphaMap
        mat.transparent = true
        mat.opacity = 1
      }
      if (art.normalMap) {
        mat.normalMap = art.normalMap
        const s = 0.5 + (face.depth ?? 0.8) * 0.4
        mat.normalScale = new THREE.Vector2(s, s)
      }
      if (art.aoMap) {
        mat.aoMap = art.aoMap
        mat.aoMapIntensity = 1
      }
      if (art.metalnessMap) {
        mat.metalnessMap = art.metalnessMap
        mat.metalness = 1
      }
      if (art.roughnessMap) {
        mat.roughnessMap = art.roughnessMap
        mat.roughness = 1
      }
    }
    applyArt(top, artA, myFaceA)
    applyArt(bottom, artB, myFaceB)
    return [side, top, bottom]
  }, [layer, finish, index, artA, artB, myFaceA, myFaceB])
  useEffect(() => () => materials.forEach((m) => m.dispose()), [materials])

  return (
    <mesh
      geometry={geometry}
      material={materials}
      position={[0, y, 0]}
      castShadow
      receiveShadow
    />
  )
}
