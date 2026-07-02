import { useTileStore, MATERIALS } from '../state/useTileStore'

export default function TileControls() {
  const {
    layers,
    addLayer,
    updateLayer,
    removeLayer,
    width,
    depth,
    cornerTL,
    cornerTR,
    cornerBL,
    cornerBR,
    cornerLinked,
    setCorner,
    setCornerLinked,
    edgeBevel,
    setEdgeBevel,
    smoothness,
    setSmoothness,
    finish,
    setFinish,
    exploded,
    toggleExploded,
  } = useTileStore()

  const corners = [
    ['cornerTL', 'TL', cornerTL],
    ['cornerTR', 'TR', cornerTR],
    ['cornerBL', 'BL', cornerBL],
    ['cornerBR', 'BR', cornerBR],
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <section>
        <h4 style={{ margin: '0 0 8px' }}>Corner Radii</h4>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
          <input
            type="checkbox"
            checked={cornerLinked}
            onChange={(e) => setCornerLinked(e.target.checked)}
          />
          Linked
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
          {corners.map(([key, label, value]) => (
            <div key={key}>
              <div style={{ fontSize: 11, opacity: 0.7 }}>{label}</div>
              <input
                type="range"
                min={0}
                max={Math.min(width, depth) / 2}
                step={0.1}
                value={value}
                onChange={(e) => setCorner(key, Number(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>
          ))}
        </div>
      </section>

      <section>
        <h4 style={{ margin: '0 0 8px' }}>Edges</h4>
        <div style={{ fontSize: 11, opacity: 0.7 }}>Bevel: {edgeBevel.toFixed(1)}</div>
        <input
          type="range"
          min={0}
          max={3}
          step={0.1}
          value={edgeBevel}
          onChange={(e) => setEdgeBevel(Number(e.target.value))}
          style={{ width: '100%' }}
        />
        <div style={{ fontSize: 11, opacity: 0.7, marginTop: 8 }}>Smoothness: {smoothness}</div>
        <input
          type="range"
          min={1}
          max={16}
          step={1}
          value={smoothness}
          onChange={(e) => setSmoothness(Number(e.target.value))}
          style={{ width: '100%' }}
        />
      </section>

      <section>
        <h4 style={{ margin: '0 0 8px' }}>View</h4>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
          <input type="checkbox" checked={exploded} onChange={toggleExploded} />
          Exploded view
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, marginTop: 6 }}>
          <input
            type="checkbox"
            checked={finish === 'matte'}
            onChange={(e) => setFinish(e.target.checked ? 'matte' : 'polished')}
          />
          Matte finish
        </label>
      </section>

      <section>
        <h4 style={{ margin: '0 0 8px' }}>
          Layer Stack{' '}
          <button onClick={addLayer} disabled={layers.length >= 4} style={{ marginLeft: 8 }}>
            + Add
          </button>
        </h4>
        {layers.map((layer) => (
          <div
            key={layer.id}
            style={{ marginBottom: 12, padding: 8, background: '#0b0f14', borderRadius: 4 }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong style={{ fontSize: 13 }}>{layer.name || layer.id}</strong>
              <button onClick={() => removeLayer(layer.id)}>Remove</button>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 6, alignItems: 'center' }}>
              <input
                type="color"
                value={layer.color}
                onChange={(e) => updateLayer(layer.id, { color: e.target.value })}
              />
              <select
                value={layer.material}
                onChange={(e) => {
                  const mat = e.target.value
                  updateLayer(layer.id, { material: mat, ...MATERIALS[mat] })
                }}
              >
                {Object.keys(MATERIALS).map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min={1}
                step={0.5}
                value={layer.thickness}
                onChange={(e) => updateLayer(layer.id, { thickness: Number(e.target.value) })}
                style={{ width: 60 }}
                title="Thickness"
              />
            </div>
          </div>
        ))}
      </section>
    </div>
  )
}
