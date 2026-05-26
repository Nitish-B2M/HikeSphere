import { Bookmark } from 'lucide-react';
import type { SavedPlace } from '@/types';
import { EmptyState } from '@/components/ui/EmptyState';

interface SavedPlacesPickerProps {
  places: SavedPlace[];
  onSelect: (place: SavedPlace) => void;
}

export function SavedPlacesPicker({ places, onSelect }: SavedPlacesPickerProps) {
  if (places.length === 0) {
    return (
      <EmptyState
        icon={<Bookmark className="h-8 w-8" />}
        title="No saved places yet"
        description="Save your home, work, or favorites for one-tap adds."
      />
    );
  }
  return (
    <ul className="divide-y divide-gray-100">
      {places.map((p) => (
        <li key={p.id}>
          <button
            type="button"
            onClick={() => onSelect(p)}
            className="w-full flex items-center gap-3 py-3 px-1 text-left hover:bg-gray-50 rounded"
          >
            <Bookmark className="h-4 w-4 text-brand-600 flex-shrink-0" />
            <div className="min-w-0">
              <div className="font-medium text-sm truncate">{p.label}</div>
              {p.address && <div className="text-xs text-gray-500 truncate">{p.address}</div>}
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}
