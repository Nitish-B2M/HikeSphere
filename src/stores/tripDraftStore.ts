import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { MapCategory, Marker, RouteLeg, TravelMode } from '@/types';

/** A marker in the draft. Temp markers (not yet in DB) start with id like "tmp_…". */
export type DraftMarker = Marker;
export type DraftRouteLeg = RouteLeg;

export interface TripDraft {
  mapId: string | null;
  title: string;
  description: string | null;
  category: MapCategory;
  travel_mode: TravelMode;
  total_distance_meters: number | null;
  total_duration_seconds: number | null;
  markers: DraftMarker[];
  routeLegs: DraftRouteLeg[];
  /** True if local changes haven't been pushed to DB yet. */
  dirty: boolean;
  /** When draft was last hydrated from DB. Used for stale checks. */
  hydratedAt: number | null;

  hydrate: (payload: {
    mapId: string;
    title: string;
    description: string | null;
    category: MapCategory;
    travel_mode: TravelMode;
    total_distance_meters: number | null;
    total_duration_seconds: number | null;
    markers: DraftMarker[];
    routeLegs: DraftRouteLeg[];
  }) => void;
  clear: () => void;

  setMeta: (patch: Partial<Pick<TripDraft, 'title' | 'description' | 'category' | 'travel_mode'>>) => void;
  addMarker: (m: Omit<DraftMarker, 'created_at' | 'updated_at' | 'sequence_order' | 'id'> & { id?: string }) => DraftMarker;
  updateMarker: (id: string, patch: Partial<DraftMarker>) => void;
  deleteMarker: (id: string) => void;
  reorderMarkers: (newOrder: DraftMarker[]) => void;
  setRouteLegs: (legs: DraftRouteLeg[], totalDistance: number, totalDuration: number) => void;
  markClean: () => void;
}

function emptyState(): Omit<
  TripDraft,
  'hydrate' | 'clear' | 'setMeta' | 'addMarker' | 'updateMarker' | 'deleteMarker' | 'reorderMarkers' | 'setRouteLegs' | 'markClean'
> {
  return {
    mapId: null,
    title: '',
    description: null,
    category: 'other',
    travel_mode: 'DRIVING',
    total_distance_meters: null,
    total_duration_seconds: null,
    markers: [],
    routeLegs: [],
    dirty: false,
    hydratedAt: null,
  };
}

function tempId(): string {
  return `tmp_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
}

export const useTripDraft = create<TripDraft>()(
  persist(
    (set, get) => ({
      ...emptyState(),

      hydrate: (payload) => {
        const current = get();
        // Only hydrate if (a) this is a different map, or
        // (b) we have no draft for this map yet, or
        // (c) draft for this map is clean (no unsaved changes — DB is source of truth).
        const sameMap = current.mapId === payload.mapId;
        if (sameMap && current.dirty) {
          // Keep local edits; don't overwrite.
          return;
        }
        set({
          mapId: payload.mapId,
          title: payload.title,
          description: payload.description,
          category: payload.category,
          travel_mode: payload.travel_mode,
          total_distance_meters: payload.total_distance_meters,
          total_duration_seconds: payload.total_duration_seconds,
          markers: payload.markers,
          routeLegs: payload.routeLegs,
          dirty: false,
          hydratedAt: Date.now(),
        });
      },

      clear: () => set(emptyState()),

      setMeta: (patch) => set((s) => ({ ...s, ...patch, dirty: true })),

      addMarker: (m) => {
        const id = m.id ?? tempId();
        const state = get();
        const next: DraftMarker = {
          id,
          map_id: state.mapId ?? '',
          user_id: m.user_id,
          label: m.label,
          sequence_order: state.markers.length,
          latitude: m.latitude,
          longitude: m.longitude,
          address: m.address ?? null,
          place_id: m.place_id ?? null,
          color: m.color ?? '#4F46E5',
          notes: m.notes ?? null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        set({ markers: [...state.markers, next], dirty: true });
        return next;
      },

      updateMarker: (id, patch) =>
        set((s) => ({
          markers: s.markers.map((m) => (m.id === id ? { ...m, ...patch, updated_at: new Date().toISOString() } : m)),
          dirty: true,
        })),

      deleteMarker: (id) =>
        set((s) => {
          const remaining = s.markers.filter((m) => m.id !== id).map((m, i) => ({ ...m, sequence_order: i }));
          return { markers: remaining, dirty: true };
        }),

      reorderMarkers: (newOrder) =>
        set({
          markers: newOrder.map((m, i) => ({ ...m, sequence_order: i })),
          dirty: true,
        }),

      setRouteLegs: (legs, totalDistance, totalDuration) =>
        set({
          routeLegs: legs,
          total_distance_meters: totalDistance,
          total_duration_seconds: totalDuration,
          dirty: true,
        }),

      markClean: () => set({ dirty: false }),
    }),
    {
      name: 'hikesphere:trip-draft',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      // Persist everything except action functions (zustand persist auto-skips functions).
    }
  )
);

export function isTempMarkerId(id: string): boolean {
  return id.startsWith('tmp_');
}
