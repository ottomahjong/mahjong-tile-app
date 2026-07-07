import { useTileStore } from '../state/useTileStore'
import TileLayer from './tile/TileLayer'

export default function Tile() {
  const {
    layers,
    width,
    depth,
    cornerTL,
    cornerTR,
    cornerBL,
    cornerBR,
    edgeBevel,
    smoothness,
    finish,
    exploded,
    faceA,
    faceB,
  } = useTileStore()

  const explodeGap = exploded ? 6 : 0

  // Y positions derive from the running total of prior layer thicknesses so
  // the stack stays correct whenever any thickness changes.
  const offsets = layers.map((_, i) =>
    layers.slice(0, i).reduce((sum, l) => sum + l.thickness, 0)
  )
  const totalHeight = layers.reduce((sum, l) => sum + l.thickness, 0)

  return (
    <group position={[0, -totalHeight / 2, 0]}>
      {layers.map((layer, i) => (
        <TileLayer
          key={layer.id}
          layer={layer}
          index={i}
          isTop={i === layers.length - 1}
          isBottom={i === 0}
          y={offsets[i] + i * explodeGap}
          width={width}
          depth={depth}
          cornerTL={cornerTL}
          cornerTR={cornerTR}
          cornerBL={cornerBL}
          cornerBR={cornerBR}
          edgeBevel={edgeBevel}
          smoothness={smoothness}
          finish={finish}
          faceA={faceA}
          faceB={faceB}
        />
      ))}
    </group>
  )
}
