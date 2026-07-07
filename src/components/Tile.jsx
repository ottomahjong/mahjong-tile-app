import { useTileStore } from '../state/useTileStore'
import TileLayer from './tile/TileLayer'

// One tile built from the shared layer stack. `faceASrc`/`faceBSrc` swap the
// artwork image while keeping the design's face settings (mode, depth,
// placement), so batch-uploaded set tiles render with a consistent look.
export default function Tile({
  faceASrc = undefined,
  faceBSrc = undefined,
  lowDetail = false,
  explodedOverride = undefined,
  ...groupProps
}) {
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

  const isExploded = explodedOverride ?? exploded
  const explodeGap = isExploded ? 6 : 0

  const effFaceA = faceASrc !== undefined
    ? faceASrc ? { ...(faceA ?? { mode: 'print', depth: 0.8, softness: 0.35 }), src: faceASrc } : null
    : faceA
  const effFaceB = faceBSrc !== undefined
    ? faceBSrc ? { ...(faceB ?? { mode: 'print', depth: 0.8, softness: 0.35 }), src: faceBSrc } : null
    : faceB

  const offsets = layers.map((_, i) =>
    layers.slice(0, i).reduce((sum, l) => sum + l.thickness, 0)
  )
  const totalHeight = layers.reduce((sum, l) => sum + l.thickness, 0)

  return (
    <group {...groupProps}>
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
            faceA={effFaceA}
            faceB={effFaceB}
            lowDetail={lowDetail}
          />
        ))}
      </group>
    </group>
  )
}
