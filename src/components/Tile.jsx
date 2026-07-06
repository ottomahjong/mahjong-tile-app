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
  } = useTileStore()

  const explodeGap = exploded ? 6 : 0

  // Y positions are derived from the running total of prior layer
  // thicknesses, never hardcoded, so the stack stays correct when any
  // layer's thickness changes.
  const offsets = layers.map((_, i) =>
    layers.slice(0, i).reduce((sum, l) => sum + l.thickness, 0)
  )

  return (
    <group>
      {layers.map((layer, i) => {
        const y = offsets[i] + i * explodeGap

        return (
          <TileLayer
            key={layer.id}
            layer={layer}
            index={i}
            y={y}
            width={width}
            depth={depth}
            cornerTL={cornerTL}
            cornerTR={cornerTR}
            cornerBL={cornerBL}
            cornerBR={cornerBR}
            edgeBevel={edgeBevel}
            smoothness={smoothness}
            finish={finish}
          />
        )
      })}
    </group>
  )
}
