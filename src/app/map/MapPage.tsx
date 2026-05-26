import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Menu, Save, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import { useAuth } from '@/hooks/useAuth';
import { useMap } from '@/hooks/useMaps';
import { useMarkers } from '@/hooks/useMarkers';
import { useRouteLegs } from '@/hooks/useRoute';
import { useIsDesktop, useIsMobile } from '@/hooks/useMediaQuery';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useMapStore } from '@/stores/mapStore';
import { useUIStore } from '@/stores/uiStore';
import { useTripDraft } from '@/stores/tripDraftStore';
import { MapView } from '@/components/map/MapView';
import { MapFABs } from '@/components/map/MapFABs';
import { PlacesSearch } from '@/components/search/PlacesSearch';
import { Sidebar } from '@/components/sidebar/Sidebar';
import { MarkerList } from '@/components/sidebar/MarkerList';
import { RouteSummary } from '@/components/sidebar/RouteSummary';
import { BottomSheet } from '@/components/bottom-sheet/BottomSheet';
import { MiniMarkerCard } from '@/components/bottom-sheet/MiniMarkerCard';
import { MarkerEditDialog } from '@/components/marker/MarkerEditDialog';
import { SaveTripDialog } from '@/components/map/SaveTripDialog';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { Badge } from '@/components/ui/Badge';
import { reverseGeocodeMapbox } from '@/lib/api/mapbox';
import { computeRouteLegs } from '@/lib/api/directions';
import { commitTripDraft } from '@/lib/api/commitDraft';
import { formatDistance, formatDuration } from '@/lib/utils';
import { TRAVEL_MODE_LABELS } from '@/constants/config';
import type { LatLng, MapCategory, Marker, TravelMode } from '@/types';

export default function MapPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isDesktop = useIsDesktop();
  const isMobile = useIsMobile();

  // DB queries — used ONLY for initial hydration of the draft, not for live rendering.
  const { data: dbMap } = useMap(id);
  const { data: dbMarkers } = useMarkers(id);
  const { data: dbRouteLegs } = useRouteLegs(id);

  // Draft store — single source of truth for everything rendered.
  const draft = useTripDraft();

  // Hydrate the draft whenever fresh DB data arrives, but the store itself
  // refuses to overwrite a dirty draft for the same map.
  useEffect(() => {
    if (!dbMap || !dbMarkers || !dbRouteLegs) return;
    draft.hydrate({
      mapId: dbMap.id,
      title: dbMap.title,
      description: dbMap.description,
      category: dbMap.category ?? 'other',
      travel_mode: dbMap.travel_mode,
      total_distance_meters: dbMap.total_distance_meters,
      total_duration_seconds: dbMap.total_duration_seconds,
      markers: dbMarkers,
      routeLegs: dbRouteLegs,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dbMap?.id, dbMarkers, dbRouteLegs]);

  // Read everything for rendering from the draft.
  const markers = draft.markers;
  const routeLegs = draft.routeLegs;
  const travelMode = draft.travel_mode;
  const title = draft.title || dbMap?.title || 'Untitled';
  const dirty = draft.dirty;

  const { sidebarOpen, toggleSidebar, showLabels, setShowLabels } = useUIStore();
  const { selectedMarkerId, setSelectedMarker } = useMapStore();
  const { getCurrentPosition } = useGeolocation();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fitCounter, setFitCounter] = useState(0);

  const editingMarker = useMemo(() => markers.find((m) => m.id === editingId) ?? null, [markers, editingId]);
  const editingIndex = useMemo(() => markers.findIndex((m) => m.id === editingId), [markers, editingId]);

  // ---- draft mutators (all in-memory) ----
  const addMarkerAt = useCallback(
    async (
      latLng: LatLng,
      meta?: { label?: string; address?: string | null; placeId?: string | null }
    ) => {
      if (!user) return;
      let address = meta?.address ?? null;
      let placeId = meta?.placeId ?? null;
      if (!address) {
        const r = await reverseGeocodeMapbox(latLng);
        address = r.address;
        placeId = r.placeId;
      }
      const label = meta?.label ?? address ?? `Marker ${markers.length + 1}`;
      useTripDraft.getState().addMarker({
        map_id: id ?? '',
        user_id: user.id,
        label,
        latitude: latLng.lat,
        longitude: latLng.lng,
        address,
        place_id: placeId,
        color: '#4F46E5',
        notes: null,
      });
    },
    [id, user, markers.length]
  );

  const handleMarkerDragEnd = useCallback(
    async (markerId: string, latLng: LatLng) => {
      const r = await reverseGeocodeMapbox(latLng);
      useTripDraft.getState().updateMarker(markerId, {
        latitude: latLng.lat,
        longitude: latLng.lng,
        address: r.address,
        place_id: r.placeId,
      });
    },
    []
  );

  const handleDelete = useCallback(
    (markerId: string) => {
      useTripDraft.getState().deleteMarker(markerId);
      if (selectedMarkerId === markerId) setSelectedMarker(null);
    },
    [selectedMarkerId, setSelectedMarker]
  );

  const handleReorder = useCallback((newOrder: Marker[]) => {
    useTripDraft.getState().reorderMarkers(newOrder);
  }, []);

  const handleChangeMode = (mode: TravelMode) => {
    useTripDraft.getState().setMeta({ travel_mode: mode });
  };

  const handleFit = () => setFitCounter((c) => c + 1);

  const handleLocate = async () => {
    try {
      const pos = await getCurrentPosition();
      await addMarkerAt(pos, { label: 'My location' });
    } catch (e: any) {
      toast.error(e.message ?? 'Could not get location');
    }
  };

  // ---- local route recompute (draft-only) ----
  const [routeLoading, setRouteLoading] = useState(false);
  useEffect(() => {
    if (markers.length < 2) {
      if (routeLegs.length > 0) {
        useTripDraft.getState().setRouteLegs([], 0, 0);
      }
      return;
    }
    let cancelled = false;
    setRouteLoading(true);
    const t = setTimeout(async () => {
      try {
        const legs = await computeRouteLegs(markers, travelMode);
        if (cancelled) return;
        const totalDist = legs.reduce((acc, l) => acc + l.distanceMeters, 0);
        const totalDur = legs.reduce((acc, l) => acc + l.durationSeconds, 0);
        // Convert RouteLegResult → RouteLeg shape stored in draft.
        const legRows = legs.map((l, i) => ({
          id: `tmp_leg_${i}`,
          map_id: id ?? '',
          from_marker_id: l.fromMarkerId,
          to_marker_id: l.toMarkerId,
          leg_order: i,
          distance_meters: l.distanceMeters,
          duration_seconds: l.durationSeconds,
          polyline_encoded: l.polylineEncoded,
          created_at: new Date().toISOString(),
        }));
        useTripDraft.getState().setRouteLegs(legRows, totalDist, totalDur);
      } finally {
        if (!cancelled) setRouteLoading(false);
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    id,
    travelMode,
    markers.map((m) => `${m.id}:${m.sequence_order}:${m.latitude}:${m.longitude}`).join('|'),
  ]);

  // Preload the maps library so Google JS is ready even if user hasn't focused the map.
  useMapsLibrary('maps');

  // ---- save / commit ----
  const handleSave = async (patch: { title: string; description: string | null; category: MapCategory }) => {
    if (!id || !user) return;
    setSaving(true);
    try {
      useTripDraft.getState().setMeta(patch);
      const state = useTripDraft.getState();
      const result = await commitTripDraft({
        mapId: id,
        userId: user.id,
        title: patch.title,
        description: patch.description,
        category: patch.category,
        travel_mode: state.travel_mode,
        total_distance_meters: state.total_distance_meters,
        total_duration_seconds: state.total_duration_seconds,
        markers: state.markers,
        routeLegs: state.routeLegs,
      });
      // Re-hydrate from the fresh DB rows so temp IDs are replaced with real ones.
      useTripDraft.getState().hydrate({
        mapId: id,
        title: patch.title,
        description: patch.description,
        category: patch.category,
        travel_mode: state.travel_mode,
        total_distance_meters: state.total_distance_meters,
        total_duration_seconds: state.total_duration_seconds,
        markers: result.markers,
        routeLegs: result.routeLegs,
      });
      useTripDraft.getState().markClean();
      toast.success('Trip saved');
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (!dbMap) {
    return (
      <div className="h-dvh flex items-center justify-center">
        <Skeleton className="h-12 w-48" />
      </div>
    );
  }

  // Whether this is an "Update" (already saved) or fresh "Save".
  const isExisting = !!dbMap.title && !!dbMarkers && dbMarkers.length > 0;
  const saveLabel = isExisting ? 'Update trip' : 'Save trip';

  // ---------- DESKTOP / TABLET SIDEBAR ----------
  const sidebar = (
    <Sidebar
      title={title}
      footer={
        <RouteSummary
          map={{ ...dbMap, total_distance_meters: draft.total_distance_meters, total_duration_seconds: draft.total_duration_seconds }}
          markers={markers}
          legs={routeLegs}
        />
      }
    >
      <div className="p-3 sticky top-0 bg-white z-10 border-b border-gray-100">
        <PlacesSearch
          onSelect={(r) =>
            addMarkerAt(r.latLng, { label: r.label, address: r.address, placeId: r.placeId })
          }
        />
        <div className="mt-2 grid grid-cols-4 gap-1">
          {(Object.keys(TRAVEL_MODE_LABELS) as TravelMode[]).map((m) => (
            <button
              key={m}
              onClick={() => handleChangeMode(m)}
              title={TRAVEL_MODE_LABELS[m].label}
              aria-label={TRAVEL_MODE_LABELS[m].label}
              className={`h-9 rounded-full text-xs font-medium transition flex items-center justify-center ${
                travelMode === m
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <span className="text-sm">{TRAVEL_MODE_LABELS[m].icon}</span>
            </button>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between gap-2">
          <label className="inline-flex items-center gap-2 text-xs text-gray-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showLabels}
              onChange={(e) => setShowLabels(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
            />
            Show place names
          </label>
          <div className="flex items-center gap-2">
            {dirty && <Badge variant="warning">Unsaved</Badge>}
            <button
              onClick={() => setSaveOpen(true)}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-brand-600 hover:bg-brand-700 text-white text-xs font-medium transition"
            >
              <Save className="h-3.5 w-3.5" /> {saveLabel}
            </button>
          </div>
        </div>
      </div>
      <div className="p-3">
        <MarkerList
          markers={markers}
          selectedId={selectedMarkerId}
          onSelect={setSelectedMarker}
          onEdit={(mid) => {
            setEditingId(mid);
            setEditOpen(true);
          }}
          onDelete={handleDelete}
          onReorder={handleReorder}
        />
      </div>
    </Sidebar>
  );

  return (
    <div className="h-dvh w-full flex overflow-hidden">
      {isDesktop && sidebar}

      {!isDesktop && !isMobile && sidebarOpen && (
        <div className="absolute inset-0 z-20 flex">
          <div className="relative h-full">{sidebar}</div>
          <div className="flex-1 bg-black/30" onClick={toggleSidebar} />
        </div>
      )}

      <div className="flex-1 relative">
        <MapView
          mapId={dbMap.id}
          markers={markers}
          routeLegs={routeLegs}
          routeLoading={routeLoading}
          fitTrigger={fitCounter}
          onMapDoubleClick={isMobile ? undefined : (latLng) => addMarkerAt(latLng)}
          onMapLongPress={isMobile ? undefined : (latLng) => addMarkerAt(latLng)}
          onMarkerDragEnd={handleMarkerDragEnd}
          onEditMarker={(mid) => {
            setEditingId(mid);
            setEditOpen(true);
          }}
          onDeleteMarker={handleDelete}
        />

        {/* Mobile floating search */}
        {isMobile && (
          <div className="absolute top-0 inset-x-0 z-10 px-3 pt-safe pt-3">
            <PlacesSearch
              onSelect={(r) =>
                addMarkerAt(r.latLng, { label: r.label, address: r.address, placeId: r.placeId })
              }
            />
          </div>
        )}

        {!isDesktop && !isMobile && !sidebarOpen && (
          <Button
            size="icon"
            variant="outline"
            onClick={toggleSidebar}
            className="absolute top-4 left-4 z-10 bg-white shadow-lg"
            aria-label="Open sidebar"
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}
        {!isDesktop && !isMobile && sidebarOpen && (
          <Button
            size="icon"
            variant="outline"
            onClick={toggleSidebar}
            className="absolute top-4 right-4 z-30 bg-white shadow-lg"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </Button>
        )}

        {!isDesktop && (
          <div className="absolute right-3 z-10" style={{ bottom: isMobile ? 100 : 24 }}>
            <MapFABs
              travelMode={travelMode}
              onChangeMode={handleChangeMode}
              onAdd={isMobile ? undefined : () => window.scrollTo({ top: 0 })}
              onFit={handleFit}
              onLocate={isMobile ? undefined : handleLocate}
            />
          </div>
        )}

        {isMobile && selectedMarkerId && (() => {
          const m = markers.find((mm) => mm.id === selectedMarkerId);
          const idx = markers.findIndex((mm) => mm.id === selectedMarkerId);
          if (!m) return null;
          return (
            <MiniMarkerCard
              marker={m}
              index={idx}
              onClose={() => setSelectedMarker(null)}
              onEdit={() => {
                setEditingId(m.id);
                setEditOpen(true);
              }}
              onDelete={() => handleDelete(m.id)}
            />
          );
        })()}
      </div>

      {isMobile && (
        <BottomSheet
          header={
            <div className="py-2">
              <div className="flex items-center justify-between">
                <div className="text-xs text-gray-500 flex items-center gap-2">
                  {markers.length} stops
                  {dirty && <Badge variant="warning">Unsaved</Badge>}
                </div>
                <button
                  onClick={() => navigate('/dashboard')}
                  className="text-xs text-brand-600 font-medium"
                >
                  Back
                </button>
              </div>
              <div className="text-base font-semibold">
                {formatDistance(draft.total_distance_meters)} · {formatDuration(draft.total_duration_seconds)}
              </div>
            </div>
          }
        >
          <div className="mb-3 flex gap-1 flex-wrap">
            {(Object.keys(TRAVEL_MODE_LABELS) as TravelMode[]).map((m) => (
              <button
                key={m}
                onClick={() => handleChangeMode(m)}
                aria-label={TRAVEL_MODE_LABELS[m].label}
                className={`h-9 px-3 rounded-full text-xs font-medium transition ${
                  travelMode === m
                    ? 'bg-brand-600 text-white'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                {TRAVEL_MODE_LABELS[m].icon} {TRAVEL_MODE_LABELS[m].label}
              </button>
            ))}
          </div>
          <div className="mb-3 flex items-center justify-between">
            <label className="inline-flex items-center gap-2 text-xs text-gray-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showLabels}
                onChange={(e) => setShowLabels(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
              />
              Show place names
            </label>
            <button
              onClick={() => setSaveOpen(true)}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-brand-600 hover:bg-brand-700 text-white text-xs font-medium transition"
            >
              <Save className="h-3.5 w-3.5" /> {saveLabel}
            </button>
          </div>
          <MarkerList
            markers={markers}
            selectedId={selectedMarkerId}
            onSelect={setSelectedMarker}
            onEdit={(mid) => {
              setEditingId(mid);
              setEditOpen(true);
            }}
            onDelete={handleDelete}
            onReorder={handleReorder}
          />
        </BottomSheet>
      )}

      <MarkerEditDialog
        marker={editingMarker}
        index={editingIndex >= 0 ? editingIndex : 0}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSave={async (patch) => {
          if (!editingMarker) return;
          useTripDraft.getState().updateMarker(editingMarker.id, patch);
        }}
      />

      <SaveTripDialog
        map={{
          ...dbMap,
          title: draft.title || dbMap.title,
          description: draft.description ?? dbMap.description,
          category: draft.category ?? dbMap.category,
        }}
        open={saveOpen}
        onOpenChange={setSaveOpen}
        markerCount={markers.length}
        saving={saving}
        isExisting={isExisting}
        onSave={handleSave}
      />
    </div>
  );
}
