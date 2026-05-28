export type WalkCourseCategory =
  | "river"
  | "park"
  | "mountain"
  | "urban"
  | "lake";

export type WalkCourse = {
  id: string;
  groupName: string;
  courseName: string;
  waypoints: string;
  region: string;
  level: string;
  lengthBucket: string;
  distanceKm: number | null;
  description: string;
  durationText: string;
  durationMin: number | null;
  notes: string;
  toilet: string;
  convenience: string;
  address: string;
  lat: number | null;
  lng: number | null;
  categories: WalkCourseCategory[];
};
