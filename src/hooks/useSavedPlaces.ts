import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createSavedPlace,
  deleteSavedPlace,
  listSavedPlaces,
  updateSavedPlace,
} from '@/lib/api/savedPlaces';
import type { SavedPlace } from '@/types';

export function useSavedPlaces(userId: string | undefined) {
  return useQuery({
    queryKey: ['savedPlaces', userId],
    queryFn: () => listSavedPlaces(userId!),
    enabled: !!userId,
  });
}

export function useCreateSavedPlace(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof createSavedPlace>[0]) => createSavedPlace(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['savedPlaces', userId] }),
  });
}

export function useUpdateSavedPlace(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<SavedPlace> }) =>
      updateSavedPlace(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['savedPlaces', userId] }),
  });
}

export function useDeleteSavedPlace(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteSavedPlace(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['savedPlaces', userId] }),
  });
}
