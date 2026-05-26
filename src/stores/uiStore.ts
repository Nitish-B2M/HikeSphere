import { create } from 'zustand';

export type SheetSnap = 'collapsed' | 'half' | 'full';

interface UIState {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  sheetSnap: SheetSnap;
  setSheetSnap: (snap: SheetSnap) => void;
  showLabels: boolean;
  setShowLabels: (v: boolean) => void;
}

const LABELS_KEY = 'mlm:showLabels';

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  sheetSnap: 'half',
  setSheetSnap: (snap) => set({ sheetSnap: snap }),
  showLabels: typeof window !== 'undefined' ? localStorage.getItem(LABELS_KEY) !== 'false' : true,
  setShowLabels: (v) => {
    if (typeof window !== 'undefined') localStorage.setItem(LABELS_KEY, String(v));
    set({ showLabels: v });
  },
}));
