import { useRef } from 'react'
import Scene from './components/Scene'
import TileControls from './components/TileControls'
import ExportPanel from './components/ui/ExportPanel'
import FacePanel from './components/ui/FacePanel'
import SetPanel from './components/ui/SetPanel'

export default function App() {
  const rendererState = useRef(null)

  return (
    <div className="app">
      <aside className="sidebar left">
        <div className="brand">
          <div className="eyebrow">Otto</div>
          <h1>Tile Studio</h1>
        </div>
        <TileControls />
      </aside>

      <main className="viewport">
        <Scene onReady={(state) => { rendererState.current = state }} />
      </main>

      <aside className="sidebar right">
        <div className="brand">
          <div className="eyebrow">Artwork</div>
          <h1>Faces</h1>
        </div>
        <FacePanel which="faceA" title="Face A · Front" defaultEnd="top" />
        <FacePanel which="faceB" title="Face B · Back" defaultEnd="bottom" />
        <SetPanel />

        <div className="brand" style={{ marginTop: 'auto' }}>
          <div className="eyebrow">Output</div>
        </div>
        <ExportPanel rendererState={rendererState} />
      </aside>
    </div>
  )
}
