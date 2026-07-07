import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { MATERIALS } from '../../state/useTileStore'
import { buildLayerGeometry } from './LayerGeometry'
import { useFaceTexture } from './useFaceTexture'

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
  // Clear layers use alpha transparency so artwork on the layers beneath
  // shows through; the opacity slider sets the strength of the tint.
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
}) {
  // Face art targets: A renders on this layer's top face, B on its bottom.
  const myFaceA = faceA && (faceA.layerId ? faceA.layerId === layer.id : isTop) ? faceA : null
  const myFaceB = faceB && (faceB.layerId ? faceB.layerId === layer.id : isBottom) ? faceB : null
  const surface = {
    color: layer.color,
    opacity: layer.opacity ?? 1,
    clear: (MATERIALS[layer.material] || MATERIALS.resin).clear ?? false,
  }
  const texA = useFaceTexture(myFaceA, surface)
  const texB = useFaceTexture(myFaceB, surface)

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
      }),
    [width, depth, layer.thickness, cornerTL, cornerTR, cornerBR, cornerBL, isTop, isBottom, edgeBevel, smoothness]
  )
  useEffect(() => () => geometry.dispose(), [geometry])

  // Material groups: 0 = sides, 1 = top face, 2 = bottom face
  const materials = useMemo(() => {
    const side = makeMaterial(layer, finish, index)
    const top = makeMaterial(layer, finish, index)
    const bottom = makeMaterial(layer, finish, index)

    const applyArt = (mat, tex, face) => {
      if (!tex.map && !tex.normalMap) return
      if (tex.map) {
        // The artwork canvas is already composited over the layer color, so
        // the material color must not tint it a second time.
        mat.map = tex.map
        mat.color = new THREE.Color('#ffffff')
      }
      if (tex.alphaMap) {
        mat.alphaMap = tex.alphaMap
        mat.transparent = true
        mat.opacity = 1
      }
      if (tex.normalMap) {
        mat.normalMap = tex.normalMap
        const d = face?.depth ?? 0.8
        mat.normalScale = new THREE.Vector2(d, d)
      }
    }
    applyArt(top, texA, myFaceA)
    applyArt(bottom, texB, myFaceB)
    return [side, top, bottom]
  }, [layer, finish, index, texA, texB, myFaceA, myFaceB])
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
