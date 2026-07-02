import Scene from './components/Scene'
import TileControls from './components/TileControls'

export default function App() {
  return (
    <div style={{ display: 'flex', height: '100vh', background: '#0b0f14' }}>

      {/* LEFT PANEL */}
      <div style={{
        width: '260px',
        background: '#11161c',
        padding: '16px',
        color: '#fff'
      }}>
        <h3>Tile Settings</h3>
        <TileControls />
      </div>

      {/* CENTER CANVAS */}
      <div style={{ flex: 1 }}>
        <Scene />
      </div>

      {/* RIGHT PANEL */}
      <div style={{
        width: '260px',
        background: '#11161c',
        padding: '16px',
        color: '#fff'
      }}>
        <h3>Export</h3>
        <button style={{ width: '100%' }}>Export PNG</button>
      </div>

    </div>
  )
}