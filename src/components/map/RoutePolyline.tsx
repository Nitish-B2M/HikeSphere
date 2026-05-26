import { useEffect, useMemo } from 'react';
import { useMap } from '@vis.gl/react-google-maps';
import { decodePolyline } from '@/lib/api/directions';

interface RoutePolylineProps {
  encoded: string;
  color?: string;
  loading?: boolean;
}

export function RoutePolyline({ encoded, color = '#4F46E5', loading }: RoutePolylineProps) {
  const map = useMap();
  const path = useMemo(() => (encoded ? decodePolyline(encoded) : []), [encoded]);

  useEffect(() => {
    if (!map || path.length === 0) return;
    const polyline = new google.maps.Polyline({
      path,
      strokeColor: color,
      strokeOpacity: loading ? 0.5 : 0.9,
      strokeWeight: 5,
      ...(loading ? { strokeOpacity: 0, icons: dashedIcons(color) } : {}),
      map,
    });
    return () => {
      polyline.setMap(null);
    };
  }, [map, path, color, loading]);

  return null;
}

function dashedIcons(color: string) {
  return [
    {
      icon: {
        path: 'M 0,-1 0,1',
        strokeOpacity: 1,
        strokeColor: color,
        scale: 3,
      },
      offset: '0',
      repeat: '14px',
    },
  ] as google.maps.IconSequence[];
}
