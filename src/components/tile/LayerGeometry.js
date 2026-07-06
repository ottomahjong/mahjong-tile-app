import * as THREE from 'three'

// Ring of points around the tile silhouette in plan view, optionally inset.
// Every ring has exactly 4 * (cornerSegs + 1) points regardless of radii so
// rings at different insets can be stitched into wall/bevel quads 1:1.
// Insetting a rounded rectangle by `o` is exact: shrink the rect by o and
// reduce each corner radius by o (clamped at 0).
function ringPoints(width, depth, radii, inset, cornerSegs) {
  const hw = width / 2 - inset
  const hd = depth / 2 - inset
  const maxR = Math.max(Math.min(hw, hd), 0)
  const r = radii.map((v) => Math.min(Math.max(v - inset, 0), maxR))
  const [tl, tr, br, bl] = r

  // Arc sweep order matches the TL/TR/BR/BL slider convention:
  // up the left edge, across the top, down the right, back along the bottom.
  const corners = [
    { r: tl, cx: -hw + tl, cy: hd - tl, a0: Math.PI },
    { r: tr, cx: hw - tr, cy: hd - tr, a0: Math.PI / 2 },
    { r: br, cx: hw - br, cy: -hd + br, a0: 0 },
    { r: bl, cx: -hw + bl, cy: -hd + bl, a0: -Math.PI / 2 },
  ]

  const pts = []
  for (const c of corners) {
    for (let s = 0; s <= cornerSegs; s++) {
      const a = c.a0 - (s / cornerSegs) * (Math.PI / 2)
      pts.push([c.cx + c.r * Math.cos(a), c.cy + c.r * Math.sin(a)])
    }
  }
  return pts
}

// Builds one layer of the tile stack as a closed solid:
//   - vertical walls exactly on the shared silhouette (flush across layers)
//   - optional quarter-round bevel curving INWARD at the top and/or bottom,
//     so beveled layers never protrude past the stack footprint
//   - flat top/bottom faces with planar UVs for face artwork
// Material groups: 0 = sides + bevels, 1 = top face, 2 = bottom face.
export function buildLayerGeometry({
  width,
  depth,
  thickness,
  cornerTL,
  cornerTR,
  cornerBR,
  cornerBL,
  bevelTop = 0,
  bevelBottom = 0,
  cornerSegs = 8,
  bevelSegs = 5,
}) {
  const radii = [cornerTL, cornerTR, cornerBR, cornerBL]
  const maxInset = Math.min(width, depth) / 2 - 0.05
  const bTop = Math.min(bevelTop, thickness * 0.45, maxInset)
  const bBot = Math.min(bevelBottom, thickness * 0.45, maxInset)

  // Ring schedule bottom → top: each entry is { inset, y }.
  const rings = []
  if (bBot > 0.001) {
    for (let s = 0; s <= bevelSegs; s++) {
      const t = (s / bevelSegs) * (Math.PI / 2)
      rings.push({ inset: bBot * (1 - Math.sin(t)), y: bBot * (1 - Math.cos(t)) })
    }
  } else {
    rings.push({ inset: 0, y: 0 })
  }
  if (bTop > 0.001) {
    for (let s = 0; s <= bevelSegs; s++) {
      const t = (s / bevelSegs) * (Math.PI / 2)
      rings.push({ inset: bTop * (1 - Math.cos(t)), y: thickness - bTop + bTop * Math.sin(t) })
    }
  } else {
    rings.push({ inset: 0, y: thickness })
  }

  const ringPts = rings.map((ring) => ringPoints(width, depth, radii, ring.inset, cornerSegs))
  const N = ringPts[0].length
  const M = rings.length

  const positions = []
  const uvs = []
  const indices = []

  // Shape-space (x, sy) maps to world (x, y, -sy) — same orientation the
  // previous ExtrudeGeometry + rotateX(-PI/2) produced.
  for (let j = 0; j < M; j++) {
    for (let i = 0; i < N; i++) {
      const [x, sy] = ringPts[j][i]
      positions.push(x, rings[j].y, -sy)
      uvs.push(i / N, rings[j].y / thickness)
    }
  }

  // Wall + bevel bands
  const sideStart = 0
  for (let j = 0; j < M - 1; j++) {
    for (let i = 0; i < N; i++) {
      const i2 = (i + 1) % N
      const a = j * N + i
      const b = j * N + i2
      const c = (j + 1) * N + i2
      const d = (j + 1) * N + i
      indices.push(a, c, b, a, d, c)
    }
  }
  const sideCount = indices.length - sideStart

  // Face caps (top inset by bTop, bottom by bBot) with planar UVs
  const addCap = (capRingPts, y, isTop) => {
    const base = positions.length / 3
    const contour = capRingPts.map(([x, sy]) => new THREE.Vector2(x, sy))
    for (const [x, sy] of capRingPts) {
      positions.push(x, y, -sy)
      const u = (x + width / 2) / width
      const v = (sy + depth / 2) / depth
      // Mirror U on the bottom face so artwork reads correctly from below
      uvs.push(isTop ? u : 1 - u, v)
    }
    const tris = THREE.ShapeUtils.triangulateShape(contour, [])
    for (const [a, b, c] of tris) {
      if (isTop) indices.push(base + a, base + b, base + c)
      else indices.push(base + c, base + b, base + a)
    }
  }

  const topStart = indices.length
  addCap(ringPoints(width, depth, radii, bTop, cornerSegs), thickness, true)
  const topCount = indices.length - topStart

  const bottomStart = indices.length
  addCap(ringPoints(width, depth, radii, bBot, cornerSegs), 0, false)
  const bottomCount = indices.length - bottomStart

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geo.setIndex(indices)
  geo.addGroup(sideStart, sideCount, 0)
  geo.addGroup(topStart, topCount, 1)
  geo.addGroup(bottomStart, bottomCount, 2)
  geo.computeVertexNormals()
  return geo
}
