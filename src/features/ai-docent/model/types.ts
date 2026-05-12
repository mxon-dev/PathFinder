export interface AIDocentRequest {
  routeId: string;
  routeName: string;
  distanceKm?: number;
  estimatedMinutes?: number;
  difficulty?: "easy" | "normal" | "hard";
  locationText?: string;
  routeDescription?: string;
  keywords?: string[];
  userPreference?:
    | "healing"
    | "exercise"
    | "history"
    | "nature"
    | "family";
}

export interface AIDocentResponse {
  title: string;
  summary: string;
  highlights: string[];
  recommendedFor: string[];
  cautionNotes: string[];
  docentScript: string;
}
