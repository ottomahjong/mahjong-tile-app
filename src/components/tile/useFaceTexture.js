import { useEffect, useState } from 'react'
import * as THREE from 'three'

const TEX_SIZE = 1024

// Draw the uploaded artwork centered on the face with a small margin.
// `bg` fills the canvas behind the art (the layer color) — without it,
// transparent PNG regions would render black when used as a color map.
function drawArtwork(img, { tint = null, bg = null } = {}) {
  const canvas = document.createElement('canvas')
  canvas.width = TEX_SIZE
  canvas.height = TEX_SIZE
  const ctx = canvas.getContext('2d')

  const margin = 0.08
  const avail = TEX_SIZE * (1 - margin * 2)
  const scale = Math.min(avail / img.width, avail / img.height)
  const w = img.width * scale
  const h = img.height * scale

  if (tint) {
    ctx.drawImage(img, (TEX_SIZE - w) / 2, (TEX_SIZE - h) / 2, w, h)
    ctx.globalCompositeOperation = 'source-in'
    ctx.fillStyle = tint
    ctx.fillRect(0, 0, TEX_SIZE, TEX_SIZE)
    ctx.globalCompositeOperation = 'destination-over'
  } else {
    ctx.drawImage(img, (TEX_SIZE - w) / 2, (TEX_SIZE - h) / 2, w, h)
    ctx.globalCompositeOperation = 'destination-over'
  }
  if (bg) {
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, TEX_SIZE, TEX_SIZE)
  }
  ctx.globalCompositeOperation = 'source-over'
  return canvas
}

// Alpha map for faces on clear layers: the un-inked field keeps the layer's
// tint opacity while printed artwork stays solid — like real UV ink on
// tinted acrylic. (alphaMap reads the green channel.)
function buildAlphaCanvas(img, baseOpacity) {
  const canvas = document.createElement('canvas')
  canvas.width = TEX_SIZE
  canvas.height = TEX_SIZE
  const ctx = canvas.getContext('2d')
  const g = Math.round(baseOpacity * 255)
  ctx.fillStyle = `rgb(${g},${g},${g})`
  ctx.fillRect(0, 0, TEX_SIZE, TEX_SIZE)

  const margin = 0.08
  const avail = TEX_SIZE * (1 - margin * 2)
  const scale = Math.min(avail / img.width, avail / img.height)
  const w = img.width * scale
  const h = img.height * scale
  const solid = document.createElement('canvas')
  solid.width = TEX_SIZE
  solid.height = TEX_SIZE
  const sctx = solid.getContext('2d')
  sctx.drawImage(img, (TEX_SIZE - w) / 2, (TEX_SIZE - h) / 2, w, h)
  sctx.globalCompositeOperation = 'source-in'
  sctx.fillStyle = '#fff'
  sctx.fillRect(0, 0, TEX_SIZE, TEX_SIZE)
  ctx.drawImage(solid, 0, 0)
  return canvas
}

// Builds a tangent-space normal map from the artwork's alpha channel so the
// design reads as recessed (engraved) into the face.
function buildNormalMap(img) {
  const size = TEX_SIZE
  const artCanvas = drawArtwork(img)
  const ctx = artCanvas.getContext('2d')
  const src = ctx.getImageData(0, 0, size, size).data

  const height = new Float32Array(size * size)
  for (let i = 0; i < size * size; i++) {
    height[i] = -src[i * 4 + 3] / 255 // recessed where artwork is opaque
  }

  // Slight blur so engraving walls slope instead of aliasing
  const blurred = new Float32Array(size * size)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let sum = 0
      let n = 0
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx
          const yy = y + dy
          if (xx >= 0 && xx < size && yy >= 0 && yy < size) {
            sum += height[yy * size + xx]
            n++
          }
        }
      }
      blurred[y * size + x] = sum / n
    }
  }

  const out = document.createElement('canvas')
  out.width = size
  out.height = size
  const octx = out.getContext('2d')
  const imgData = octx.createImageData(size, size)
  const strength = 4
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const xl = blurred[y * size + Math.max(x - 1, 0)]
      const xr = blurred[y * size + Math.min(x + 1, size - 1)]
      const yu = blurred[Math.max(y - 1, 0) * size + x]
      const yd = blurred[Math.min(y + 1, size - 1) * size + x]
      const nx = (xl - xr) * strength
      const ny = (yd - yu) * strength
      const nz = 1
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz)
      const i = (y * size + x) * 4
      imgData.data[i] = ((nx / len) * 0.5 + 0.5) * 255
      imgData.data[i + 1] = ((ny / len) * 0.5 + 0.5) * 255
      imgData.data[i + 2] = ((nz / len) * 0.5 + 0.5) * 255
      imgData.data[i + 3] = 255
    }
  }
  octx.putImageData(imgData, 0, 0)
  return out
}

const EMPTY = { map: null, normalMap: null, alphaMap: null }

// face: { src, mode: 'print' | 'engrave-paint' | 'engrave-blind', paintColor }
// surface: { color, opacity, clear } — the layer the face art sits on, so the
// artwork can be composited over the layer color (and keep the clear layer's
// tint opacity in the un-inked field).
// Returns { map, normalMap, alphaMap }; textures rebuild when inputs change.
export function useFaceTexture(face, surface) {
  const src = face?.src ?? null
  const mode = face?.mode ?? 'print'
  const paintColor = face?.paintColor ?? '#1a1a1a'
  const surfColor = surface?.color ?? '#ffffff'
  const surfOpacity = surface?.opacity ?? 1
  const surfClear = surface?.clear ?? false
  const key = src
    ? `${mode}|${paintColor}|${surfColor}|${surfOpacity}|${surfClear}|${src.slice(0, 64)}|${src.length}`
    : null

  const [loaded, setLoaded] = useState(null) // { key, map, normalMap, alphaMap }

  useEffect(() => {
    if (!src) return undefined
    let cancelled = false
    const img = new Image()
    img.onload = () => {
      if (cancelled) return
      let map = null
      let normalMap = null
      let alphaMap = null

      if (mode === 'print' || mode === 'engrave-paint') {
        const tint = mode === 'engrave-paint' ? paintColor : null
        map = new THREE.CanvasTexture(drawArtwork(img, { tint, bg: surfColor }))
        map.colorSpace = THREE.SRGBColorSpace
        map.anisotropy = 4
        if (surfClear) {
          alphaMap = new THREE.CanvasTexture(buildAlphaCanvas(img, Math.min(surfOpacity, 0.95)))
        }
      }
      if (mode !== 'print') {
        normalMap = new THREE.CanvasTexture(buildNormalMap(img))
        normalMap.anisotropy = 4
      }
      setLoaded({ key, map, normalMap, alphaMap })
    }
    img.src = src
    return () => {
      cancelled = true
    }
  }, [src, mode, paintColor, surfColor, surfOpacity, surfClear, key])

  // Only hand back textures that match the current face config; otherwise
  // render untextured until the load effect catches up.
  return key && loaded?.key === key ? loaded : EMPTY
}
