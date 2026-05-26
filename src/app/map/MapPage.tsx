import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Menu, Save, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/hooks/useAuth';
import { useMap, useUpdateMap } from '@/hooks/useMaps';
import {
  useCreateMarker,
  useDeleteMarker,
  useMarkers,
  useReorderMarkers,
  useUpdateMarker,
} from '@/hooks/useMarkers';
import { useRecomputeRoute, useRouteLegs } from '@/hooks/useRoute';
import { useIsDesktop, useIsMobile } from '@/hooks/useMediaQuery';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useMapStore } from '@/stores/mapStore';
import { useUIStore } from '@/stores/uiStore';
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
import { reverseGeocodeMapbox } from '@/lib/api/mapbox';
import { formatDistance, formatDuration } from '@/lib/utils';
import { TRAVEL_MODE_LABELS } from '@/constants/config';
import type { LatLng, MapCategory, Marker, TravelMode } from '@/types';

export default function MapPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isDesktop = useIsDesktop();
  const isMobile = useIsMobile();

  const { data: map } = useMap(id);
  const { data: markers = [] } = useMarkers(id);
  const { data: routeLegs = [] } = useRouteLegs(id);

  const createMarker = useCreateMarker(id);
  const updateMarker = useUpdateMarker(id);
  const deleteMarker = useDeleteMarker(id);
  const reorderMarkers = useReorderMarkers(id);
  const updateMap = useUpdateMap();
  const recomputeRoute = useRecomputeRoute(id);

  const { sidebarOpen, toggleSidebar, showLabels, setShowLabels } = useUIStore();
  const { selectedMarkerId, setSelectedMarker } = useMapStore();
  const { getCurrentPosition } = useGeolocation();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);

  const editingMarker = useMemo(() => markers.find((m) => m.id === editingId) ?? null, [markers, editingId]);
  const editingIndex = useMemo(() => markers.findIndex((m) => m.id === editingId), [markers, editingId]);

  // ---- marker actions ----
  const nextOrder = markers.length;

  const addMarkerAt = useCallback(
    async (
      latLng: LatLng,
      meta?: { label?: string; address?: string | null; placeId?: string | null }
    ) => {
      if (!id || !user) return;
      let address = meta?.address ?? null;
      let placeId = meta?.placeId ?? null;
      if (!address) {
        const r = await reverseGeocodeMapbox(latLng);
        address = r.address;
        placeId = r.placeId;
      }
      const label = meta?.label ?? address ?? `Marker ${markers.length + 1}`;
      await createMarker.mutateAsync({
        map_id: id,
        user_id: user.id,
        label,
        latitude: latLng.lat,
        longitude: latLng.lng,
        sequence_order: nextOrder,
        address,
        place_id: placeId,
      });
    },
    [id, user, markers.length, nextOrder, createMarker]
  );

  const handleMarkerDragEnd = useCallback(
    async (markerId: string, latLng: LatLng) => {
      const r = await reverseGeocodeMapbox(latLng);
      const address = r.address;
      const placeId = r.placeId;
      await updateMarker.mutateAsync({
        id: markerId,
        patch: { latitude: latLng.lat, longitude: latLng.lng, address, place_id: placeId },
      });
    },
    [updateMarker]
  );

  const handleDelete = useCallback(
    async (markerId: string) => {
      await deleteMarker.mutateAsync(markerId);
      if (selectedMarkerId === markerId) setSelectedMarker(null);
    },
    [deleteMarker, selectedMarkerId, setSelectedMarker]
  );

  const handleReorder = useCallback(
    async (newOrder: Marker[]) => {
      const updates = newOrder.map((m, i) => ({ id: m.id, sequence_order: i }));
      await reorderMarkers.mutateAsync(updates);
    },
    [reorderMarkers]
  );

  // ---- route recompute on changes ----
  useEffect(() => {
    if (!map || markers.length < 2) return;
    // Debounce route recompute when markers/mode change.
    const t = setTimeout(() => {
      recomputeRoute.mutate({ markers, mode: map.travel_mode });
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    map?.id,
    map?.travel_mode,
    markers.map((m) => `${m.id}:${m.sequence_order}:${m.latitude}:${m.longitude}`).join('|'),
  ]);

  const handleChangeMode = (mode: TravelMode) => {
    if (!map) return;
    updateMap.mutate({ id: map.id, patch: { travel_mode: mode } });
  };

  const handleLocate = async () => {
    try {
      const pos = await getCurrentPosition();
      await addMarkerAt(pos, { label: 'My location' });
    } catch (e: any) {
      toast.error(e.message ?? 'Could not get location');
    }
  };

  const [fitCounter, setFitCounter] = useState(0);
  const handleFit = () => setFitCounter((c) => c + 1);

  if (!map) {
    return (
      <div className="h-dvh flex items-center justify-center">
        <Skeleton className="h-12 w-48" />
      </div>
    );
  }

  // ---------- DESKTOP / TABLET LAYOUT ----------
  const sidebar = (
    <Sidebar
      title={map.title}
      footer={<RouteSummary map={map} markers={markers} legs={routeLegs} />}
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
              className={`h-9 rounded-full text-xs font-medium transition flex flex-col items-center justify-center gap-0 leading-tight ${
                map.travel_mode === m
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <span className="text-sm">{TRAVEL_MODE_LABELS[m].icon}</span>
            </button>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between">
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
            <Save className="h-3.5 w-3.5" /> Save trip
          </button>
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
      {/* Desktop sidebar */}
      {isDesktop && sidebar}

      {/* Tablet sliding sidebar */}
      {!isDesktop && !isMobile && sidebarOpen && (
        <div className="absolute inset-0 z-20 flex">
          <div className="relative h-full">{sidebar}</div>
          <div className="flex-1 bg-black/30" onClick={toggleSidebar} />
        </div>
      )}

      {/* Map */}
      <div className="flex-1 relative">
        <MapView
          markers={markers}
          routeLegs={routeLegs}
          routeLoading={recomputeRoute.isPending}
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

        {/* Tablet toggle button */}
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

        {/* FABs - hide on desktop where sidebar provides controls */}
        {!isDesktop && (
          <div className="absolute right-3 z-10" style={{ bottom: isMobile ? 100 : 24 }}>
            <MapFABs
              travelMode={map.travel_mode}
              onChangeMode={handleChangeMode}
              onAdd={() => {
                // focus the search input on mobile by scrolling top
                window.scrollTo({ top: 0 });
              }}
              onFit={handleFit}
              onLocate={handleLocate}
            />
          </div>
        )}

        {/* Mobile: mini info card */}
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

      {/* Mobile bottom sheet */}
      {isMobile && (
        <BottomSheet
          header={
            <div className="py-2">
              <div className="flex items-center justify-between">
                <div className="text-xs text-gray-500">{markers.length} stops</div>
                <button
                  onClick={() => navigate('/dashboard')}
                  className="text-xs text-brand-600 font-medium"
                >
                  Back
                </button>
              </div>
              <div className="text-base font-semibold">
                {formatDistance(map.total_distance_meters)} · {formatDuration(map.total_duration_seconds)}
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
                  map.travel_mode === m
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
              <Save className="h-3.5 w-3.5" /> Save trip
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
        saving={updateMarker.isPending}
        onSave={async (patch) => {
          if (!editingMarker) return;
          await updateMarker.mutateAsync({ id: editingMarker.id, patch });
        }}
      />

      <SaveTripDialog
        map={map}
        open={saveOpen}
        onOpenChange={setSaveOpen}
        markerCount={markers.length}
        saving={updateMap.isPending}
        onSave={async (patch: { title: string; description: string | null; category: MapCategory }) => {
          await updateMap.mutateAsync({ id: map.id, patch });
          toast.success('Trip saved');
        }}
      />
    </div>
  );
}
