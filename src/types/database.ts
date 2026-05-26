export type TravelMode = 'DRIVING' | 'MOTORBIKE' | 'WALKING' | 'BICYCLING';
export type SavedPlaceCategory = 'home' | 'work' | 'favorite' | 'other';
export type MapCategory = 'trip' | 'trekking' | 'sightseeing' | 'commute' | 'delivery' | 'other';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface MapRecord {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  travel_mode: TravelMode;
  category: MapCategory;
  total_distance_meters: number | null;
  total_duration_seconds: number | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface Marker {
  id: string;
  map_id: string;
  user_id: string;
  label: string;
  sequence_order: number;
  latitude: number;
  longitude: number;
  address: string | null;
  place_id: string | null;
  color: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface RouteLeg {
  id: string;
  map_id: string;
  from_marker_id: string;
  to_marker_id: string;
  leg_order: number;
  distance_meters: number | null;
  duration_seconds: number | null;
  polyline_encoded: string | null;
  created_at: string;
}

export interface SavedPlace {
  id: string;
  user_id: string;
  label: string;
  address: string | null;
  latitude: number;
  longitude: number;
  place_id: string | null;
  category: SavedPlaceCategory;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile>; Update: Partial<Profile> };
      maps: { Row: MapRecord; Insert: Partial<MapRecord>; Update: Partial<MapRecord> };
      markers: { Row: Marker; Insert: Partial<Marker>; Update: Partial<Marker> };
      route_legs: { Row: RouteLeg; Insert: Partial<RouteLeg>; Update: Partial<RouteLeg> };
      saved_places: { Row: SavedPlace; Insert: Partial<SavedPlace>; Update: Partial<SavedPlace> };
    };
  };
}
