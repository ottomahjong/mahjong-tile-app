import { create } from 'zustand'

export const MATERIALS = {
  resin: { roughness: 0.6, metalness: 0 },
  acrylic: { roughness: 0.3, metalness: 0, transmission: 0.2 },
  metallic: { roughness: 0.15, metalness: 0.95 },
  wood: { roughness: 0.7, metalness: 0 },
}

const defaultLayers = [
  { id: 'base', name: 'Base', thickness: 8, material: 'resin', color: '#f0ebe0', roughness: 0.6, metalness: 0 },
  { id: 'body', name: 'Body', thickness: 10, material: 'resin', color: '#0d1b3e', roughness: 0.3, metalness: 0.1 },
  { id: 'inlay', name: 'Inlay', thickness: 2, material: 'metallic', color: '#b87333', roughness: 0.15, metalness: 0.95 },
  { id: 'cap', name: 'Cap', thickness: 6, material: 'acrylic', color: '#e8c4a0', opacity: 0.85 },
]

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
  edgeBevel: 1,
  smoothness: 8,

  finish: 'polished',

  // Layer stack, bottom to top: Base, Body, Inlay, Cap
  layers: defaultLayers,

  // View
  viewMode: 'single', // single | flatlay | isogrid | exploded
  exploded: false,

  addLayer: () =>
    set((state) => {
      if (state.layers.length >= 4) return state
      return {
        layers: [
          ...state.layers,
          {
            id: `layer-${Date.now()}`,
            name: 'Layer',
            material: 'resin',
            color: '#cccccc',
            thickness: 4,
            roughness: 0.6,
            metalness: 0,
          },
        ],
      }
    }),

  updateLayer: (id, updates) =>
    set((state) => ({
      layers: state.layers.map((l) =>
        l.id === id ? { ...l, ...updates } : l
      ),
    })),

  removeLayer: (id) =>
    set((state) => ({
      layers: state.layers.filter((l) => l.id !== id),
    })),

  setCorner: (corner, value) =>
    set((state) => {
      if (state.cornerLinked) {
        return {
          cornerTL: value,
          cornerTR: value,
          cornerBL: value,
          cornerBR: value,
        }
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
  setViewMode: (m) => set({ viewMode: m, exploded: m === 'exploded' }),
  toggleExploded: () =>
    set((state) => ({
      exploded: !state.exploded,
      viewMode: !state.exploded ? 'exploded' : 'single',
    })),
}))
