import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createMap, deleteMap, getMap, listMaps, updateMap } from '@/lib/api/maps';
import type { MapRecord } from '@/types';

export function useMaps(userId: string | undefined) {
  return useQuery({
    queryKey: ['maps', userId],
    queryFn: () => listMaps(userId!),
    enabled: !!userId,
  });
}

export function useMap(id: string | undefined) {
  return useQuery({
    queryKey: ['map', id],
    queryFn: () => getMap(id!),
    enabled: !!id,
  });
}

export function useCreateMap(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (title?: string) => createMap({ user_id: userId!, title }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['maps', userId] }),
  });
}

export function useUpdateMap() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<MapRecord> }) => updateMap(id, patch),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['map', data.id] });
      qc.invalidateQueries({ queryKey: ['maps', data.user_id] });
    },
  });
}

export function useDeleteMap(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteMap(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['maps', userId] }),
  });
}
