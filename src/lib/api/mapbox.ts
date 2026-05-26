import type { LatLng } from '@/types';
import { MAPBOX_TOKEN, SEARCH_COUNTRY_CODES } from '@/constants/config';
import { searchPhoton } from '@/lib/api/photon';

const SUGGEST = 'https://api.mapbox.com/search/searchbox/v1/suggest';
const RETRIEVE = 'https://api.mapbox.com/search/searchbox/v1/retrieve';
const REVERSE = 'https://api.mapbox.com/search/geocode/v6/reverse';

export interface PlaceSearchResult {
  label: string;
  address: string | null;
  placeId: string | null;
  kind: string | null;
  // For Mapbox suggest results we don't have coordinates yet;
  // call resolvePlace() with the mapboxId to fetch them.
  mapboxId?: string;
  latLng: LatLng | null;
}

// Persist a single session token per browser session for billing grouping.
const SESSION_KEY = 'mapbox_session_token';
function sessionToken(): string {
  let t = sessionStorage.getItem(SESSION_KEY);
  if (!t) {
    t = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, t);
  }
  return t;
}

interface MapboxSuggestion {
  mapbox_id: string;
  name: string;
  name_preferred?: string;
  place_formatted?: string;
  full_address?: string;
  feature_type: string;
  poi_category?: string[];
}

function toResult(s: MapboxSuggestion): PlaceSearchResult {
  return {
    label: s.name_preferred || s.name,
    address: s.full_address || s.place_formatted || null,
    placeId: s.mapbox_id,
    kind: s.feature_type === 'poi' && s.poi_category?.length ? s.poi_category[0] : s.feature_type,
    mapboxId: s.mapbox_id,
    latLng: null,
  };
}

async function searchOneCountry(
  query: string,
  country: string,
  limit: number,
  signal?: AbortSignal
): Promise<PlaceSearchResult[]> {
  const params = new URLSearchParams({
    q: query,
    access_token: MAPBOX_TOKEN,
    session_token: sessionToken(),
    limit: String(limit),
    language: (navigator.language || 'en').slice(0, 2),
    country,
  });
  const res = await fetch(`${SUGGEST}?${params.toString()}`, { signal });
  if (!res.ok) return [];
  const data = (await res.json()) as { suggestions?: MapboxSuggestion[] };
  return (data.suggestions ?? []).map(toResult);
}

export async function searchPlaces(
  query: string,
  signal?: AbortSignal
): Promise<PlaceSearchResult[]> {
  if (!query.trim()) return [];
  const countries = (SEARCH_COUNTRY_CODES || '').split(',').map((c) => c.trim()).filter(Boolean);
  const MAX = 12;
  const PER_COUNTRY = 10; // SearchBox API max is 10

  // Fire Mapbox (per-country) + Photon (OSM, single global call) in parallel.
  const mapboxPromise: Promise<PlaceSearchResult[][]> = MAPBOX_TOKEN
    ? countries.length === 0
      ? searchOneCountry(query, '', MAX, signal).then((r) => [r])
      : Promise.all(countries.map((c) => searchOneCountry(query, c, PER_COUNTRY, signal)))
    : Promise.resolve([]);

  const photonPromise = searchPhoton(query, signal).then((arr): PlaceSearchResult[] =>
    arr.map((p) => ({
      label: p.label,
      address: p.address,
      placeId: p.placeId,
      kind: p.kind,
      mapboxId: undefined,
      latLng: p.latLng, // Photon returns coordinates immediately — no retrieve needed
    }))
  );

  const [mapboxLists, photonList] = await Promise.all([mapboxPromise, photonPromise]);

  // Collect & dedupe across all sources.
  const lists: PlaceSearchResult[][] = [...mapboxLists, photonList];
  const seen = new Set<string>();
  const collected: PlaceSearchResult[] = [];
  for (const list of lists) {
    for (const item of list) {
      const key = item.latLng
        ? `${item.label.toLowerCase()}|${item.latLng.lat.toFixed(3)}|${item.latLng.lng.toFixed(3)}`
        : item.mapboxId ?? item.label;
      if (seen.has(key)) continue;
      seen.add(key);
      collected.push(item);
    }
  }

  // Re-rank by query relevance — solves "national museum of nepal" returning
  // every place containing the word "nepal" first.
  const scored = collected.map((item, idx) => ({
    item,
    score: scoreRelevance(query, item),
    origIdx: idx,
  }));
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.origIdx - b.origIdx; // stable for ties
  });

  return scored.slice(0, MAX).map((s) => s.item);
}

// Stopwords that shouldn't drive matching (esp. for queries like "X of Y")
const STOP = new Set(['of', 'the', 'a', 'an', 'and', 'in', 'at', 'to']);

// POI kinds that should rank higher than generic localities/countries.
const KIND_BOOST: Record<string, number> = {
  museum: 6,
  attraction: 5,
  monument: 5,
  memorial: 5,
  temple: 5,
  place_of_worship: 5,
  viewpoint: 4,
  park: 4,
  hotel: 3,
  restaurant: 3,
  poi: 2,
};

// Penalties for matches that are too broad.
const KIND_PENALTY: Record<string, number> = {
  country: -8,
  region: -5,
  district: -3,
  postcode: -3,
  locality: -1,
};

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t && !STOP.has(t));
}

function scoreRelevance(query: string, item: PlaceSearchResult): number {
  const qTokens = tokenize(query);
  if (qTokens.length === 0) return 0;
  const name = (item.label || '').toLowerCase();
  const addr = (item.address || '').toLowerCase();
  const nameTokens = new Set(tokenize(item.label || ''));
  const addrTokens = new Set(tokenize(item.address || ''));

  let score = 0;
  let nameMatches = 0;
  for (const t of qTokens) {
    if (nameTokens.has(t)) {
      score += 10;
      nameMatches++;
    } else if (name.includes(t)) {
      score += 6; // partial substring in name
    } else if (addrTokens.has(t)) {
      score += 2;
    } else if (addr.includes(t)) {
      score += 1;
    }
  }

  // Big bonus if ALL query tokens appear in the name — this is the actual match.
  if (nameMatches === qTokens.length) score += 15;

  // Kind bonus/penalty
  const kind = (item.kind || '').toLowerCase();
  if (kind in KIND_BOOST) score += KIND_BOOST[kind];
  if (kind in KIND_PENALTY) score += KIND_PENALTY[kind];

  return score;
}

/**
 * Mapbox Search Box returns suggestions without coordinates.
 * After the user picks one, call this to get the lat/lng.
 */
export async function resolvePlace(mapboxId: string): Promise<LatLng | null> {
  if (!MAPBOX_TOKEN) return null;
  const params = new URLSearchParams({
    access_token: MAPBOX_TOKEN,
    session_token: sessionToken(),
  });
  const res = await fetch(`${RETRIEVE}/${encodeURIComponent(mapboxId)}?${params.toString()}`);
  if (!res.ok) return null;
  const data = (await res.json()) as {
    features?: Array<{ geometry: { coordinates: [number, number] } }>;
  };
  const f = data.features?.[0];
  if (!f) return null;
  const [lng, lat] = f.geometry.coordinates;
  return { lat, lng };
}

export async function reverseGeocodeMapbox(
  location: LatLng
): Promise<{ address: string | null; placeId: string | null }> {
  if (!MAPBOX_TOKEN) return { address: null, placeId: null };
  try {
    const params = new URLSearchParams({
      longitude: String(location.lng),
      latitude: String(location.lat),
      access_token: MAPBOX_TOKEN,
      limit: '1',
    });
    const res = await fetch(`${REVERSE}?${params.toString()}`);
    if (!res.ok) return { address: null, placeId: null };
    const data = (await res.json()) as {
      features?: Array<{ properties?: { full_address?: string; place_formatted?: string; mapbox_id?: string } }>;
    };
    const f = data.features?.[0];
    if (!f) return { address: null, placeId: null };
    return {
      address: f.properties?.full_address || f.properties?.place_formatted || null,
      placeId: f.properties?.mapbox_id ?? null,
    };
  } catch {
    return { address: null, placeId: null };
  }
}
