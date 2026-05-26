import type { LatLng } from '@/types';

export async function reverseGeocode(
  geocoder: google.maps.Geocoder,
  location: LatLng
): Promise<{ address: string | null; placeId: string | null }> {
  try {
    const res = await geocoder.geocode({ location });
    const top = res.results[0];
    if (!top) return { address: null, placeId: null };
    return { address: top.formatted_address ?? null, placeId: top.place_id ?? null };
  } catch {
    return { address: null, placeId: null };
  }
}
