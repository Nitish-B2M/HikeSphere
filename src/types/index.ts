export * from './database';

export interface LatLng {
  lat: number;
  lng: number;
}

export interface RouteLegResult {
  fromMarkerId: string;
  toMarkerId: string;
  distanceMeters: number;
  durationSeconds: number;
  polylineEncoded: string;
}
