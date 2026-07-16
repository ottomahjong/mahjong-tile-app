import { create } from 'zustand'

// Material families available from real tile manufacturers. `clear` layers
// render with alpha transparency so a tinted clear resin/acrylic layer lets
// artwork on the layer beneath show through.
export const MATERIALS = {
  resin: { label: 'Resin', roughness: 0.5, metalness: 0 },
  acrylic: { label: 'Acrylic (clear)', roughness: 0.06, metalness: 0, clear: true },
  metallic: { label: 'Metallic', roughness: 0.15, metalness: 0.95 },
  wood: { label: 'Wood', roughness: 0.7, metalness: 0 },
}

export const FACE_MODES = [
  { value: 'print', label: 'UV Print (full color)' },
  { value: 'engrave-blind', label: 'Engraved · Blind' },
  { value: 'engrave-fill', label: 'Engraved · Filled' },
  { value: 'inlay', label: 'Inlay (own material)' },
]

export const DEFAULT_PLACEMENT = { x: 0, y: 0, scale: 1, rotation: 0 }

export const VIEW_MODES = [
  { value: 'single', label: 'Single Tile Hero' },
  { value: 'grid', label: 'Full Set Grid' },
  { value: 'stack', label: 'Tile Stack' },
  { value: 'pair', label: 'Front & Back Pair' },
  { value: 'layers', label: 'Layer Detail' },
  { value: 'flatlay', label: 'Marketing Flat Lay' },
]

const defaultLayers = [
  { id: 'base', name: 'Base', thickness: 8, material: 'resin', color: '#f0ebe0', opacity: 1 },
  { id: 'body', name: 'Body', thickness: 10, material: 'resin', color: '#0d1b3e', opacity: 1 },
  { id: 'inlay', name: 'Inlay', thickness: 2, material: 'metallic', color: '#b87333', opacity: 1 },
  { id: 'cap', name: 'Cap', thickness: 6, material: 'acrylic', color: '#e8c4a0', opacity: 0.4 },
]

// Suit-aware ordering for batch-uploaded set fronts (flexible: unknown
// prefixes sort alphabetically after the known ones).
const SUIT_ORDER = ['bam', 'dot', 'crack', 'crak', 'north', 'east', 'south', 'west',
  'red', 'green', 'white', 'dragon', 'flower', 'season', 'joker']

export function setSortKey(name) {
  const m = name.toLowerCase().match(/^([a-z]+)[-_ ]?(\d*)/)
  const prefix = m?.[1] ?? name.toLowerCase()
  const num = m?.[2] ? parseInt(m[2], 10) : 0
  const idx = SUIT_ORDER.indexOf(prefix)
  return [idx === -1 ? SUIT_ORDER.length : idx, prefix, num]
}

let counter = 0

export const useTileStore = create((set) => ({
  // Portrait face, like a real American mahjong tile (taller than wide), so
  // upright artwork aligns vertically without rotating.
  width: 20,
  depth: 28,

  cornerTL: 3,
  cornerTR: 3,
  cornerBL: 3,
  cornerBR: 3,
  cornerLinked: true,
  edgeBevel: 1.5,
  smoothness: 8,

  finish: 'polished',

  layers: defaultLayers,

  // Face artwork. Face A = top of the tile, Face B = bottom (back).
  // { src, name, mode, fillColor, inlayColor, depth, softness, layerId,
  //   placement: { x, y, scale, rotation } }
  faceA: null,
  faceB: null,

  // Full mahjong set: front artwork per tile + one shared back design.
  set: { tiles: [], backSrc: null },

  viewMode: 'single',
  exploded: false,

  // Studio floor / background color, applied in every mockup composition.
  bgColor: '#f5f2ec',
  // Columns for the Full Set Grid (0 = auto-fit to a landscape rectangle).
  gridCols: 0,

  addLayer: () =>
    set((state) => {
      if (state.layers.length >= 6) return state
      counter += 1
      return {
        layers: [
          ...state.layers,
          {
            id: `layer-${Date.now()}-${counter}`,
            name: `Layer ${state.layers.length + 1}`,
            material: 'resin',
            color: '#cccccc',
            thickness: 4,
            opacity: 1,
          },
        ],
      }
    }),

  updateLayer: (id, updates) =>
    set((state) => ({
      layers: state.layers.map((l) => (l.id === id ? { ...l, ...updates } : l)),
    })),

  removeLayer: (id) =>
    set((state) => {
      if (state.layers.length <= 1) return state
      return {
        layers: state.layers.filter((l) => l.id !== id),
        faceA: state.faceA?.layerId === id ? { ...state.faceA, layerId: null } : state.faceA,
        faceB: state.faceB?.layerId === id ? { ...state.faceB, layerId: null } : state.faceB,
      }
    }),

  moveLayer: (id, dir) =>
    set((state) => {
      const i = state.layers.findIndex((l) => l.id === id)
      const j = i + dir
      if (i < 0 || j < 0 || j >= state.layers.length) return state
      const layers = [...state.layers]
      ;[layers[i], layers[j]] = [layers[j], layers[i]]
      return { layers }
    }),

  setFace: (which, face) => set({ [which]: face }),

  updateFace: (which, updates) =>
    set((state) => (state[which] ? { [which]: { ...state[which], ...updates } } : state)),

  updatePlacement: (which, updates) =>
    set((state) =>
      state[which]
        ? { [which]: { ...state[which], placement: { ...state[which].placement, ...updates } } }
        : state
    ),

  addSetTiles: (tiles) =>
    set((state) => {
      const merged = [...state.set.tiles]
      for (const t of tiles) {
        const existing = merged.findIndex((x) => x.name === t.name)
        if (existing >= 0) merged[existing] = { ...merged[existing], src: t.src }
        else merged.push(t)
      }
      merged.sort((a, b) => {
        const ka = setSortKey(a.name)
        const kb = setSortKey(b.name)
        return ka[0] - kb[0] || ka[1].localeCompare(kb[1]) || ka[2] - kb[2]
      })
      return { set: { ...state.set, tiles: merged } }
    }),

  updateSetTile: (id, updates) =>
    set((state) => ({
      set: { ...state.set, tiles: state.set.tiles.map((t) => (t.id === id ? { ...t, ...updates } : t)) },
    })),

  removeSetTile: (id) =>
    set((state) => ({
      set: { ...state.set, tiles: state.set.tiles.filter((t) => t.id !== id) },
    })),

  setBackSrc: (src) => set((state) => ({ set: { ...state.set, backSrc: src } })),
  clearSet: () => set({ set: { tiles: [], backSrc: null } }),

  setViewMode: (m) => set({ viewMode: m }),
  setBgColor: (c) => set({ bgColor: c }),
  setGridCols: (n) => set({ gridCols: n }),

  setCorner: (corner, value) =>
    set((state) => {
      if (state.cornerLinked) {
        return { cornerTL: value, cornerTR: value, cornerBL: value, cornerBR: value }
      }
      return { [corner]: value }
    }),

  setCornerLinked: (linked) =>
    set((state) => {
      if (!linked) return { cornerLinked: false }
      const v = state.cornerTL
      return { cornerLinked: true, cornerTR: v, cornerBL: v, cornerBR: v }
    }),

  setEdgeBevel: (v) => set({ edgeBevel: v }),
  setSmoothness: (v) => set({ smoothness: v }),
  setFinish: (f) => set({ finish: f }),
  toggleExploded: () => set((state) => ({ exploded: !state.exploded })),
}))
