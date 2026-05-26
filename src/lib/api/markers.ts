import { supabase } from '@/lib/supabase';
import type { Marker } from '@/types';

export async function listMarkers(mapId: string): Promise<Marker[]> {
  const { data, error } = await supabase
    .from('markers')
    .select('*')
    .eq('map_id', mapId)
    .order('sequence_order', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createMarker(input: Partial<Marker> & {
  map_id: string;
  user_id: string;
  label: string;
  latitude: number;
  longitude: number;
  sequence_order: number;
}): Promise<Marker> {
  const { data, error } = await supabase.from('markers').insert(input).select('*').single();
  if (error) throw error;
  return data;
}

export async function updateMarker(id: string, patch: Partial<Marker>): Promise<Marker> {
  const { data, error } = await supabase.from('markers').update(patch).eq('id', id).select('*').single();
  if (error) throw error;
  return data;
}

export async function deleteMarker(id: string): Promise<void> {
  const { error } = await supabase.from('markers').delete().eq('id', id);
  if (error) throw error;
}

export async function reorderMarkers(updates: { id: string; sequence_order: number }[]): Promise<void> {
  // Run updates in parallel
  await Promise.all(
    updates.map((u) => supabase.from('markers').update({ sequence_order: u.sequence_order }).eq('id', u.id))
  );
}
