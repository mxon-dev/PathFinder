export type WalkCategory = "river" | "park" | "mountain" | "city" | "lake";

export type LatLng = {
  lat: number;
  lng: number;
};

export type PublicDataSource =
  | "data_go_kr_city_park"
  | "data_go_kr_tourism_trail"
  | "data_go_kr_tree_lined_road"
  | "data_go_kr_forest_trail";

export type NormalizedWalkCandidate = {
  id: string;
  title: string;
  categories: WalkCategory[];
  source: PublicDataSource;
  sourceName: string;
  sourceUrl: string;
  referenceDate?: string;
  managementAgency?: string;
  phone?: string;
  center?: LatLng;
  start?: {
    name?: string;
    address?: string;
    position?: LatLng;
  };
  end?: {
    name?: string;
    address?: string;
    position?: LatLng;
  };
  path?: LatLng[];
  distanceKm?: number;
  durationMin?: number;
  description?: string;
  raw?: Record<string, unknown>;
};
