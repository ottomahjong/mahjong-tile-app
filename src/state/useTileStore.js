import { create } from 'zustand'

// Material families available from real tile manufacturers. `clear` layers
// render with alpha transparency so a tinted clear resin/acrylic layer lets
// artwork printed on the layer beneath show through — the opacity slider is
// the strength of the tint.
export const MATERIALS = {
  resin: { label: 'Resin', roughness: 0.5, metalness: 0 },
  acrylic: { label: 'Acrylic (clear)', roughness: 0.06, metalness: 0, clear: true },
  metallic: { label: 'Metallic', roughness: 0.15, metalness: 0.95 },
  wood: { label: 'Wood', roughness: 0.7, metalness: 0 },
}

const defaultLayers = [
  { id: 'base', name: 'Base', thickness: 8, material: 'resin', color: '#f0ebe0', opacity: 1 },
  { id: 'body', name: 'Body', thickness: 10, material: 'resin', color: '#0d1b3e', opacity: 1 },
  { id: 'inlay', name: 'Inlay', thickness: 2, material: 'metallic', color: '#b87333', opacity: 1 },
  { id: 'cap', name: 'Cap', thickness: 6, material: 'acrylic', color: '#e8c4a0', opacity: 0.4 },
]

let layerCounter = 0

export const useTileStore = create((set) => ({
  // Footprint dimensions
  width: 28,
  depth: 20,

  // Per-corner radii
  cornerTL: 3,
  cornerTR: 3,
  cornerBL: 3,
  cornerBR: 3,
  cornerLinked: true,
  edgeBevel: 1.5,
  smoothness: 8,

  finish: 'polished',

  // Layer stack, bottom to top
  layers: defaultLayers,

  // Face artwork. Face A = top of the tile, Face B = bottom (back).
  // { src, name, mode: 'print' | 'engrave-paint' | 'engrave-blind',
  //   paintColor, depth, layerId } — layerId is the layer the design is
  //   applied to (top face for A, bottom face for B), so a print can sit on
  //   an inner acrylic layer behind a clear cap.
  faceA: null,
  faceB: null,

  // View
  exploded: false,

  addLayer: () =>
    set((state) => {
      if (state.layers.length >= 6) return state
      layerCounter += 1
      return {
        layers: [
          ...state.layers,
          {
            id: `layer-${Date.now()}-${layerCounter}`,
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
