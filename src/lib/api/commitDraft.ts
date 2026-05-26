import { supabase } from '@/lib/supabase';
import type { MapCategory, Marker, RouteLeg, TravelMode } from '@/types';

interface CommitInput {
  mapId: string;
  userId: string;
  title: string;
  description: string | null;
  category: MapCategory;
  travel_mode: TravelMode;
  total_distance_meters: number | null;
  total_duration_seconds: number | null;
  markers: Marker[];
  routeLegs: RouteLeg[];
}

/**
 * Commits a draft trip to the DB by:
 *  1. Updating the maps row (meta + totals + travel mode).
 *  2. Deleting all existing markers for this map (route_legs cascade via FK).
 *  3. Inserting all draft markers with fresh DB-generated UUIDs.
 *  4. Inserting all draft route_legs with the new marker IDs (remapped).
 *
 * Returns the new marker rows so the caller can re-hydrate the draft.
 */
export async function commitTripDraft(input: CommitInput): Promise<{
  markers: Marker[];
  routeLegs: RouteLeg[];
}> {
  // 1. Update map meta
  const { error: mapErr } = await supabase
    .from('maps')
    .update({
      title: input.title,
      description: input.description,
      category: input.category,
      travel_mode: input.travel_mode,
      total_distance_meters: input.total_distance_meters,
      total_duration_seconds: input.total_duration_seconds,
    })
    .eq('id', input.mapId);
  if (mapErr) throw mapErr;

  // 2. Delete existing markers (route_legs cascade)
  const { error: delErr } = await supabase.from('markers').delete().eq('map_id', input.mapId);
  if (delErr) throw delErr;

  // 3. Insert markers and capture new IDs in draft order
  if (input.markers.length === 0) {
    return { markers: [], routeLegs: [] };
  }
  const insertRows = input.markers.map((m, i) => ({
    map_id: input.mapId,
    user_id: input.userId,
    label: m.label,
    sequence_order: i,
    latitude: m.latitude,
    longitude: m.longitude,
    address: m.address,
    place_id: m.place_id,
    color: m.color,
    notes: m.notes,
  }));
  const { data: newMarkers, error: mkErr } = await supabase
    .from('markers')
    .insert(insertRows)
    .select('*');
  if (mkErr) throw mkErr;

  const orderedNew = (newMarkers ?? []).sort((a: Marker, b: Marker) => a.sequence_order - b.sequence_order);

  // Build a map from draft id (which might be temp) → new DB id, by sequence order.
  const idMap = new Map<string, string>();
  input.markers.forEach((draft, i) => {
    const inserted = orderedNew[i];
    if (inserted) idMap.set(draft.id, inserted.id);
  });

  // 4. Insert route_legs with remapped marker IDs
  if (input.routeLegs.length > 0) {
    const legRows = input.routeLegs.map((l, i) => ({
      map_id: input.mapId,
      from_marker_id: idMap.get(l.from_marker_id) ?? l.from_marker_id,
      to_marker_id: idMap.get(l.to_marker_id) ?? l.to_marker_id,
      leg_order: i,
      distance_meters: l.distance_meters,
      duration_seconds: l.duration_seconds,
      polyline_encoded: l.polyline_encoded,
    }));
    const { error: legErr } = await supabase.from('route_legs').insert(legRows);
    if (legErr) throw legErr;
  }

  // Fetch fresh route legs to return
  const { data: freshLegs } = await supabase
    .from('route_legs')
    .select('*')
    .eq('map_id', input.mapId)
    .order('leg_order', { ascending: true });

  return { markers: orderedNew, routeLegs: (freshLegs ?? []) as RouteLeg[] };
}
