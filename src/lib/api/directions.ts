import type { Marker, RouteLegResult, TravelMode } from '@/types';

const SPEED_MPS: Record<TravelMode, number> = {
  WALKING: 1.4,    // ~5 km/h
  BICYCLING: 4.2,  // ~15 km/h
  DRIVING: 11.1,   // ~40 km/h (city average)
  MOTORBIKE: 13.9, // ~50 km/h (lane-filtering through traffic)
};

// The osrm.de routing service hosts a separate OSRM instance per profile.
// Motorbike shares the car road network; we override duration with a faster speed below.
const OSRM_ENDPOINT: Record<TravelMode, string> = {
  DRIVING: 'https://routing.openstreetmap.de/routed-car/route/v1/driving',
  MOTORBIKE: 'https://routing.openstreetmap.de/routed-car/route/v1/driving',
  WALKING: 'https://routing.openstreetmap.de/routed-foot/route/v1/foot',
  BICYCLING: 'https://routing.openstreetmap.de/routed-bike/route/v1/bike',
};

async function fetchOsrmLeg(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
  endpoint: string,
  signal?: AbortSignal
): Promise<{ distance: number; duration: number; polyline: string } | null> {
  const coords = `${from.lng},${from.lat};${to.lng},${to.lat}`;
  const url = `${endpoint}/${coords}?overview=full&geometries=polyline`;
  try {
    const res = await fetch(url, { signal });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      code: string;
      routes?: { distance: number; duration: number; geometry: string }[];
    };
    if (data.code !== 'Ok' || !data.routes?.length) return null;
    const r = data.routes[0];
    return { distance: r.distance, duration: r.duration, polyline: r.geometry };
  } catch {
    return null;
  }
}

export function haversineMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export function encodePolyline(path: { lat: number; lng: number }[]): string {
  let lastLat = 0;
  let lastLng = 0;
  let out = '';
  const encVal = (v: number) => {
    v = v < 0 ? ~(v << 1) : v << 1;
    let s = '';
    while (v >= 0x20) {
      s += String.fromCharCode((0x20 | (v & 0x1f)) + 63);
      v >>= 5;
    }
    s += String.fromCharCode(v + 63);
    return s;
  };
  for (const p of path) {
    const lat = Math.round(p.lat * 1e5);
    const lng = Math.round(p.lng * 1e5);
    out += encVal(lat - lastLat);
    out += encVal(lng - lastLng);
    lastLat = lat;
    lastLng = lng;
  }
  return out;
}

export function decodePolyline(encoded: string): google.maps.LatLngLiteral[] {
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;
  const path: google.maps.LatLngLiteral[] = [];
  while (index < len) {
    let b: number;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dlat;
    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dlng;
    path.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return path;
}

/**
 * Compute legs between consecutive markers using OSRM (real road routes).
 * Falls back to a straight-line Haversine leg if OSRM has no result or the
 * mode is TRANSIT (OSRM has no transit profile).
 */
export async function computeRouteLegs(
  markers: Marker[],
  mode: TravelMode
): Promise<RouteLegResult[]> {
  if (markers.length < 2) return [];
  const ordered = [...markers].sort((a, b) => a.sequence_order - b.sequence_order);
  const endpoint = OSRM_ENDPOINT[mode];
  const legs: RouteLegResult[] = [];

  for (let i = 0; i < ordered.length - 1; i++) {
    const from = ordered[i];
    const to = ordered[i + 1];
    const fromLL = { lat: from.latitude, lng: from.longitude };
    const toLL = { lat: to.latitude, lng: to.longitude };

    let leg: RouteLegResult | null = null;

    const osrm = await fetchOsrmLeg(fromLL, toLL, endpoint);
    if (osrm) {
      // Motorbike rides the car road network; estimate a faster duration.
      const duration =
        mode === 'MOTORBIKE'
          ? Math.round(osrm.distance / SPEED_MPS.MOTORBIKE)
          : Math.round(osrm.duration);
      leg = {
        fromMarkerId: from.id,
        toMarkerId: to.id,
        distanceMeters: Math.round(osrm.distance),
        durationSeconds: duration,
        polylineEncoded: osrm.polyline,
      };
    }

    if (!leg) {
      // Fallback: straight line + estimated speed.
      const distance = Math.round(haversineMeters(fromLL, toLL));
      const duration = Math.round(distance / SPEED_MPS[mode]);
      leg = {
        fromMarkerId: from.id,
        toMarkerId: to.id,
        distanceMeters: distance,
        durationSeconds: duration,
        polylineEncoded: encodePolyline([fromLL, toLL]),
      };
    }

    legs.push(leg);
  }
  return legs;
}
