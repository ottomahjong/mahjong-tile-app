import { useTileStore, MATERIALS, VIEW_MODES } from '../state/useTileStore'

export default function TileControls() {
  const {
    layers,
    addLayer,
    updateLayer,
    removeLayer,
    moveLayer,
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
    viewMode,
    setViewMode,
    bgColor,
    setBgColor,
  } = useTileStore()

  const corners = [
    ['cornerTL', 'TL', cornerTL],
    ['cornerTR', 'TR', cornerTR],
    ['cornerBL', 'BL', cornerBL],
    ['cornerBR', 'BR', cornerBR],
  ]

  return (
    <div className="controls">
      <section className="panel-section">
        <div className="eyebrow">Corner Radii</div>
        <label className="check">
          <input
            type="checkbox"
            checked={cornerLinked}
            onChange={(e) => setCornerLinked(e.target.checked)}
          />
          Linked
        </label>
        <div className="corner-grid">
          {corners.map(([key, label, value]) => (
            <label className="field" key={key}>
              <span>{label} · {value.toFixed(1)}</span>
              <input
                type="range"
                min={0}
                max={Math.min(width, depth) / 2}
                step={0.1}
                value={value}
                onChange={(e) => setCorner(key, Number(e.target.value))}
              />
            </label>
          ))}
        </div>
      </section>

      <section className="panel-section">
        <div className="eyebrow">Edges</div>
        <label className="field">
          <span>Bevel · {edgeBevel.toFixed(1)}</span>
          <input
            type="range"
            min={0}
            max={4}
            step={0.1}
            value={edgeBevel}
            onChange={(e) => setEdgeBevel(Number(e.target.value))}
          />
        </label>
        <label className="field">
          <span>Smoothness · {smoothness}</span>
          <input
            type="range"
            min={2}
            max={24}
            step={1}
            value={smoothness}
            onChange={(e) => setSmoothness(Number(e.target.value))}
          />
        </label>
      </section>

      <section className="panel-section">
        <div className="eyebrow">Mockup View</div>
        <label className="field">
          <span>Composition</span>
          <select value={viewMode} onChange={(e) => setViewMode(e.target.value)}>
            {VIEW_MODES.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </label>
        <label className="check">
          <input type="checkbox" checked={exploded} onChange={toggleExploded} />
          Exploded view
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={finish === 'matte'}
            onChange={(e) => setFinish(e.target.checked ? 'matte' : 'polished')}
          />
          Matte finish
        </label>
        <label className="field-row">
          <span>Background / floor</span>
          <div className="swatch-row">
            {['#f5f2ec', '#ffffff', '#161719', '#c7d0d6', '#e7d3c2'].map((c) => (
              <button
                key={c}
                className={`swatch${bgColor === c ? ' active' : ''}`}
                style={{ background: c }}
                onClick={() => setBgColor(c)}
                title={c}
              />
            ))}
            <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} />
          </div>
        </label>
      </section>

      <section className="panel-section">
        <div className="section-row">
          <div className="eyebrow">Layer Stack</div>
          <button className="btn-ghost" onClick={addLayer} disabled={layers.length >= 6}>
            + Add
          </button>
        </div>
        <div className="stack-hint">Top of tile is the last layer</div>

        {[...layers].reverse().map((layer) => {
          const i = layers.findIndex((l) => l.id === layer.id)
          return (
            <div key={layer.id} className="layer-card">
              <div className="layer-card-head">
                <input
                  className="layer-name"
                  value={layer.name}
                  onChange={(e) => updateLayer(layer.id, { name: e.target.value })}
                />
                <div className="layer-actions">
                  <button className="btn-ghost" title="Move up" onClick={() => moveLayer(layer.id, 1)} disabled={i === layers.length - 1}>↑</button>
                  <button className="btn-ghost" title="Move down" onClick={() => moveLayer(layer.id, -1)} disabled={i === 0}>↓</button>
                  <button className="btn-ghost" onClick={() => removeLayer(layer.id)} disabled={layers.length <= 1}>✕</button>
                </div>
              </div>

              <div className="layer-row">
                <input
                  type="color"
                  value={layer.color}
                  onChange={(e) => updateLayer(layer.id, { color: e.target.value })}
                />
                <select
                  value={layer.material}
                  onChange={(e) => updateLayer(layer.id, { material: e.target.value })}
                >
                  {Object.entries(MATERIALS).map(([key, m]) => (
                    <option key={key} value={key}>{m.label}</option>
                  ))}
                </select>
                <input
                  className="num"
                  type="number"
                  min={0.5}
                  step={0.5}
                  value={layer.thickness}
                  onChange={(e) => updateLayer(layer.id, { thickness: Number(e.target.value) })}
                  title="Thickness (mm)"
                />
              </div>

              <label className="field">
                <span>
                  {MATERIALS[layer.material]?.clear ? 'Tint strength' : 'Opacity'} ·{' '}
                  {Math.round(layer.opacity * 100)}%
                </span>
                <input
                  type="range"
                  min={0.05}
                  max={1}
                  step={0.05}
                  value={layer.opacity}
                  onChange={(e) => updateLayer(layer.id, { opacity: Number(e.target.value) })}
                />
              </label>
            </div>
          )
        })}
      </section>
    </div>
  )
}
