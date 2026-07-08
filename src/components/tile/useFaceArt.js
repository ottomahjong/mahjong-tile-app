import { useEffect, useState } from 'react'
import * as THREE from 'three'

const MASK_RES = 256

const SAFE = 0.84 // fraction of the face the artwork fits inside at scale 1

// Draw the artwork onto a square `dim` canvas honoring the per-face placement.
// The face is `face.w` x `face.d` world units but the texture is square and
// gets stretched onto the face by the UVs, so we pre-distort here: work in
// world units (via an anisotropic scale) so a circle stays a circle on the
// tile instead of smearing across the long axis. `scale` 1 fits the art to
// the safe area; offsets are fractions of the face.
function drawPlaced(ctx, img, dim, placement, face) {
  const p = placement ?? { x: 0, y: 0, scale: 1, rotation: 0 }
  const W = face?.w ?? 1
  const D = face?.d ?? 1
  const a = img.width / img.height // artwork's own aspect ratio
  const hWorld = SAFE * Math.min(D, W / a) // world height that fits the safe area
  const wWorld = hWorld * a
  ctx.save()
  ctx.translate(dim / 2 + p.x * dim, dim / 2 + p.y * dim)
  ctx.scale(dim / W, dim / D) // world units -> canvas pixels (anisotropic)
  ctx.rotate((p.rotation * Math.PI) / 180) // rotate in isotropic world space
  ctx.scale(p.scale, p.scale)
  ctx.drawImage(img, -wWorld / 2, -hWorld / 2, wWorld, hWorld)
  ctx.restore()
}

function makeCanvas(dim) {
  const c = document.createElement('canvas')
  c.width = dim
  c.height = dim
  return c
}

// Engraving mask from the placed artwork: alpha channel, or inverse
// luminance when the image has no meaningful alpha. Blurred by `softness`
// so the cut walls slope (beveled edge) instead of aliasing, and forced to
// zero at the border so the face grid stitches flush to the annulus.
function buildMask(img, placement, softness, face) {
  const S = MASK_RES
  const c = makeCanvas(S)
  const ctx = c.getContext('2d')
  drawPlaced(ctx, img, S, placement, face)
  const d = ctx.getImageData(0, 0, S, S).data

  let minAlpha = 255
  for (let i = 3; i < d.length; i += 4) minAlpha = Math.min(minAlpha, d[i])
  const useLuma = minAlpha > 240 // fully opaque image: engrave its dark areas

  let mask = new Float32Array(S * S)
  for (let i = 0; i < S * S; i++) {
    mask[i] = useLuma
      ? (1 - (0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2]) / 255) * (d[i * 4 + 3] / 255)
      : d[i * 4 + 3] / 255
  }

  const radius = Math.max(1, Math.round(1 + softness * 5))
  for (let pass = 0; pass < 2; pass++) {
    const out = new Float32Array(S * S)
    // horizontal then vertical box blur
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        let sum = 0
        let n = 0
        for (let k = -radius; k <= radius; k++) {
          const xx = x + k
          if (xx >= 0 && xx < S) {
            sum += mask[y * S + xx]
            n++
          }
        }
        out[y * S + x] = sum / n
      }
    }
    const out2 = new Float32Array(S * S)
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        let sum = 0
        let n = 0
        for (let k = -radius; k <= radius; k++) {
          const yy = y + k
          if (yy >= 0 && yy < S) {
            sum += out[yy * S + x]
            n++
          }
        }
        out2[y * S + x] = sum / n
      }
    }
    mask = out2
  }

  const B = 3
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      if (x < B || y < B || x >= S - B || y >= S - B) mask[y * S + x] = 0
    }
  }
  return mask
}

// Tangent-space normal map from the mask so fine engraving detail reads as
// recessed between displacement vertices.
function normalMapFromMask(mask) {
  const S = MASK_RES
  const c = makeCanvas(S)
  const ctx = c.getContext('2d')
  const img = ctx.createImageData(S, S)
  const strength = 5
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const h = (xx, yy) => -mask[Math.min(Math.max(yy, 0), S - 1) * S + Math.min(Math.max(xx, 0), S - 1)]
      const nx = (h(x - 1, y) - h(x + 1, y)) * strength
      const ny = (h(x, y + 1) - h(x, y - 1)) * strength
      const len = Math.sqrt(nx * nx + ny * ny + 1)
      const i = (y * S + x) * 4
      img.data[i] = ((nx / len) * 0.5 + 0.5) * 255
      img.data[i + 1] = ((ny / len) * 0.5 + 0.5) * 255
      img.data[i + 2] = ((1 / len) * 0.5 + 0.5) * 255
      img.data[i + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  return c
}

// Baked ambient occlusion: recessed areas darken. Real light-direction
// response comes from the displaced geometry's normals; this only deepens
// the cavity floor.
function aoFromMask(mask, strength) {
  const S = MASK_RES
  const c = makeCanvas(S)
  const ctx = c.getContext('2d')
  const img = ctx.createImageData(S, S)
  for (let i = 0; i < S * S; i++) {
    const v = Math.round(255 * (1 - strength * mask[i]))
    img.data[i * 4] = v
    img.data[i * 4 + 1] = v
    img.data[i * 4 + 2] = v
    img.data[i * 4 + 3] = 255
  }
  ctx.putImageData(img, 0, 0)
  return c
}

// Color map: artwork (optionally tinted) composited over the layer color so
// transparent regions don't render black.
function colorMap(img, placement, dim, { tint = null, bg }, face) {
  const c = makeCanvas(dim)
  const ctx = c.getContext('2d')
  if (tint) {
    drawPlaced(ctx, img, dim, placement, face)
    ctx.globalCompositeOperation = 'source-in'
    ctx.fillStyle = tint
    ctx.fillRect(0, 0, dim, dim)
    ctx.globalCompositeOperation = 'destination-over'
  } else {
    drawPlaced(ctx, img, dim, placement, face)
    ctx.globalCompositeOperation = 'destination-over'
  }
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, dim, dim)
  ctx.globalCompositeOperation = 'source-over'
  return c
}

// Alpha map for faces on clear layers: printed ink stays solid while the
// un-inked field keeps the layer's tint opacity.
function alphaMapCanvas(img, placement, baseOpacity, face) {
  const S = MASK_RES
  const c = makeCanvas(S)
  const ctx = c.getContext('2d')
  const g = Math.round(Math.min(baseOpacity, 0.95) * 255)
  ctx.fillStyle = `rgb(${g},${g},${g})`
  ctx.fillRect(0, 0, S, S)
  const solid = makeCanvas(S)
  const sctx = solid.getContext('2d')
  drawPlaced(sctx, img, S, placement, face)
  sctx.globalCompositeOperation = 'source-in'
  sctx.fillStyle = '#fff'
  sctx.fillRect(0, 0, S, S)
  ctx.drawImage(solid, 0, 0)
  return c
}

// Grayscale channel map with one value outside the artwork, another inside
// (for per-pixel metalness/roughness in inlay mode).
function channelMap(img, placement, bgVal, artVal, face) {
  const S = MASK_RES
  const c = makeCanvas(S)
  const ctx = c.getContext('2d')
  const bg = Math.round(bgVal * 255)
  ctx.fillStyle = `rgb(${bg},${bg},${bg})`
  ctx.fillRect(0, 0, S, S)
  const solid = makeCanvas(S)
  const sctx = solid.getContext('2d')
  drawPlaced(sctx, img, S, placement, face)
  sctx.globalCompositeOperation = 'source-in'
  const av = Math.round(artVal * 255)
  sctx.fillStyle = `rgb(${av},${av},${av})`
  sctx.fillRect(0, 0, S, S)
  ctx.drawImage(solid, 0, 0)
  return c
}

const tex = (canvas, srgb = false) => {
  const t = new THREE.CanvasTexture(canvas)
  if (srgb) t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 4
  return t
}

const EMPTY = { map: null, normalMap: null, alphaMap: null, aoMap: null,
  metalnessMap: null, roughnessMap: null, heightArt: null }

// face: { src, mode, fillColor, inlayColor, depth, softness, placement }
// surface: { color, opacity, clear, roughness, metalness } of the target layer
// opts: { gridRes, texRes } quality knobs
// Returns textures plus `heightArt` consumed by buildLayerGeometry for real
// recessed geometry (which is what makes engraving respond to light angle
// and survive GLB export).
export function useFaceArt(face, surface, opts) {
  const src = face?.src ?? null
  const mode = face?.mode ?? 'print'
  const fillColor = face?.fillColor ?? '#1f2124'
  const inlayColor = face?.inlayColor ?? '#b87333'
  const depth = face?.depth ?? 0.8
  const softness = face?.softness ?? 0.35
  const p = face?.placement ?? { x: 0, y: 0, scale: 1, rotation: 0 }
  const surfColor = surface?.color ?? '#ffffff'
  const surfOpacity = surface?.opacity ?? 1
  const surfClear = surface?.clear ?? false
  const surfRough = surface?.roughness ?? 0.5
  const surfMetal = surface?.metalness ?? 0
  const gridRes = opts?.gridRes ?? 160
  const texRes = opts?.texRes ?? 1024
  const faceDim = { w: opts?.faceW ?? 1, d: opts?.faceD ?? 1 }

  const key = src
    ? [mode, fillColor, inlayColor, depth, softness, p.x, p.y, p.scale, p.rotation,
       surfColor, surfOpacity, surfClear, surfRough, surfMetal, gridRes, texRes,
       faceDim.w, faceDim.d, src.length, src.slice(-32)].join('|')
    : null

  const [loaded, setLoaded] = useState(null)

  useEffect(() => {
    if (!src) return undefined
    let cancelled = false
    const img = new Image()
    img.onload = () => {
      if (cancelled) return
      const out = { ...EMPTY }
      const engraved = mode !== 'print'
      const mask = engraved ? buildMask(img, p, softness, faceDim) : null

      if (engraved) {
        out.heightArt = {
          height: mask,
          size: MASK_RES,
          depth: mode === 'inlay' ? Math.min(depth, 0.6) : depth,
          gridRes,
        }
        out.normalMap = tex(normalMapFromMask(mask))
        out.aoMap = tex(aoFromMask(mask, mode === 'engrave-blind' ? 0.35 : 0.5))
        out.aoMap.channel = 0
      }

      if (mode === 'print') {
        out.map = tex(colorMap(img, p, texRes, { bg: surfColor }, faceDim), true)
      } else if (mode === 'engrave-fill') {
        out.map = tex(colorMap(img, p, texRes, { tint: fillColor, bg: surfColor }, faceDim), true)
      } else if (mode === 'inlay') {
        out.map = tex(colorMap(img, p, texRes, { tint: inlayColor, bg: surfColor }, faceDim), true)
        out.metalnessMap = tex(channelMap(img, p, surfMetal, 0.95, faceDim))
        out.roughnessMap = tex(channelMap(img, p, surfRough, 0.2, faceDim))
      }

      if (out.map && surfClear) {
        out.alphaMap = tex(alphaMapCanvas(img, p, surfOpacity, faceDim))
      }

      setLoaded({ key, ...out })
    }
    img.src = src
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, key])

  return key && loaded?.key === key ? loaded : EMPTY
}
