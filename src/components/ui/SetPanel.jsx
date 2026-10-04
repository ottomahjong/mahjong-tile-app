import { useRef, useState } from 'react'
import { useTileStore, FACE_MODES } from '../../state/useTileStore'
import { SET_TEMPLATES, templateDesignCount } from '../../state/setTemplates'

// Method + depth control for the whole set's fronts or back.
function FinishRow({ label, cfg, onChange }) {
  const engraved = cfg.mode === 'engrave-fill' || cfg.mode === 'engrave-blind' || cfg.mode === 'inlay'
  return (
    <div className="set-finish-row">
      <label className="field">
        <span>{label}</span>
        <select value={cfg.mode} onChange={(e) => onChange({ mode: e.target.value })}>
          {FACE_MODES.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
      </label>
      {engraved && (
        <label className="field">
          <span>Depth · {cfg.depth.toFixed(1)}</span>
          <input
            type="range"
            min={0.1}
            max={2.5}
            step={0.1}
            value={cfg.depth}
            onChange={(e) => onChange({ depth: Number(e.target.value) })}
          />
        </label>
      )}
    </div>
  )
}

function readFiles(files) {
  return Promise.all(
    [...files].map(
      (file) =>
        new Promise((resolve) => {
          const reader = new FileReader()
          reader.onload = () =>
            resolve({
              id: `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              name: file.name.replace(/\.[^.]+$/, ''),
              src: reader.result,
            })
          reader.readAsDataURL(file)
        })
    )
  )
}

// Batch upload for a full mahjong set: one front graphic per tile design
// (auto-assigned by filename) plus one shared back design.
export default function SetPanel() {
  const set = useTileStore((s) => s.set)
  const width = useTileStore((s) => s.width)
  const depth = useTileStore((s) => s.depth)
  const addSetTiles = useTileStore((s) => s.addSetTiles)
  const updateSetTile = useTileStore((s) => s.updateSetTile)
  const removeSetTile = useTileStore((s) => s.removeSetTile)
  const setBackSrc = useTileStore((s) => s.setBackSrc)
  const clearSet = useTileStore((s) => s.clearSet)
  const setViewMode = useTileStore((s) => s.setViewMode)
  const gridCols = useTileStore((s) => s.gridCols)
  const setGridCols = useTileStore((s) => s.setGridCols)
  const setFront = useTileStore((s) => s.setFront)
  const setBack = useTileStore((s) => s.setBack)
  const setSetFinish = useTileStore((s) => s.setSetFinish)
  const frontsRef = useRef(null)
  const backRef = useRef(null)
  const replaceRef = useRef(null)
  const replaceId = useRef(null)
  const [template, setTemplate] = useState('160')

  // Recommended art size: match the portrait face at ~50 px/mm so it lands
  // upright with no stretching.
  const recoW = Math.round(width * 50)
  const recoH = Math.round(depth * 50)
  const portrait = depth >= width

  const tpl = SET_TEMPLATES[template]
  const have = new Set(set.tiles.map((t) => t.name.toLowerCase()))

  return (
    <section className="panel-section">
      <div className="eyebrow">Full Set · Batch</div>

      <div className="art-spec-text upload-guide">
        <strong>How to upload</strong>
        <ul>
          <li><strong>Fronts:</strong> one graphic per tile design, selected together.</li>
          <li>
            <strong>Format:</strong> PNG with a transparent background (preferred) or
            SVG. Avoid JPG — it can’t be transparent. Export EPS/AI as SVG or PNG
            first; browsers can’t read EPS directly.
          </li>
          <li>
            <strong>Size:</strong> {portrait ? 'portrait' : 'landscape'}{' '}
            <strong>{recoW}×{recoH}px</strong> ({width}:{depth}), the same shape as the
            tile face. Off-ratio art is fit inside the safe area, never stretched.
          </li>
          <li>
            <strong>Layout:</strong> center the symbol with an ~8% margin, upright.
          </li>
          <li>
            <strong>Naming:</strong> two-digit numerals so files auto-assign — e.g.
            <code>crak-01</code>, <code>bam-05</code>, <code>dot-09</code>,{' '}
            <code>north</code>, <code>red-dragon</code>, <code>flower-01</code>,{' '}
            <code>joker-01</code>, <code>blank-01</code>.
          </li>
          <li><strong>Back:</strong> one shared design at the same size.</li>
        </ul>
      </div>

      <input ref={frontsRef} type="file" multiple accept=".png,.svg,.jpg,.jpeg,.webp" style={{ display: 'none' }}
        onChange={async (e) => {
          if (e.target.files?.length) addSetTiles(await readFiles(e.target.files))
          e.target.value = ''
        }} />
      <input ref={backRef} type="file" accept=".png,.svg,.jpg,.jpeg,.webp" style={{ display: 'none' }}
        onChange={async (e) => {
          if (e.target.files?.length) setBackSrc((await readFiles(e.target.files))[0].src)
          e.target.value = ''
        }} />
      <input ref={replaceRef} type="file" accept=".png,.svg,.jpg,.jpeg,.webp" style={{ display: 'none' }}
        onChange={async (e) => {
          if (e.target.files?.length && replaceId.current) {
            const [f] = await readFiles(e.target.files)
            updateSetTile(replaceId.current, { src: f.src })
          }
          e.target.value = ''
        }} />

      <div className="row-btns">
        <button className="btn btn-outline" onClick={() => frontsRef.current?.click()}>
          Upload fronts
        </button>
        <button className="btn btn-outline" onClick={() => backRef.current?.click()}>
          {set.backSrc ? 'Replace back' : 'Upload back'}
        </button>
      </div>

      {/* Engraving / print finish for every design in the set - adjustable
          any time after upload. */}
      <div className="set-finish">
        <FinishRow label="Front finish" cfg={setFront} onChange={(u) => setSetFinish('setFront', u)} />
        <FinishRow label="Back finish" cfg={setBack} onChange={(u) => setSetFinish('setBack', u)} />
      </div>

      {/* Required-tiles checklist for the chosen set */}
      <details className="set-template">
        <summary>
          What to upload · {tpl.label} ({templateDesignCount(template)} designs → {tpl.total} tiles)
        </summary>
        <div className="tpl-tabs">
          {Object.entries(SET_TEMPLATES).map(([key, t]) => (
            <button
              key={key}
              className={`btn-ghost${key === template ? ' active' : ''}`}
              onClick={() => setTemplate(key)}
            >
              {t.label}
            </button>
          ))}
        </div>
        {tpl.groups.map((g) => {
          const done = g.files.filter((f) => have.has(f)).length
          return (
            <div className="tpl-group" key={g.name}>
              <div className="tpl-group-head">
                <span>{g.name}</span>
                <span className="tpl-count">{done}/{g.files.length}</span>
              </div>
              <div className="tpl-note">{g.note}</div>
              <div className="tpl-files">
                {g.files.map((f) => (
                  <code key={f} className={have.has(f) ? 'done' : ''}>{f}</code>
                ))}
              </div>
            </div>
          )
        })}
      </details>

      {set.backSrc && (
        <div className="face-card-head">
          <img src={set.backSrc} alt="" className="face-thumb" />
          <div className="face-name">Shared back design</div>
          <button className="btn-ghost" onClick={() => setBackSrc(null)}>✕</button>
        </div>
      )}

      {set.tiles.length > 0 && (
        <>
          <div className="stack-hint">
            {set.tiles.length} tiles · names come from filenames, edit to reassign
          </div>
          <div className="thumb-grid">
            {set.tiles.map((t) => (
              <div key={t.id} className="thumb-cell">
                <img
                  src={t.src}
                  alt={t.name}
                  className="face-thumb"
                  title="Click to replace artwork"
                  onClick={() => {
                    replaceId.current = t.id
                    replaceRef.current?.click()
                  }}
                />
                <input
                  className="thumb-name"
                  value={t.name}
                  onChange={(e) => updateSetTile(t.id, { name: e.target.value })}
                />
                <button className="btn-ghost thumb-x" onClick={() => removeSetTile(t.id)}>✕</button>
              </div>
            ))}
          </div>
          <label className="field-row">
            <span>Grid columns</span>
            <input
              type="number"
              className="num"
              min={0}
              max={20}
              value={gridCols}
              onChange={(e) => setGridCols(Math.max(0, Math.floor(Number(e.target.value) || 0)))}
              title="0 = auto"
            />
          </label>
          <div className="stack-hint">
            {gridCols > 0
              ? `${gridCols} cols × ${Math.max(1, Math.ceil(set.tiles.length / gridCols))} rows`
              : 'Auto columns · set a value (e.g. 11) for a fixed layout'}
          </div>
          <div className="row-btns">
            <button className="btn btn-primary" onClick={() => setViewMode('grid')}>
              View set grid
            </button>
            <button className="btn-ghost" onClick={clearSet}>Clear set</button>
          </div>
        </>
      )}
    </section>
  )
}
