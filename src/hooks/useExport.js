import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js'

function download(url, filename) {
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

export function exportPNG({ gl, scene, camera }, multiplier = 1) {
  const prevPixelRatio = gl.getPixelRatio()
  gl.setPixelRatio(prevPixelRatio * multiplier)
  gl.render(scene, camera)
  const dataUrl = gl.domElement.toDataURL('image/png')
  gl.setPixelRatio(prevPixelRatio)
  gl.render(scene, camera)
  download(dataUrl, 'otto-tile.png')
}

export function exportGLB({ scene }) {
  const exporter = new GLTFExporter()
  exporter.parse(
    scene,
    (result) => {
      const blob = new Blob([result], { type: 'model/gltf-binary' })
      const url = URL.createObjectURL(blob)
      download(url, 'otto-tile.glb')
      URL.revokeObjectURL(url)
    },
    (error) => {
      console.error('GLB export failed', error)
    },
    { binary: true }
  )
}
