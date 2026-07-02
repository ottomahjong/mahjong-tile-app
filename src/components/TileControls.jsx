import { useTileStore } from '../state/useTileStore'

export default function TileControls() {
  const { layers, addLayer, updateLayer, removeLayer } = useTileStore()

  return (
    <div>
      <button onClick={addLayer}>Add Layer</button>

      {layers.map((layer) => (
        <div key={layer.id} style={{ marginTop: 12 }}>
          
          <div>Layer</div>

          <input
            type="color"
            value={layer.color}
            onChange={(e) =>
              updateLayer(layer.id, { color: e.target.value })
            }
          />

          <input
            type="number"
            min={1}
            value={layer.thickness}
            onChange={(e) =>
              updateLayer(layer.id, {
                thickness: Number(e.target.value),
              })
            }
          />

          <button onClick={() => removeLayer(layer.id)}>
            Remove
          </button>

        </div>
      ))}
    </div>
  )
}