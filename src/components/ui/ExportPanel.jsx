import { useState } from 'react'
import { useTileStore } from '../../state/useTileStore'
import { exportPNG, exportGLB } from '../../hooks/useExport'

export default function ExportPanel({ rendererState }) {
  const [multiplier, setMultiplier] = useState(1)
  const exploded = useTileStore((s) => s.exploded)
  const toggleExploded = useTileStore((s) => s.toggleExploded)

  const handlePNG = () => {
    if (!rendererState.current) return
    exportPNG(rendererState.current, multiplier)
  }

  const handleGLB = () => {
    if (!rendererState.current) return
    // GLB is a print-ready model - always export the stacked tile, never
    // the exploded view, even if that's what's currently on screen.
    const wasExploded = exploded
    if (wasExploded) toggleExploded()
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        exportGLB(rendererState.current)
        if (wasExploded) toggleExploded()
      })
    })
  }

  return (
    <div className="export-panel">
      <label className="field">
        <span>Resolution</span>
        <select value={multiplier} onChange={(e) => setMultiplier(Number(e.target.value))}>
          <option value={1}>1x</option>
          <option value={2}>2x</option>
          <option value={4}>4x</option>
        </select>
      </label>
      <button className="btn btn-primary" onClick={handlePNG}>
        Export PNG
      </button>
      <button className="btn btn-outline" onClick={handleGLB}>
        Export GLB
      </button>
    </div>
  )
}
