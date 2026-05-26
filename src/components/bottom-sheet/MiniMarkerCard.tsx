import { MapPin, Pencil, Trash2, X } from 'lucide-react';
import type { Marker } from '@/types';
import { letterFor } from '@/lib/utils';

interface MiniMarkerCardProps {
  marker: Marker;
  index: number;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function MiniMarkerCard({ marker, index, onClose, onEdit, onDelete }: MiniMarkerCardProps) {
  return (
    <div className="fixed inset-x-3 bottom-24 z-40 bg-white rounded-2xl shadow-2xl overflow-hidden pb-safe md:hidden border border-gray-100">
      {/* Header with color accent */}
      <div
        className="relative px-4 pt-3 pb-3"
        style={{
          background: `linear-gradient(135deg, ${marker.color}14 0%, ${marker.color}04 100%)`,
          borderBottom: `1px solid ${marker.color}1F`,
        }}
      >
        <div className="flex items-start gap-3">
          <div
            className="h-10 w-10 rounded-xl flex items-center justify-center text-white text-sm font-bold shadow-md flex-shrink-0"
            style={{ background: marker.color }}
          >
            {letterFor(index)}
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <div className="font-semibold text-base text-gray-900 truncate leading-tight">
              {marker.label}
            </div>
            {marker.address && (
              <div className="mt-1 flex items-start gap-1 text-xs text-gray-600">
                <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0 text-gray-400" />
                <span className="line-clamp-2">{marker.address}</span>
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="h-8 w-8 inline-flex items-center justify-center rounded-full text-gray-500 hover:bg-white/70 hover:text-gray-900 transition flex-shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {marker.notes && (
        <div className="px-4 pt-3 pb-1 text-sm text-gray-700 whitespace-pre-wrap line-clamp-3">
          {marker.notes}
        </div>
      )}

      {/* Action bar */}
      <div className="p-3 flex gap-2">
        <button
          onClick={onEdit}
          className="flex-1 h-10 inline-flex items-center justify-center gap-2 rounded-xl bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-sm font-medium text-gray-900 transition"
        >
          <Pencil className="h-3.5 w-3.5" /> Edit
        </button>
        <button
          onClick={onDelete}
          aria-label="Delete marker"
          className="h-10 w-10 inline-flex items-center justify-center rounded-xl bg-red-50 hover:bg-red-100 text-red-600 transition"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
