import { Check } from 'lucide-react';
import { MARKER_COLORS } from '@/constants/config';
import { cn } from '@/lib/utils';

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  className?: string;
}

export function ColorPicker({ value, onChange, className }: ColorPickerProps) {
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {MARKER_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          aria-label={`Color ${c}`}
          onClick={() => onChange(c)}
          className="h-8 w-8 rounded-full ring-offset-2 transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          style={{ background: c }}
        >
          {value.toLowerCase() === c.toLowerCase() && (
            <Check className="h-4 w-4 text-white mx-auto" strokeWidth={3} />
          )}
        </button>
      ))}
    </div>
  );
}
