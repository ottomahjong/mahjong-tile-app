import { useRef } from 'react'
import { useTileStore } from '../../state/useTileStore'

const MODES = [
  { value: 'print', label: 'UV Print (full color)' },
  { value: 'engrave-paint', label: 'Engraved · Painted' },
  { value: 'engrave-blind', label: 'Engraved · Blind' },
]

export default function FacePanel({ which, title, defaultEnd }) {
  const face = useTileStore((s) => s[which])
  const layers = useTileStore((s) => s.layers)
  const setFace = useTileStore((s) => s.setFace)
  const updateFace = useTileStore((s) => s.updateFace)
  const inputRef = useRef(null)

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
        paintColor: face?.paintColor ?? '#1f2124',
        depth: face?.depth ?? 0.8,
        layerId: face?.layerId ?? null,
      })
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const isEngrave = face?.mode?.startsWith('engrave')
  const defaultLayer = defaultEnd === 'top' ? layers[layers.length - 1] : layers[0]

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
            <select
              value={face.mode}
              onChange={(e) => updateFace(which, { mode: e.target.value })}
            >
              {MODES.map((m) => (
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

          {face.mode === 'engrave-paint' && (
            <label className="field field-row">
              <span>Paint color</span>
              <input
                type="color"
                value={face.paintColor}
                onChange={(e) => updateFace(which, { paintColor: e.target.value })}
              />
            </label>
          )}

          {isEngrave && (
            <label className="field">
              <span>Engrave depth · {face.depth.toFixed(1)}</span>
              <input
                type="range"
                min={0.1}
                max={2.5}
                step={0.1}
                value={face.depth}
                onChange={(e) => updateFace(which, { depth: Number(e.target.value) })}
              />
            </label>
          )}

          <button className="btn-ghost btn-swap" onClick={() => inputRef.current?.click()}>
            Replace artwork
          </button>
        </div>
      )}
    </section>
  )
}
