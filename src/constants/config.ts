export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
export const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string;
export const GOOGLE_MAPS_MAP_ID = (import.meta.env.VITE_GOOGLE_MAPS_MAP_ID as string) || undefined;
export const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string;

export const DEFAULT_CENTER = { lat: 20.5937, lng: 78.9629 }; // India
export const DEFAULT_ZOOM = 5;
export const SEARCH_COUNTRY_CODES = 'in,np,bt'; // ISO 3166-1 alpha-2, comma-separated (India, Nepal, Bhutan)

export const MARKER_COLORS = [
  '#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#EC4899',
  '#8B5CF6', '#06B6D4', '#84CC16', '#F97316', '#6B7280',
];

export const TRAVEL_MODE_LABELS: Record<string, { label: string; icon: string }> = {
  DRIVING: { label: 'Drive', icon: '🚗' },
  MOTORBIKE: { label: 'Bike', icon: '🏍️' },
  BICYCLING: { label: 'Cycle', icon: '🚴' },
  WALKING: { label: 'Walk', icon: '🚶' },
};
