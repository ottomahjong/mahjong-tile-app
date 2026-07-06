import * as THREE from 'three'

// Builds a single rounded-rectangle footprint shared by every layer so the
// stack has one consistent silhouette instead of each layer rounding its own
// box independently (the "muffin" bug).
export function buildSilhouette(width, depth, rTL, rTR, rBR, rBL) {
  const hw = width / 2
  const hd = depth / 2

  const maxR = Math.min(hw, hd)
  const tl = Math.min(rTL, maxR)
  const tr = Math.min(rTR, maxR)
  const br = Math.min(rBR, maxR)
  const bl = Math.min(rBL, maxR)

  const shape = new THREE.Shape()
  shape.moveTo(-hw, -hd + bl)
  shape.lineTo(-hw, hd - tl)
  shape.quadraticCurveTo(-hw, hd, -hw + tl, hd)
  shape.lineTo(hw - tr, hd)
  shape.quadraticCurveTo(hw, hd, hw, hd - tr)
  shape.lineTo(hw, -hd + br)
  shape.quadraticCurveTo(hw, -hd, hw - br, -hd)
  shape.lineTo(-hw + bl, -hd)
  shape.quadraticCurveTo(-hw, -hd, -hw, -hd + bl)

  return shape
}
