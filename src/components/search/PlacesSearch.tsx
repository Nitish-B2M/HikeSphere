import { useEffect, useRef, useState } from 'react';
import { Loader2, Search, X } from 'lucide-react';
import type { LatLng } from '@/types';
import { resolvePlace, searchPlaces, type PlaceSearchResult } from '@/lib/api/mapbox';
import { cn } from '@/lib/utils';

interface PlacesSearchProps {
  onSelect: (result: { label: string; latLng: LatLng; address: string | null; placeId: string | null }) => void;
  className?: string;
  placeholder?: string;
}

export function PlacesSearch({ onSelect, className, placeholder = 'Search a place…' }: PlacesSearchProps) {
  const [value, setValue] = useState('');
  const [results, setResults] = useState<PlaceSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Debounced search
  useEffect(() => {
    if (!value.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const r = await searchPlaces(value, controller.signal);
        setResults(r);
        setOpen(true);
      } catch {
        // ignored (abort)
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => {
      controller.abort();
      clearTimeout(t);
    };
  }, [value]);

  // Click outside closes
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  async function pick(r: PlaceSearchResult) {
    // Photon results already have coordinates — no retrieve step needed.
    let latLng: LatLng | null = r.latLng;
    if (!latLng && r.mapboxId) {
      setResolvingId(r.mapboxId);
      try {
        latLng = await resolvePlace(r.mapboxId);
      } finally {
        setResolvingId(null);
      }
    }
    if (!latLng) return;
    onSelect({
      label: r.label,
      latLng,
      address: r.address,
      placeId: r.placeId,
    });
    setValue('');
    setResults([]);
    setOpen(false);
  }

  return (
    <div ref={wrapRef} className={cn('relative w-full', className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        placeholder={placeholder}
        className="w-full h-11 rounded-full bg-white pl-10 pr-10 text-base shadow-md border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
      />
      {loading ? (
        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 animate-spin" />
      ) : value ? (
        <button
          onClick={() => {
            setValue('');
            setResults([]);
            setOpen(false);
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 h-6 w-6 inline-flex items-center justify-center rounded-full hover:bg-gray-100"
          aria-label="Clear"
        >
          <X className="h-4 w-4 text-gray-500" />
        </button>
      ) : null}

      {open && results.length > 0 && (
        <ul className="absolute z-30 left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-gray-200 max-h-80 overflow-auto scrollbar-thin">
          {results.map((r, i) => {
            const isResolving = resolvingId === r.mapboxId;
            return (
              <li key={`${r.placeId}-${i}`}>
                <button
                  type="button"
                  onClick={() => pick(r)}
                  disabled={isResolving}
                  title={r.address ?? r.label}
                  className="w-full text-left px-3 py-2 hover:bg-gray-50 disabled:opacity-60 flex flex-col gap-0.5"
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="text-sm font-medium truncate">{r.label}</span>
                    {r.kind && (
                      <span className="text-[10px] uppercase tracking-wide text-gray-500 bg-gray-100 rounded px-1.5 py-0.5 flex-shrink-0">
                        {r.kind}
                      </span>
                    )}
                    {isResolving && <Loader2 className="h-3 w-3 animate-spin text-gray-400 ml-auto" />}
                  </span>
                  {r.address && r.address !== r.label && (
                    <span className="text-xs text-gray-500 line-clamp-2 break-words">{r.address}</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {open && !loading && value.trim() && results.length === 0 && (
        <div className="absolute z-30 left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-gray-200 p-3 text-xs text-gray-500">
          No results
        </div>
      )}
    </div>
  );
}
