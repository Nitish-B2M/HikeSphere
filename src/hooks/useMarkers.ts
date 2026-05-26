import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createMarker,
  deleteMarker,
  listMarkers,
  reorderMarkers,
  updateMarker,
} from '@/lib/api/markers';
import { supabase } from '@/lib/supabase';
import type { Marker } from '@/types';

export function useMarkers(mapId: string | undefined) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['markers', mapId],
    queryFn: () => listMarkers(mapId!),
    enabled: !!mapId,
  });

  useEffect(() => {
    if (!mapId) return;
    const channel = supabase
      .channel(`markers:${mapId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'markers', filter: `map_id=eq.${mapId}` },
        () => qc.invalidateQueries({ queryKey: ['markers', mapId] })
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [mapId, qc]);

  return query;
}

export function useCreateMarker(mapId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof createMarker>[0]) => createMarker(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['markers', mapId] }),
  });
}

export function useUpdateMarker(mapId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Marker> }) => updateMarker(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['markers', mapId] }),
  });
}

export function useDeleteMarker(mapId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteMarker(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['markers', mapId] }),
  });
}

export function useReorderMarkers(mapId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (updates: { id: string; sequence_order: number }[]) => reorderMarkers(updates),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['markers', mapId] }),
  });
}
