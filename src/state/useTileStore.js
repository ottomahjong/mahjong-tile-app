import { create } from 'zustand'

const MATERIALS = {
  resin: { roughness: 0.6, metalness: 0 },
  acrylic: { roughness: 0.3, metalness: 0, transmission: 0.2 },
  metal: { roughness: 0.25, metalness: 1 },
  wood: { roughness: 0.7, metalness: 0 },
}

export const useTileStore = create((set) => ({
  width: 28,
  depth: 20,
  cornerRadius: 2.5,
  finish: 'polished',

  layers: [
    {
      id: 1,
      material: 'resin',
      color: '#f2efe8',
      thickness: 18,
    },
  ],

  addLayer: () =>
    set((state) => {
      if (state.layers.length >= 4) return state
      return {
        layers: [
          ...state.layers,
          {
            id: Date.now(),
            material: 'resin',
            color: '#cccccc',
            thickness: 4,
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

  setRadius: (r) => set({ cornerRadius: r }),
  setFinish: (f) => set({ finish: f }),
}))