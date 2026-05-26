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
  markers: Marker[];
  routeLegs: RouteLeg[];
  routeLoading?: boolean;
  onMapDoubleClick?: (latLng: LatLng) => void;
  onMapLongPress?: (latLng: LatLng) => void;
  onMarkerDragEnd?: (markerId: string, latLng: LatLng) => void;
  onEditMarker?: (markerId: string) => void;
  onDeleteMarker?: (markerId: string) => void;
}

export function MapView({
  markers,
  routeLegs,
  routeLoading,
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
        <FitBounds markers={markers} />
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
    const clickListener = map.addListener('dblclick', (e: google.maps.MapMouseEvent) => {
      if (longFired.current) {
        longFired.current = false;
        return;
      }
      if (!e.latLng) return;
      onDoubleClick?.({ lat: e.latLng.lat(), lng: e.latLng.lng() });
    });
    const downListener = map.addListener('mousedown', (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return;
      const pos = { lat: e.latLng.lat(), lng: e.latLng.lng() };
      pressTimer.current = window.setTimeout(() => {
        longFired.current = true;
        onLongPress?.(pos);
      }, 500);
    });
    const upListener = map.addListener('mouseup', () => {
      if (pressTimer.current) {
        window.clearTimeout(pressTimer.current);
        pressTimer.current = null;
      }
    });
    const moveListener = map.addListener('drag', () => {
      if (pressTimer.current) {
        window.clearTimeout(pressTimer.current);
        pressTimer.current = null;
      }
    });
    return () => {
      clickListener.remove();
      downListener.remove();
      upListener.remove();
      moveListener.remove();
    };
  }, [map, onClick, onLongPress]);

  return null;
}

function FitBounds({ markers }: { markers: Marker[] }) {
  const map = useMap();
  const prevCount = useRef(0);

  const fit = useCallback(() => {
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

  useEffect(() => {
    if (!map || markers.length === 0) {
      prevCount.current = markers.length;
      return;
    }
    // Re-fit on initial load and whenever a new marker is added.
    if (prevCount.current === 0 || markers.length > prevCount.current) {
      fit();
    }
    prevCount.current = markers.length;
  }, [map, markers, fit]);

  return null;
}

export function useFitBounds() {
  const map = useMap();
  return useCallback(
    (markers: Marker[]) => {
      if (!map || markers.length === 0) return;
      if (markers.length === 1) {
        map.panTo({ lat: markers[0].latitude, lng: markers[0].longitude });
        return;
      }
      const bounds = new google.maps.LatLngBounds();
      markers.forEach((m) => bounds.extend({ lat: m.latitude, lng: m.longitude }));
      map.fitBounds(bounds, 80);
    },
    [map]
  );
}
