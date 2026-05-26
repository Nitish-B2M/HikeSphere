import { AdvancedMarker } from '@vis.gl/react-google-maps';
import type { Marker } from '@/types';
import { letterFor } from '@/lib/utils';
import { useUIStore } from '@/stores/uiStore';

interface MarkerPinProps {
  marker: Marker;
  index: number;
  draggable?: boolean;
  selected?: boolean;
  onClick?: () => void;
  onDragEnd?: (lat: number, lng: number) => void;
}

export function MarkerPin({ marker, index, draggable, selected, onClick, onDragEnd }: MarkerPinProps) {
  const showLabels = useUIStore((s) => s.showLabels);
  const scale = selected ? 1.15 : 1;

  return (
    <AdvancedMarker
      position={{ lat: marker.latitude, lng: marker.longitude }}
      draggable={draggable}
      onClick={onClick}
      onDragEnd={(e) => {
        if (!e.latLng) return;
        onDragEnd?.(e.latLng.lat(), e.latLng.lng());
      }}
      title={marker.label}
    >
      <div
        className="marker-pin-wrap"
        style={{ transform: `scale(${scale})`, transition: 'transform 150ms' }}
      >
        <svg
          width="32"
          height="42"
          viewBox="0 0 32 42"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ display: 'block', filter: 'drop-shadow(0 3px 4px rgba(0,0,0,0.25))' }}
        >
          <path
            d="M16 0C7.163 0 0 7.163 0 16c0 11 16 26 16 26s16-15 16-26C32 7.163 24.837 0 16 0z"
            fill={marker.color}
            stroke={selected ? '#111827' : 'white'}
            strokeWidth={selected ? 2 : 1.5}
          />
          <circle cx="16" cy="16" r="10" fill="white" fillOpacity="0.15" />
          <text
            x="16"
            y="20"
            textAnchor="middle"
            fontSize="13"
            fontWeight="700"
            fill="white"
            fontFamily="Inter, system-ui, sans-serif"
          >
            {letterFor(index)}
          </text>
        </svg>
        {showLabels && <div className="marker-label">{marker.label}</div>}
      </div>
    </AdvancedMarker>
  );
}
