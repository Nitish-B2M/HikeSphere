import { supabase } from '@/lib/supabase';
import type { MapRecord, TravelMode } from '@/types';

export async function listMaps(userId: string): Promise<MapRecord[]> {
  const { data, error } = await supabase
    .from('maps')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getMap(id: string): Promise<MapRecord | null> {
  const { data, error } = await supabase.from('maps').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function createMap(input: { user_id: string; title?: string }): Promise<MapRecord> {
  const { data, error } = await supabase
    .from('maps')
    .insert({ user_id: input.user_id, title: input.title ?? 'New Map' })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function updateMap(id: string, patch: Partial<MapRecord>): Promise<MapRecord> {
  const { data, error } = await supabase.from('maps').update(patch).eq('id', id).select('*').single();
  if (error) throw error;
  return data;
}

export async function deleteMap(id: string): Promise<void> {
  const { error } = await supabase.from('maps').delete().eq('id', id);
  if (error) throw error;
}

export async function setTravelMode(id: string, travel_mode: TravelMode): Promise<MapRecord> {
  return updateMap(id, { travel_mode });
}
