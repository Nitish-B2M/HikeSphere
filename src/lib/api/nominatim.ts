import type { LatLng } from '@/types';
import { SEARCH_COUNTRY_CODES } from '@/constants/config';

const BASE = 'https://nominatim.openstreetmap.org';

export interface NominatimResult {
  label: string;
  latLng: LatLng;
  address: string | null;
  placeId: string | null;
  kind: string | null; // e.g. "city", "town", "village", "amenity"
}

// Lower number = higher priority in dropdown.
const TYPE_PRIORITY: Record<string, number> = {
  city: 0,
  town: 1,
  municipality: 2,
  administrative: 3,
  county: 4,
  state: 5,
  suburb: 6,
  village: 7,
  hamlet: 8,
  neighbourhood: 9,
};

function priorityFor(klass: string | undefined, type: string | undefined): number {
  if (type && type in TYPE_PRIORITY) return TYPE_PRIORITY[type];
  if (klass === 'place') return 10;
  if (klass === 'boundary') return 11;
  // POIs / amenities go last
  return 50;
}

export async function searchPlaces(query: string, signal?: AbortSignal): Promise<NominatimResult[]> {
  if (!query.trim()) return [];
  const countryParam = SEARCH_COUNTRY_CODES ? `&countrycodes=${SEARCH_COUNTRY_CODES}` : '';
  const url = `${BASE}/search?format=json&addressdetails=1&limit=15${countryParam}&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    signal,
    headers: { 'Accept-Language': navigator.language || 'en' },
  });
  if (!res.ok) return [];
  const data = (await res.json()) as Array<{
    place_id: number;
    lat: string;
    lon: string;
    display_name: string;
    name?: string;
    class?: string;
    type?: string;
    importance?: number;
  }>;
  return data
    .map((r, idx) => ({
      label: r.name || r.display_name.split(',')[0],
      latLng: { lat: parseFloat(r.lat), lng: parseFloat(r.lon) },
      address: r.display_name,
      placeId: String(r.place_id),
      kind: r.type ?? r.class ?? null,
      _priority: priorityFor(r.class, r.type),
      _importance: r.importance ?? 0,
      _idx: idx,
    }))
    .sort((a, b) => {
      if (a._priority !== b._priority) return a._priority - b._priority;
      if (a._importance !== b._importance) return b._importance - a._importance;
      return a._idx - b._idx;
    })
    .map(({ _priority, _importance, _idx, ...rest }) => rest);
}

export async function reverseGeocodeNominatim(
  location: LatLng
): Promise<{ address: string | null; placeId: string | null }> {
  try {
    const url = `${BASE}/reverse?format=json&lat=${location.lat}&lon=${location.lng}`;
    const res = await fetch(url, {
      headers: { 'Accept-Language': navigator.language || 'en' },
    });
    if (!res.ok) return { address: null, placeId: null };
    const data = (await res.json()) as { display_name?: string; place_id?: number };
    return {
      address: data.display_name ?? null,
      placeId: data.place_id ? String(data.place_id) : null,
    };
  } catch {
    return { address: null, placeId: null };
  }
}
