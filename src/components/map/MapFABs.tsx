import { Crosshair, LocateFixed, Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { TRAVEL_MODE_LABELS } from '@/constants/config';
import type { TravelMode } from '@/types';
import { cn } from '@/lib/utils';

interface MapFABsProps {
  travelMode: TravelMode;
  onChangeMode: (mode: TravelMode) => void;
  onAdd: () => void;
  onFit: () => void;
  onLocate: () => void;
  className?: string;
}

export function MapFABs({ travelMode, onChangeMode, onAdd, onFit, onLocate, className }: MapFABsProps) {
  return (
    <div className={cn('flex flex-col items-end gap-2', className)}>
      <div className="flex gap-1 bg-white rounded-full shadow-lg p-1">
        {(Object.keys(TRAVEL_MODE_LABELS) as TravelMode[]).map((m) => (
          <button
            key={m}
            onClick={() => onChangeMode(m)}
            aria-label={TRAVEL_MODE_LABELS[m].label}
            className={cn(
              'h-9 w-9 rounded-full text-base flex items-center justify-center transition-colors',
              travelMode === m ? 'bg-brand-600 text-white' : 'text-gray-700 hover:bg-gray-100'
            )}
          >
            {TRAVEL_MODE_LABELS[m].icon}
          </button>
        ))}
      </div>
      <Button
        size="icon"
        variant="outline"
        onClick={onLocate}
        aria-label="Use my location"
        className="bg-white shadow-lg rounded-full"
      >
        <LocateFixed className="h-5 w-5" />
      </Button>
      <Button
        size="icon"
        variant="outline"
        onClick={onFit}
        aria-label="Fit all markers"
        className="bg-white shadow-lg rounded-full"
      >
        <Crosshair className="h-5 w-5" />
      </Button>
      <Button
        size="icon"
        variant="primary"
        onClick={onAdd}
        aria-label="Add marker"
        className="shadow-lg rounded-full h-14 w-14"
      >
        <Plus className="h-6 w-6" />
      </Button>
    </div>
  );
}
