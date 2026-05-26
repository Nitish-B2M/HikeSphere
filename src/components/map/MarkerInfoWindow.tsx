import { InfoWindow } from '@vis.gl/react-google-maps';
import { MapPin, Pencil, Trash2, X } from 'lucide-react';
import type { Marker } from '@/types';
import { letterFor } from '@/lib/utils';

interface MarkerInfoWindowProps {
  marker: Marker;
  index: number;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function MarkerInfoWindow({
  marker,
  index,
  onClose,
  onEdit,
  onDelete,
}: MarkerInfoWindowProps) {
  return (
    <InfoWindow
      position={{ lat: marker.latitude, lng: marker.longitude }}
      onCloseClick={onClose}
      pixelOffset={[0, -40]}
      headerDisabled
    >
      <div className="w-[260px] relative">
        {/* Custom close button (Google's is disabled to keep our rounded design) */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-1.5 right-1.5 z-10 h-7 w-7 inline-flex items-center justify-center rounded-full bg-white/80 hover:bg-white text-gray-600 hover:text-gray-900 shadow-sm transition"
        >
          <X className="h-3.5 w-3.5" />
        </button>

        {/* Color header */}
        <div
          className="px-3 py-2.5 pr-10 rounded-t-md"
          style={{
            background: `linear-gradient(135deg, ${marker.color}1A 0%, ${marker.color}06 100%)`,
            borderBottom: `1px solid ${marker.color}20`,
          }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="h-8 w-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shadow-sm flex-shrink-0"
              style={{ background: marker.color }}
            >
              {letterFor(index)}
            </div>
            <h4 className="font-semibold text-sm text-gray-900 truncate leading-tight min-w-0 flex-1">
              {marker.label}
            </h4>
          </div>
        </div>

        {/* Body */}
        <div className="px-3 py-2 flex flex-col gap-1.5">
          {marker.address && (
            <div className="flex items-start gap-1.5 text-xs text-gray-600">
              <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0 text-gray-400" />
              <span className="line-clamp-2 break-words min-w-0">{marker.address}</span>
            </div>
          )}
          {marker.notes && (
            <p className="text-xs text-gray-700 whitespace-pre-wrap line-clamp-3 break-words">
              {marker.notes}
            </p>
          )}
        </div>

        {/* Action bar */}
        <div className="px-2 pb-2 pt-1 flex gap-1.5">
          <button
            onClick={onEdit}
            className="flex-1 h-8 inline-flex items-center justify-center gap-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-xs font-medium text-gray-900 transition"
          >
            <Pencil className="h-3 w-3" /> Edit
          </button>
          <button
            onClick={onDelete}
            aria-label="Delete marker"
            className="h-8 w-8 inline-flex items-center justify-center rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </InfoWindow>
  );
}
