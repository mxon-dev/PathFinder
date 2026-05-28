import { DUMMY_REFERENCE_POINT } from "@/shared/config/dummy-location";
import type {
  CourseCandidate,
  WalkRecommendationsResponse,
} from "@/features/walk/model/types";
import { fetchNearbyParkCandidates } from "@/lib/public-data/fetch-nearby-park-candidates";
import { fetchNearbyTrailCandidates } from "@/lib/public-data/fetch-nearby-trail-candidates";
import { enrichCourseRoute } from "@/lib/walk/enrich-course-route";
import {
  parseDurationMin,
  parsePlaceChips,
} from "@/lib/walk/parse-recommendation-params";

export type BuildWalkRecommendationsInput = {
  duration?: string;
  places?: string;
  lat?: number;
  lng?: number;
  locationName?: string;
  freeText?: string;
};

function resolveReference(input: BuildWalkRecommendationsInput) {
  if (
    typeof input.lat === "number" &&
    typeof input.lng === "number" &&
    Number.isFinite(input.lat) &&
    Number.isFinite(input.lng)
  ) {
    return {
      lat: input.lat,
      lng: input.lng,
      label: input.locationName?.trim() || input.freeText?.trim() || "선택 위치",
      isDefault: false,
    };
  }
  return {
    lat: DUMMY_REFERENCE_POINT.lat,
    lng: DUMMY_REFERENCE_POINT.lng,
    label: DUMMY_REFERENCE_POINT.label,
    isDefault: true,
  };
}

function dedupeCandidates(courses: CourseCandidate[]): CourseCandidate[] {
  const seen = new Set<string>();
  const out: CourseCandidate[] = [];
  for (const c of courses) {
    const key = `${c.title}|${c.center.lat.toFixed(4)}|${c.center.lng.toFixed(4)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(c);
  }
  return out;
}

/** 공공 길 API + (선택) 공원 API 추천 목록 */
export async function buildWalkRecommendations(
  input: BuildWalkRecommendationsInput,
): Promise<WalkRecommendationsResponse> {
  const reference = resolveReference(input);
  const selectionPlaces = parsePlaceChips(input.places);
  const durationMin = parseDurationMin(input.duration);

  const [trailCandidates, parkCandidates] = await Promise.all([
    fetchNearbyTrailCandidates({
      reference,
      selectionPlaces,
      durationMin,
      limit: 16,
    }),
    fetchNearbyParkCandidates({
      reference,
      selectionPlaces,
      limit: 6,
    }),
  ]);

  const parkWithRoutes = parkCandidates.map((park) =>
    enrichCourseRoute(park, { reference }),
  );

  const merged = dedupeCandidates([...trailCandidates, ...parkWithRoutes]);

  return {
    courses: merged,
    location: {
      name: reference.label,
      center: { lat: reference.lat, lng: reference.lng },
      isDefault: reference.isDefault,
    },
    aiEnhanced: false,
    generatedAt: new Date().toISOString(),
  };
}

export async function findRecommendedCourseById(
  courseId: string,
  input: BuildWalkRecommendationsInput,
): Promise<CourseCandidate | null> {
  const { courses } = await buildWalkRecommendations(input);
  const decoded = decodeURIComponent(courseId);
  return courses.find((c) => c.id === decoded || c.id === courseId) ?? null;
}
