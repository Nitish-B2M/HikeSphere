import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { computeRouteLegs } from '@/lib/api/directions';
import { listRouteLegs, replaceRouteLegs } from '@/lib/api/routeLegs';
import { updateMap } from '@/lib/api/maps';
import type { Marker, TravelMode } from '@/types';

export function useRouteLegs(mapId: string | undefined) {
  return useQuery({
    queryKey: ['routeLegs', mapId],
    queryFn: () => listRouteLegs(mapId!),
    enabled: !!mapId,
  });
}

export function useRecomputeRoute(mapId: string | undefined) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ markers, mode }: { markers: Marker[]; mode: TravelMode }) => {
      if (!mapId) throw new Error('No map id');
      const legs = await computeRouteLegs(markers, mode);
      await replaceRouteLegs(mapId, legs);
      const totalDist = legs.reduce((acc, l) => acc + l.distanceMeters, 0);
      const totalDur = legs.reduce((acc, l) => acc + l.durationSeconds, 0);
      await updateMap(mapId, {
        total_distance_meters: totalDist,
        total_duration_seconds: totalDur,
      });
      return legs;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['routeLegs', mapId] });
      qc.invalidateQueries({ queryKey: ['map', mapId] });
    },
  });
}
