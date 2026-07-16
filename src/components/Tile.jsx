import { useTileStore, DEFAULT_PLACEMENT } from '../state/useTileStore'
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
    setFront,
    setBack,
  } = useTileStore()

  const isExploded = explodedOverride ?? exploded
  const explodeGap = isExploded ? 6 : 0

  // Batch set tiles swap in their own graphic but share the set-level finish
  // (mode/depth/softness), centered. Single-tile view uses faceA/faceB.
  const effFaceA = faceASrc !== undefined
    ? faceASrc ? { ...setFront, src: faceASrc, layerId: null, placement: DEFAULT_PLACEMENT } : null
    : faceA
  const effFaceB = faceBSrc !== undefined
    ? faceBSrc ? { ...setBack, src: faceBSrc, layerId: null, placement: DEFAULT_PLACEMENT } : null
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
