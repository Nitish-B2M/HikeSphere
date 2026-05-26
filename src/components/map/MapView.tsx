import { useCallback, useEffect, useRef } from 'react';
import { useUIStore } from '@/stores/uiStore';
import { Map, useMap } from '@vis.gl/react-google-maps';
import { DEFAULT_CENTER, DEFAULT_ZOOM, GOOGLE_MAPS_MAP_ID } from '@/constants/config';
import type { LatLng, Marker, RouteLeg } from '@/types';
import { MarkerPin } from './MarkerPin';
import { MarkerInfoWindow } from './MarkerInfoWindow';
import { RoutePolyline } from './RoutePolyline';
import { useMapStore } from '@/stores/mapStore';

interface MapViewProps {
  mapId: string; // for one-shot initial fit tracking
  markers: Marker[];
  routeLegs: RouteLeg[];
  routeLoading?: boolean;
  fitTrigger?: number; // increment to manually refit to all markers
  onMapDoubleClick?: (latLng: LatLng) => void;
  onMapLongPress?: (latLng: LatLng) => void;
  onMarkerDragEnd?: (markerId: string, latLng: LatLng) => void;
  onEditMarker?: (markerId: string) => void;
  onDeleteMarker?: (markerId: string) => void;
}

export function MapView({
  mapId,
  markers,
  routeLegs,
  routeLoading,
  fitTrigger,
  onMapDoubleClick,
  onMapLongPress,
  onMarkerDragEnd,
  onEditMarker,
  onDeleteMarker,
}: MapViewProps) {
  const { selectedMarkerId, setSelectedMarker } = useMapStore();
  const selectedIndex = markers.findIndex((m) => m.id === selectedMarkerId);
  const selected = selectedIndex >= 0 ? markers[selectedIndex] : null;
  const showLabels = useUIStore((s) => s.showLabels);

  return (
    <div className="w-full h-full relative">
      <Map
        mapId={GOOGLE_MAPS_MAP_ID}
        defaultCenter={DEFAULT_CENTER}
        defaultZoom={DEFAULT_ZOOM}
        gestureHandling="greedy"
        disableDefaultUI={false}
        mapTypeControl={false}
        streetViewControl={false}
        fullscreenControl={false}
        clickableIcons={false}
        disableDoubleClickZoom
        className="w-full h-full"
      >
        <MapInteractions onDoubleClick={onMapDoubleClick} onLongPress={onMapLongPress} />
        <FitBounds mapId={mapId} markers={markers} fitTrigger={fitTrigger} />
        {markers.map((m, i) => (
          <MarkerPin
            key={`${m.id}-${showLabels ? 'L' : 'NL'}`}
            marker={m}
            index={i}
            draggable
            selected={m.id === selectedMarkerId}
            onClick={() => setSelectedMarker(m.id)}
            onDragEnd={(lat, lng) => onMarkerDragEnd?.(m.id, { lat, lng })}
          />
        ))}
        {routeLegs.map((leg) => {
          if (!leg.polyline_encoded) return null;
          const fromMarker = markers.find((m) => m.id === leg.from_marker_id);
          return (
            <RoutePolyline
              key={leg.id}
              encoded={leg.polyline_encoded}
              color={fromMarker?.color}
              loading={routeLoading}
            />
          );
        })}
        {selected && (
          <MarkerInfoWindow
            marker={selected}
            index={selectedIndex}
            onClose={() => setSelectedMarker(null)}
            onEdit={() => onEditMarker?.(selected.id)}
            onDelete={() => onDeleteMarker?.(selected.id)}
          />
        )}
      </Map>
    </div>
  );
}

function MapInteractions({
  onDoubleClick,
  onLongPress,
}: {
  onDoubleClick?: (latLng: LatLng) => void;
  onLongPress?: (latLng: LatLng) => void;
}) {
  const map = useMap();
  const pressTimer = useRef<number | null>(null);
  const longFired = useRef(false);

  useEffect(() => {
    if (!map) return;

    const cancelPress = () => {
      if (pressTimer.current) {
        window.clearTimeout(pressTimer.current);
        pressTimer.current = null;
      }
    };

    // Double-click (or double-tap) drops a marker.
    const dblClickListener = map.addListener('dblclick', (e: google.maps.MapMouseEvent) => {
      if (longFired.current) {
        longFired.current = false;
        return;
      }
      if (!e.latLng) return;
      onDoubleClick?.({ lat: e.latLng.lat(), lng: e.latLng.lng() });
    });

    // Long-press (single finger held for 500ms) drops a marker.
    const downListener = map.addListener('mousedown', (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return;
      const pos = { lat: e.latLng.lat(), lng: e.latLng.lng() };
      pressTimer.current = window.setTimeout(() => {
        longFired.current = true;
        onLongPress?.(pos);
      }, 500);
    });
    const upListener = map.addListener('mouseup', cancelPress);
    const dragListener = map.addListener('drag', cancelPress);
    const zoomListener = map.addListener('zoom_changed', cancelPress);

    // Native touch handling: cancel long-press the moment a 2nd finger lands
    // (pinch-to-zoom), or after any meaningful movement, so we never drop a
    // marker during a pinch / pan gesture.
    const div = map.getDiv();
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 1) cancelPress();
    };
    const onTouchMove = (e: TouchEvent) => {
      // Any second finger or any movement aborts the press.
      if (e.touches.length > 1) cancelPress();
    };
    const onTouchEnd = () => cancelPress();
    div.addEventListener('touchstart', onTouchStart, { passive: true });
    div.addEventListener('touchmove', onTouchMove, { passive: true });
    div.addEventListener('touchend', onTouchEnd, { passive: true });
    div.addEventListener('touchcancel', onTouchEnd, { passive: true });

    return () => {
      dblClickListener.remove();
      downListener.remove();
      upListener.remove();
      dragListener.remove();
      zoomListener.remove();
      div.removeEventListener('touchstart', onTouchStart);
      div.removeEventListener('touchmove', onTouchMove);
      div.removeEventListener('touchend', onTouchEnd);
      div.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [map, onDoubleClick, onLongPress]);

  return null;
}

// Module-level guard: tracks which map IDs have had their initial fit run.
// Survives component remounts so we NEVER auto-refit after the first time,
// no matter how many times FitBounds re-mounts or React re-renders.
const fittedMapIds = new Set<string>();

function FitBounds({
  markers,
  mapId,
  fitTrigger,
}: {
  markers: Marker[];
  mapId: string;
  fitTrigger?: number;
}) {
  const map = useMap();
  const lastTrigger = useRef<number | undefined>(undefined);

  const fitNow = useCallback(() => {
    if (!map || markers.length === 0) return;
    if (markers.length === 1) {
      map.panTo({ lat: markers[0].latitude, lng: markers[0].longitude });
      map.setZoom(14);
      return;
    }
    const bounds = new google.maps.LatLngBounds();
    markers.forEach((m) => bounds.extend({ lat: m.latitude, lng: m.longitude }));
    map.fitBounds(bounds, 80);
  }, [map, markers]);

  // Initial fit — runs exactly ONCE per map id, ever, across remounts.
  useEffect(() => {
    if (!map || markers.length === 0) return;
    if (fittedMapIds.has(mapId)) return;
    fittedMapIds.add(mapId);
    fitNow();
  }, [map, mapId, markers, fitNow]);

  // Manual refit when fitTrigger increments (FAB button).
  useEffect(() => {
    if (fitTrigger === undefined) return;
    if (lastTrigger.current === undefined) {
      lastTrigger.current = fitTrigger;
      return;
    }
    if (fitTrigger === lastTrigger.current) return;
    lastTrigger.current = fitTrigger;
    fitNow();
  }, [fitTrigger, fitNow]);

  return null;
}
