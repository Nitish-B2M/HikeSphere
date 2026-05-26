import { useEffect, useState } from 'react';
import {
  Briefcase,
  Footprints,
  MapPin,
  MountainSnow,
  Package,
  Pencil,
  Save,
  Sparkles,
  X,
} from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import type { MapCategory, MapRecord } from '@/types';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

const CATEGORIES: { value: MapCategory; label: string; icon: React.ReactNode; color: string }[] = [
  { value: 'trip', label: 'Trip', icon: <Sparkles className="h-4 w-4" />, color: '#4F46E5' },
  { value: 'trekking', label: 'Trekking', icon: <MountainSnow className="h-4 w-4" />, color: '#10B981' },
  { value: 'sightseeing', label: 'Sightseeing', icon: <MapPin className="h-4 w-4" />, color: '#F59E0B' },
  { value: 'commute', label: 'Commute', icon: <Footprints className="h-4 w-4" />, color: '#06B6D4' },
  { value: 'delivery', label: 'Delivery', icon: <Package className="h-4 w-4" />, color: '#EC4899' },
  { value: 'other', label: 'Other', icon: <Briefcase className="h-4 w-4" />, color: '#6B7280' },
];

interface SaveTripDialogProps {
  map: MapRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (patch: { title: string; description: string | null; category: MapCategory }) => Promise<void>;
  saving?: boolean;
  markerCount: number;
  isExisting?: boolean;
}

export function SaveTripDialog({
  map,
  open,
  onOpenChange,
  onSave,
  saving,
  markerCount,
  isExisting,
}: SaveTripDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<MapCategory>('trip');

  useEffect(() => {
    if (map && open) {
      setTitle(map.title);
      setDescription(map.description ?? '');
      setCategory(map.category ?? 'other');
    }
  }, [map, open]);

  if (!map) return null;
  const activeCategory = CATEGORIES.find((c) => c.value === category) ?? CATEGORIES[0];

  async function handleSave() {
    await onSave({
      title: title.trim() || 'Untitled trip',
      description: description.trim() || null,
      category,
    });
    onOpenChange(false);
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" />
        <Dialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2',
            'w-[calc(100vw-2rem)] max-w-md max-h-[90vh] overflow-hidden',
            'bg-white rounded-2xl shadow-2xl flex flex-col',
            'focus:outline-none'
          )}
        >
          {/* Header */}
          <div
            className="relative px-5 pt-5 pb-4"
            style={{
              background: `linear-gradient(135deg, ${activeCategory.color}1A 0%, ${activeCategory.color}06 100%)`,
              borderBottom: `1px solid ${activeCategory.color}20`,
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="h-11 w-11 rounded-2xl flex items-center justify-center text-white shadow-md flex-shrink-0"
                style={{ background: activeCategory.color }}
              >
                <Save className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <Dialog.Title className="text-lg font-semibold text-gray-900">
                  {isExisting ? 'Update trip' : 'Save trip'}
                </Dialog.Title>
                <p className="text-xs text-gray-500 mt-0.5">
                  {markerCount} {markerCount === 1 ? 'stop' : 'stops'} in order
                </p>
              </div>
            </div>
            <Dialog.Close
              className="absolute top-3 right-3 h-9 w-9 inline-flex items-center justify-center rounded-full text-gray-500 hover:bg-white/60 hover:text-gray-900 transition"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>

          {/* Body */}
          <div className="px-5 py-5 flex flex-col gap-5 overflow-auto scrollbar-thin">
            {/* Title */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
                <Pencil className="h-3 w-3" /> Title
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Kathmandu weekend"
                className="w-full h-11 rounded-xl border border-gray-200 bg-gray-50 px-4 text-base placeholder:text-gray-400 focus:bg-white focus:border-gray-300 focus:ring-2 focus:ring-brand-500/20 focus:outline-none transition"
              />
            </div>

            {/* Description */}
            <div>
              <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2 block">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="Optional notes about this trip"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm placeholder:text-gray-400 focus:bg-white focus:border-gray-300 focus:ring-2 focus:ring-brand-500/20 focus:outline-none transition resize-none"
              />
            </div>

            {/* Category */}
            <div>
              <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2 block">
                Category
              </label>
              <div className="grid grid-cols-3 gap-2">
                {CATEGORIES.map((c) => {
                  const active = c.value === category;
                  return (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setCategory(c.value)}
                      className={cn(
                        'flex flex-col items-center gap-1.5 rounded-xl border-2 py-3 px-2 transition',
                        active ? 'bg-white shadow-sm' : 'border-transparent bg-gray-50 hover:bg-gray-100'
                      )}
                      style={active ? { borderColor: c.color, color: c.color } : {}}
                    >
                      <div
                        className={cn(
                          'h-8 w-8 rounded-lg flex items-center justify-center',
                          active ? 'text-white' : 'text-gray-500'
                        )}
                        style={active ? { background: c.color } : { background: '#fff' }}
                      >
                        {c.icon}
                      </div>
                      <span
                        className={cn(
                          'text-xs font-medium',
                          active ? '' : 'text-gray-700'
                        )}
                      >
                        {c.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSave} loading={saving}>
              <Save className="h-4 w-4" /> {isExisting ? 'Update trip' : 'Save trip'}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export { CATEGORIES as TRIP_CATEGORIES };
