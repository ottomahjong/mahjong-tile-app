import { useRef } from 'react'
import { useTileStore, FACE_MODES, DEFAULT_PLACEMENT } from '../../state/useTileStore'

// Simplify an aspect ratio to small whole numbers for the size hint.
function ratio(w, d) {
  const g = (a, b) => (b ? g(b, a % b) : a)
  const k = g(Math.round(w), Math.round(d)) || 1
  return `${Math.round(w / k)}:${Math.round(d / k)}`
}

export default function FacePanel({ which, title, defaultEnd }) {
  const face = useTileStore((s) => s[which])
  const layers = useTileStore((s) => s.layers)
  const width = useTileStore((s) => s.width)
  const depth = useTileStore((s) => s.depth)
  const setFace = useTileStore((s) => s.setFace)
  const updateFace = useTileStore((s) => s.updateFace)
  const updatePlacement = useTileStore((s) => s.updatePlacement)
  const inputRef = useRef(null)

  // Face is width x depth (mm); recommend art at ~50 px/mm on that ratio.
  const recoW = Math.round(width * 50)
  const recoH = Math.round(depth * 50)

  const handleFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!/\.(png|svg|jpe?g|webp)$/i.test(file.name)) {
      alert('Please upload a PNG or SVG with a transparent background. (EPS files need converting to SVG or PNG first.)')
      e.target.value = ''
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setFace(which, {
        src: reader.result,
        name: file.name,
        mode: face?.mode ?? 'print',
        fillColor: face?.fillColor ?? '#1f2124',
        inlayColor: face?.inlayColor ?? '#b87333',
        depth: face?.depth ?? 0.8,
        softness: face?.softness ?? 0.35,
        layerId: face?.layerId ?? null,
        placement: face?.placement ?? { ...DEFAULT_PLACEMENT },
      })
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const isEngrave = face?.mode?.startsWith('engrave') || face?.mode === 'inlay'
  const defaultLayer = defaultEnd === 'top' ? layers[layers.length - 1] : layers[0]
  const pl = face?.placement ?? DEFAULT_PLACEMENT

  return (
    <section className="panel-section">
      <div className="eyebrow">{title}</div>

      <input
        ref={inputRef}
        type="file"
        accept=".png,.svg,.jpg,.jpeg,.webp,image/png,image/svg+xml"
        onChange={handleFile}
        style={{ display: 'none' }}
      />

      <div className="art-spec">
        <div className="art-spec-frame" style={{ aspectRatio: `${width} / ${depth}` }}>
          <div className="art-spec-safe" />
        </div>
        <div className="art-spec-text">
          Tile face is {width}×{depth} mm ({ratio(width, depth)}).
          Upload a transparent PNG or SVG at ~<strong>{recoW}×{recoH}px</strong>,
          artwork centered with an ~8% safe margin. Off-ratio art is fit inside
          the dashed safe area without stretching.
        </div>
      </div>

      {!face && (
        <button className="btn btn-outline" onClick={() => inputRef.current?.click()}>
          Upload artwork
        </button>
      )}

      {face && (
        <div className="face-card">
          <div className="face-card-head">
            <img src={face.src} alt="" className="face-thumb" />
            <div className="face-name" title={face.name}>{face.name}</div>
            <button className="btn-ghost" onClick={() => setFace(which, null)}>✕</button>
          </div>

          <label className="field">
            <span>Method</span>
            <select value={face.mode} onChange={(e) => updateFace(which, { mode: e.target.value })}>
              {FACE_MODES.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Applied to layer</span>
            <select
              value={face.layerId ?? ''}
              onChange={(e) => updateFace(which, { layerId: e.target.value || null })}
            >
              <option value="">{defaultLayer ? `${defaultLayer.name} (outermost)` : 'Outermost'}</option>
              {layers.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </label>

          {face.mode === 'engrave-fill' && (
            <div className="stack-hint">Recess is paint-filled with the graphic’s own colors.</div>
          )}
          {face.mode === 'engrave-blind' && (
            <div className="stack-hint">Recess only, no paint — reads from shadow and highlight.</div>
          )}
          {face.mode === 'print' && (
            <div className="stack-hint">Full-color ink, printed with a slight raised surface.</div>
          )}
          {face.mode === 'inlay' && (
            <label className="field field-row">
              <span>Inlay color</span>
              <input
                type="color"
                value={face.inlayColor}
                onChange={(e) => updateFace(which, { inlayColor: e.target.value })}
              />
            </label>
          )}

          {isEngrave && (
            <>
              <label className="field">
                <span>{face.mode === 'inlay' ? 'Inset depth' : 'Engrave depth'} · {face.depth.toFixed(1)}</span>
                <input
                  type="range"
                  min={0.1}
                  max={2.5}
                  step={0.1}
                  value={face.depth}
                  onChange={(e) => updateFace(which, { depth: Number(e.target.value) })}
                />
              </label>
              <label className="field">
                <span>Edge softness · {face.softness.toFixed(2)}</span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={face.softness}
                  onChange={(e) => updateFace(which, { softness: Number(e.target.value) })}
                />
              </label>
            </>
          )}

          <div className="eyebrow" style={{ marginTop: 4 }}>Placement</div>
          <div className="corner-grid">
            <label className="field">
              <span>Move X · {pl.x.toFixed(2)}</span>
              <input type="range" min={-0.4} max={0.4} step={0.01} value={pl.x}
                onChange={(e) => updatePlacement(which, { x: Number(e.target.value) })} />
            </label>
            <label className="field">
              <span>Move Y · {pl.y.toFixed(2)}</span>
              <input type="range" min={-0.4} max={0.4} step={0.01} value={pl.y}
                onChange={(e) => updatePlacement(which, { y: Number(e.target.value) })} />
            </label>
            <label className="field">
              <span>Scale · {pl.scale.toFixed(2)}</span>
              <input type="range" min={0.15} max={2.5} step={0.05} value={pl.scale}
                onChange={(e) => updatePlacement(which, { scale: Number(e.target.value) })} />
            </label>
            <label className="field">
              <span>Rotate · {pl.rotation.toFixed(0)}°</span>
              <input type="range" min={-180} max={180} step={1} value={pl.rotation}
                onChange={(e) => updatePlacement(which, { rotation: Number(e.target.value) })} />
            </label>
          </div>
          <div className="row-btns">
            <button className="btn-ghost" onClick={() => updatePlacement(which, { x: 0, y: 0 })}>Center</button>
            <button className="btn-ghost" onClick={() => updatePlacement(which, { scale: 1 })}>Fit safe area</button>
            <button className="btn-ghost" onClick={() => updatePlacement(which, { ...DEFAULT_PLACEMENT })}>Reset</button>
          </div>

          <button className="btn-ghost btn-swap" onClick={() => inputRef.current?.click()}>
            Replace artwork
          </button>
        </div>
      )}
    </section>
  )
}
