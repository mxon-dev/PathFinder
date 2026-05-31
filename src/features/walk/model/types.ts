export type WalkCategory = "river" | "park" | "mountain" | "city" | "lake";

export type CourseSource =
  | "public_park"
  | "public_trail"
  | "forest_trail"
  | "kakao_local";

export type LatLng = {
  lat: number;
  lng: number;
};

export type CourseCandidate = {
  id: string;
  title: string;
  category: WalkCategory[];
  source: CourseSource;
  center: LatLng;
  start?: {
    name: string;
    lat?: number;
    lng?: number;
  };
  end?: {
    name: string;
    lat?: number;
    lng?: number;
  };
  path?: LatLng[];
  /** 경로정보 경유지 (출발·중간·도착) */
  waypoints?: { name: string; lat: number; lng: number }[];
  distanceKm?: number;
  durationMin?: number;
  description: string;
  placeUrl?: string;
};

export type RecommendationFilterId =
  | "all"
  | "under30"
  | "under60"
  | WalkCategory;

export type WalkRecommendationsRequest = {
  duration?: string;
  places?: string;
  lat?: number;
  lng?: number;
  locationName?: string;
};

export type WalkRecommendationsResponse = {
  courses: CourseCandidate[];
  location: {
    name: string;
    center: LatLng;
    isDefault: boolean;
  };
  aiEnhanced: boolean;
  generatedAt: string;
};
