import { useState } from 'react'
import { useTileStore } from '../../state/useTileStore'
import { exportPNG, exportGLB } from '../../hooks/useExport'

export default function ExportPanel({ rendererState }) {
  const [multiplier, setMultiplier] = useState(1)
  const exploded = useTileStore((s) => s.exploded)
  const setViewMode = useTileStore((s) => s.setViewMode)

  const handlePNG = () => {
    if (!rendererState.current) return
    exportPNG(rendererState.current, multiplier)
  }

  const handleGLB = () => {
    if (!rendererState.current) return
    // GLB is a print-ready model - always export the stacked tile, never
    // the exploded view, even if that's what's currently on screen.
    const wasExploded = exploded
    if (wasExploded) setViewMode('single')
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        exportGLB(rendererState.current)
        if (wasExploded) setViewMode('exploded')
      })
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div>
        <label style={{ fontSize: 11, opacity: 0.7 }}>Resolution</label>
        <select
          value={multiplier}
          onChange={(e) => setMultiplier(Number(e.target.value))}
          style={{ width: '100%' }}
        >
          <option value={1}>1x</option>
          <option value={2}>2x</option>
          <option value={4}>4x</option>
        </select>
      </div>
      <button style={{ width: '100%' }} onClick={handlePNG}>
        Export PNG
      </button>
      <button style={{ width: '100%' }} onClick={handleGLB}>
        Export GLB
      </button>
    </div>
  )
}
