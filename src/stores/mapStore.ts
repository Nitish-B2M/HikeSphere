import { create } from 'zustand';

interface MapState {
  selectedMarkerId: string | null;
  setSelectedMarker: (id: string | null) => void;
  hoveredMarkerId: string | null;
  setHoveredMarker: (id: string | null) => void;
}

export const useMapStore = create<MapState>((set) => ({
  selectedMarkerId: null,
  setSelectedMarker: (id) => set({ selectedMarkerId: id }),
  hoveredMarkerId: null,
  setHoveredMarker: (id) => set({ hoveredMarkerId: id }),
}));
