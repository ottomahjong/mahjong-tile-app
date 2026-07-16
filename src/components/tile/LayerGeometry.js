import * as THREE from 'three'

// Ring of points around the tile silhouette in plan view, optionally inset.
// Every ring has exactly 4 * (cornerSegs + 1) points regardless of radii so
// rings at different insets can be stitched into wall/bevel quads 1:1.
function ringPoints(width, depth, radii, inset, cornerSegs) {
  const hw = width / 2 - inset
  const hd = depth / 2 - inset
  const maxR = Math.max(Math.min(hw, hd), 0)
  const r = radii.map((v) => Math.min(Math.max(v - inset, 0), maxR))
  const [tl, tr, br, bl] = r

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

// Bilinear sample of a square heightfield at normalized face coords (u, v).
// v flip matches CanvasTexture flipY so height lines up with the color map.
function sampleHeight(art, u, v) {
  const S = art.size
  const px = Math.min(Math.max(u * (S - 1), 0), S - 1)
  const py = Math.min(Math.max((1 - v) * (S - 1), 0), S - 1)
  const x0 = Math.floor(px)
  const y0 = Math.floor(py)
  const x1 = Math.min(x0 + 1, S - 1)
  const y1 = Math.min(y0 + 1, S - 1)
  const fx = px - x0
  const fy = py - y0
  const d = art.height
  return (
    d[y0 * S + x0] * (1 - fx) * (1 - fy) +
    d[y0 * S + x1] * fx * (1 - fy) +
    d[y1 * S + x0] * (1 - fx) * fy +
    d[y1 * S + x1] * fx * fy
  )
}

// Builds one layer of the tile stack as a closed solid:
//   - vertical walls exactly on the shared silhouette (flush across layers)
//   - optional quarter-round bevel curving INWARD at the top and/or bottom
//   - top/bottom faces with planar UVs, built as a flat annulus around a
//     dense grid over the central safe area; when `topArt`/`bottomArt` is
//     given, the grid is displaced INTO the layer by the artwork heightfield,
//     producing genuinely recessed (engraved) geometry that exports to GLB.
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
  // { height: Float32Array(size*size) 0..1, size, depth (world units), gridRes }
  topArt = null,
  bottomArt = null,
}) {
  const radii = [cornerTL, cornerTR, cornerBR, cornerBL]
  const maxInset = Math.min(width, depth) / 2 - 0.05
  const bTop = Math.min(bevelTop, thickness * 0.45, maxInset)
  const bBot = Math.min(bevelBottom, thickness * 0.45, maxInset)

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

  // Shape-space (x, sy) maps to world (x, y, -sy).
  for (let j = 0; j < M; j++) {
    for (let i = 0; i < N; i++) {
      const [x, sy] = ringPts[j][i]
      positions.push(x, rings[j].y, -sy)
      uvs.push(i / N, rings[j].y / thickness)
    }
  }

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

  const faceUV = (x, sy) => [(x + width / 2) / width, (sy + depth / 2) / depth]

  // One face (top or bottom): flat annulus between the silhouette contour and
  // the inscribed safe rectangle, plus a grid filling the rectangle that can
  // be displaced by the artwork heightfield. Recess direction is always INTO
  // the layer.
  const addFace = (inset, y, isTop, art) => {
    const contourPts = ringPoints(width, depth, radii, inset, cornerSegs)
    const hw = width / 2 - inset
    const hd = depth / 2 - inset
    const maxR = Math.min(Math.max(...radii, 0), Math.min(hw, hd))
    // Largest axis-aligned rect whose corners stay inside the rounded rect
    const cornerCut = maxR * (1 - Math.SQRT1_2) + 0.05
    const rhw = hw - cornerCut
    const rhd = hd - cornerCut
    const start = indices.length

    const mirrorU = (u) => (isTop ? u : 1 - u)

    // Push triangulation results with per-triangle orientation checks:
    // CCW in shape space faces +y in world (earcut's output winding varies
    // with hole presence, so never assume it).
    const pushTris = (tris, pts, base) => {
      for (const [a, b, c] of tris) {
        const A = pts[a]
        const B = pts[b]
        const C = pts[c]
        const cross = (B[0] - A[0]) * (C[1] - B[1]) - (B[1] - A[1]) * (C[0] - B[0])
        const ccw = cross > 0
        if (ccw === isTop) indices.push(base + a, base + b, base + c)
        else indices.push(base + c, base + b, base + a)
      }
    }

    if (rhw < 1 || rhd < 1) {
      // Face too small for a grid: plain polygon cap
      const base = positions.length / 3
      const contour = contourPts.map(([x, sy]) => new THREE.Vector2(x, sy))
      for (const [x, sy] of contourPts) {
        const [u, v] = faceUV(x, sy)
        positions.push(x, y, -sy)
        uvs.push(mirrorU(u), v)
      }
      pushTris(THREE.ShapeUtils.triangulateShape(contour, []), contourPts, base)
      return indices.length - start
    }

    // Annulus: contour (CW) + rect hole (CCW)
    const holePts = [
      [-rhw, -rhd],
      [rhw, -rhd],
      [rhw, rhd],
      [-rhw, rhd],
    ]
    const base = positions.length / 3
    const all = [...contourPts, ...holePts]
    for (const [x, sy] of all) {
      const [u, v] = faceUV(x, sy)
      positions.push(x, y, -sy)
      uvs.push(mirrorU(u), v)
    }
    const contour2 = contourPts.map(([x, sy]) => new THREE.Vector2(x, sy))
    const hole2 = holePts.map(([x, sy]) => new THREE.Vector2(x, sy))
    pushTris(THREE.ShapeUtils.triangulateShape(contour2, [hole2]), all, base)

    // Displaced grid over the safe rect
    const G = art?.gridRes ?? 2
    const gBase = positions.length / 3
    for (let gy = 0; gy <= G; gy++) {
      for (let gx = 0; gx <= G; gx++) {
        const x = -rhw + (2 * rhw * gx) / G
        const sy = -rhd + (2 * rhd * gy) / G
        const [u, v] = faceUV(x, sy)
        let dy = 0
        if (art && gx > 0 && gx < G && gy > 0 && gy < G) {
          dy = art.depth * sampleHeight(art, u, v)
        }
        // Recess cuts INTO the layer (down from a top face, up from a bottom
        // face); raised ink pushes OUT the other way.
        const s = art?.raised ? -1 : 1
        positions.push(x, isTop ? y - s * dy : y + s * dy, -sy)
        uvs.push(mirrorU(u), v)
      }
    }
    for (let gy = 0; gy < G; gy++) {
      for (let gx = 0; gx < G; gx++) {
        const i00 = gBase + gy * (G + 1) + gx
        const i10 = i00 + 1
        const i01 = i00 + (G + 1)
        const i11 = i01 + 1
        if (isTop) indices.push(i00, i11, i01, i00, i10, i11)
        else indices.push(i00, i01, i11, i00, i11, i10)
      }
    }
    return indices.length - start
  }

  const topStart = indices.length
  const topCount = addFace(bTop, thickness, true, topArt)
  const bottomStart = topStart + topCount
  const bottomCount = addFace(bBot, 0, false, bottomArt)

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
