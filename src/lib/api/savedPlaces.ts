import { supabase } from '@/lib/supabase';
import type { SavedPlace } from '@/types';

export async function listSavedPlaces(userId: string): Promise<SavedPlace[]> {
  const { data, error } = await supabase
    .from('saved_places')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createSavedPlace(input: Partial<SavedPlace> & {
  user_id: string;
  label: string;
  latitude: number;
  longitude: number;
}): Promise<SavedPlace> {
  const { data, error } = await supabase.from('saved_places').insert(input).select('*').single();
  if (error) throw error;
  return data;
}

export async function updateSavedPlace(id: string, patch: Partial<SavedPlace>): Promise<SavedPlace> {
  const { data, error } = await supabase.from('saved_places').update(patch).eq('id', id).select('*').single();
  if (error) throw error;
  return data;
}

export async function deleteSavedPlace(id: string): Promise<void> {
  const { error } = await supabase.from('saved_places').delete().eq('id', id);
  if (error) throw error;
}
