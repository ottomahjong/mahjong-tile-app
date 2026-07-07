import { useRef } from 'react'
import { useTileStore } from '../../state/useTileStore'

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

// Batch upload for a full mahjong set: many front designs assigned by
// filename (bam-1..9, dot-1..9, crack-1..9, winds, dragons, flowers,
// seasons, joker...) plus one shared back design.
export default function SetPanel() {
  const set = useTileStore((s) => s.set)
  const addSetTiles = useTileStore((s) => s.addSetTiles)
  const updateSetTile = useTileStore((s) => s.updateSetTile)
  const removeSetTile = useTileStore((s) => s.removeSetTile)
  const setBackSrc = useTileStore((s) => s.setBackSrc)
  const clearSet = useTileStore((s) => s.clearSet)
  const setViewMode = useTileStore((s) => s.setViewMode)
  const frontsRef = useRef(null)
  const backRef = useRef(null)
  const replaceRef = useRef(null)
  const replaceId = useRef(null)

  return (
    <section className="panel-section">
      <div className="eyebrow">Full Set · Batch</div>

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
