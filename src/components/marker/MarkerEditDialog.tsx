import { useEffect, useState } from 'react';
import { MapPin, Pencil, StickyNote, X } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import type { Marker } from '@/types';
import { Button } from '@/components/ui/Button';
import { ColorPicker } from '@/components/ui/ColorPicker';
import { cn, letterFor } from '@/lib/utils';

interface MarkerEditDialogProps {
  marker: Marker | null;
  index?: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (patch: Partial<Marker>) => void | Promise<void>;
  saving?: boolean;
}

export function MarkerEditDialog({
  marker,
  index = 0,
  open,
  onOpenChange,
  onSave,
  saving,
}: MarkerEditDialogProps) {
  const [label, setLabel] = useState('');
  const [notes, setNotes] = useState('');
  const [color, setColor] = useState('#4F46E5');

  useEffect(() => {
    if (marker) {
      setLabel(marker.label);
      setNotes(marker.notes ?? '');
      setColor(marker.color);
    }
  }, [marker]);

  if (!marker) return null;

  const handleSave = async () => {
    await onSave({ label: label.trim() || marker.label, notes: notes || null, color });
    onOpenChange(false);
  };

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
          {/* Color-accented header */}
          <div
            className="relative px-5 pt-5 pb-4"
            style={{
              background: `linear-gradient(135deg, ${color}1A 0%, ${color}08 100%)`,
              borderBottom: `1px solid ${color}20`,
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="h-12 w-12 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-md flex-shrink-0"
                style={{ background: color }}
              >
                {letterFor(index)}
              </div>
              <div className="min-w-0 flex-1">
                <Dialog.Title className="text-lg font-semibold text-gray-900">
                  Edit marker
                </Dialog.Title>
                <p className="text-xs text-gray-500 mt-0.5">Customize label, notes, and color</p>
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
            {/* Label */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
                <Pencil className="h-3 w-3" /> Label
              </label>
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Marker name"
                className="w-full h-11 rounded-xl border border-gray-200 bg-gray-50 px-4 text-base placeholder:text-gray-400 focus:bg-white focus:border-gray-300 focus:ring-2 focus:ring-brand-500/20 focus:outline-none transition"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
                <StickyNote className="h-3 w-3" /> Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Add a description, reminder, or anything you want to remember…"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm placeholder:text-gray-400 focus:bg-white focus:border-gray-300 focus:ring-2 focus:ring-brand-500/20 focus:outline-none transition resize-none"
              />
            </div>

            {/* Color */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
                <span
                  className="h-3 w-3 rounded-full border border-white shadow"
                  style={{ background: color }}
                />
                Pin color
              </label>
              <ColorPicker value={color} onChange={setColor} />
            </div>

            {/* Address */}
            {marker.address && (
              <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3">
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase tracking-wide font-semibold text-gray-500 mb-0.5">
                      Address
                    </div>
                    <div className="text-xs text-gray-700 leading-relaxed">{marker.address}</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSave} loading={saving}>
              Save changes
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
