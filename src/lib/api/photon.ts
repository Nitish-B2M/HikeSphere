import type { LatLng } from '@/types';
import { SEARCH_COUNTRY_CODES } from '@/constants/config';

const BASE = 'https://photon.komoot.io/api';

export interface PhotonResult {
  label: string;
  address: string | null;
  placeId: string | null;
  kind: string | null;
  latLng: LatLng;
  countryCode?: string;
}

export async function searchPhoton(query: string, signal?: AbortSignal): Promise<PhotonResult[]> {
  if (!query.trim()) return [];
  const params = new URLSearchParams({
    q: query,
    limit: '15',
    lang: (navigator.language || 'en').slice(0, 2),
  });
  const res = await fetch(`${BASE}?${params.toString()}`, { signal });
  if (!res.ok) return [];
  const data = (await res.json()) as {
    features?: Array<{
      geometry?: { coordinates: [number, number] };
      properties?: {
        name?: string;
        osm_id?: number;
        osm_type?: string;
        osm_key?: string;
        osm_value?: string;
        type?: string;
        country?: string;
        countrycode?: string;
        state?: string;
        city?: string;
        street?: string;
        housenumber?: string;
        postcode?: string;
      };
    }>;
  };

  const allowed = (SEARCH_COUNTRY_CODES || '')
    .split(',')
    .map((c) => c.trim().toLowerCase())
    .filter(Boolean);

  const results: PhotonResult[] = [];
  for (const f of data.features ?? []) {
    if (!f.geometry || !f.properties?.name) continue;
    const cc = (f.properties.countrycode || '').toLowerCase();
    if (allowed.length > 0 && cc && !allowed.includes(cc)) continue;

    const [lng, lat] = f.geometry.coordinates;
    const parts = [
      f.properties.street,
      f.properties.city,
      f.properties.state,
      f.properties.country,
    ].filter(Boolean);

    results.push({
      label: f.properties.name,
      address: parts.length > 0 ? parts.join(', ') : null,
      placeId: f.properties.osm_id ? `osm:${f.properties.osm_type}:${f.properties.osm_id}` : null,
      kind: f.properties.osm_value || f.properties.type || null,
      latLng: { lat, lng },
      countryCode: cc || undefined,
    });
  }
  return results;
}
