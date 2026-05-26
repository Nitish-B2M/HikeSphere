import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Pencil, Trash2 } from 'lucide-react';
import type { Marker } from '@/types';
import { letterFor } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface MarkerCardProps {
  marker: Marker;
  index: number;
  selected?: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function MarkerCard({ marker, index, selected, onSelect, onEdit, onDelete }: MarkerCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: marker.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group flex items-center gap-2 rounded-lg border bg-white p-2 transition-colors',
        selected ? 'border-brand-500 bg-brand-50' : 'border-gray-200 hover:bg-gray-50'
      )}
    >
      <button
        type="button"
        aria-label="Drag to reorder"
        className="cursor-grab touch-none p-1 text-gray-400 hover:text-gray-600"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={onSelect}
        className="flex-1 flex items-center gap-3 text-left min-w-0"
      >
        <div
          className="h-7 w-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
          style={{ background: marker.color }}
        >
          {letterFor(index)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-medium text-sm truncate">{marker.label}</div>
          {marker.address && <div className="text-xs text-gray-500 truncate">{marker.address}</div>}
        </div>
      </button>
      <div className="flex items-center opacity-100 md:opacity-0 group-hover:opacity-100 transition">
        <button
          type="button"
          onClick={onEdit}
          aria-label="Edit marker"
          className="p-2 text-gray-500 hover:text-gray-900 rounded"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          aria-label="Delete marker"
          className="p-2 text-gray-500 hover:text-red-600 rounded"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
