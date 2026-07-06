import { useRef } from 'react'
import Scene from './components/Scene'
import TileControls from './components/TileControls'
import ExportPanel from './components/ui/ExportPanel'

export default function App() {
  const rendererState = useRef(null)

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#0b0f14' }}>

      {/* LEFT PANEL */}
      <div style={{
        width: '260px',
        background: '#11161c',
        padding: '16px',
        color: '#fff',
        overflowY: 'auto'
      }}>
        <h3>Tile Settings</h3>
        <TileControls />
      </div>

      {/* CENTER CANVAS */}
      <div style={{ flex: 1 }}>
        <Scene onReady={(state) => { rendererState.current = state }} />
      </div>

      {/* RIGHT PANEL */}
      <div style={{
        width: '260px',
        background: '#11161c',
        padding: '16px',
        color: '#fff'
      }}>
        <h3>Export</h3>
        <ExportPanel rendererState={rendererState} />
      </div>

    </div>
  )
}
