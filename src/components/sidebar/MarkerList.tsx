import {
  DndContext,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { MapPin } from 'lucide-react';
import type { Marker } from '@/types';
import { MarkerCard } from './MarkerCard';
import { EmptyState } from '@/components/ui/EmptyState';

interface MarkerListProps {
  markers: Marker[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onReorder: (newOrder: Marker[]) => void;
}

export function MarkerList({ markers, selectedId, onSelect, onEdit, onDelete, onReorder }: MarkerListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = markers.findIndex((m) => m.id === active.id);
    const newIndex = markers.findIndex((m) => m.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(markers, oldIndex, newIndex);
    onReorder(next);
  };

  if (markers.length === 0) {
    return (
      <EmptyState
        icon={<MapPin className="h-8 w-8" />}
        title="No markers yet"
        description="Search for a place or tap-and-hold on the map to add your first marker."
      />
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={markers.map((m) => m.id)} strategy={verticalListSortingStrategy}>
        <ul className="flex flex-col gap-2">
          {markers.map((m, i) => (
            <li key={m.id}>
              <MarkerCard
                marker={m}
                index={i}
                selected={selectedId === m.id}
                onSelect={() => onSelect(m.id)}
                onEdit={() => onEdit(m.id)}
                onDelete={() => onDelete(m.id)}
              />
            </li>
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}
