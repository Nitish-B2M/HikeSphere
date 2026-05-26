import { supabase } from '@/lib/supabase';
import type { RouteLeg, RouteLegResult } from '@/types';

export async function listRouteLegs(mapId: string): Promise<RouteLeg[]> {
  const { data, error } = await supabase
    .from('route_legs')
    .select('*')
    .eq('map_id', mapId)
    .order('leg_order', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function replaceRouteLegs(mapId: string, legs: RouteLegResult[]): Promise<void> {
  const { error: delErr } = await supabase.from('route_legs').delete().eq('map_id', mapId);
  if (delErr) throw delErr;
  if (legs.length === 0) return;
  const rows = legs.map((l, i) => ({
    map_id: mapId,
    from_marker_id: l.fromMarkerId,
    to_marker_id: l.toMarkerId,
    leg_order: i,
    distance_meters: l.distanceMeters,
    duration_seconds: l.durationSeconds,
    polyline_encoded: l.polylineEncoded,
  }));
  const { error } = await supabase.from('route_legs').insert(rows);
  if (error) throw error;
}
