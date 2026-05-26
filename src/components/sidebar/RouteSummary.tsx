import { ArrowRight } from 'lucide-react';
import type { Marker, MapRecord, RouteLeg } from '@/types';
import { formatDistance, formatDuration, letterFor } from '@/lib/utils';

interface RouteSummaryProps {
  map: MapRecord;
  markers: Marker[];
  legs: RouteLeg[];
}

export function RouteSummary({ map, markers, legs }: RouteSummaryProps) {
  const markerById = new Map(markers.map((m) => [m.id, m]));
  const markerIndex = new Map(markers.map((m, i) => [m.id, i]));

  return (
    <div className="border-t border-gray-200 bg-white">
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium text-gray-900">Route summary</div>
          <div className="text-xs text-gray-500">{markers.length} stops</div>
        </div>
        <div className="mt-1 text-base font-semibold">
          {formatDistance(map.total_distance_meters)} · {formatDuration(map.total_duration_seconds)}
        </div>
      </div>
      {legs.length === 0 ? (
        <div className="px-4 py-3 text-xs text-gray-500">Add at least two markers to see a route.</div>
      ) : (
        <ul className="max-h-48 overflow-auto scrollbar-thin divide-y divide-gray-100">
          {legs.map((leg) => {
            const from = markerById.get(leg.from_marker_id);
            const to = markerById.get(leg.to_marker_id);
            if (!from || !to) return null;
            return (
              <li key={leg.id} className="px-4 py-2 text-xs flex items-center justify-between gap-2">
                <span className="flex items-center gap-1 text-gray-700 min-w-0">
                  <strong>{letterFor(markerIndex.get(from.id) ?? 0)}</strong>
                  <ArrowRight className="h-3 w-3 text-gray-400" />
                  <strong>{letterFor(markerIndex.get(to.id) ?? 0)}</strong>
                </span>
                <span className="text-gray-500 whitespace-nowrap">
                  {formatDistance(leg.distance_meters)} · {formatDuration(leg.duration_seconds)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
