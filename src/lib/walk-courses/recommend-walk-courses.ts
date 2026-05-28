import { DUMMY_REFERENCE_POINT } from "@/shared/config/dummy-location";
import type { AssistantPlaceSelection } from "@/features/assistant-chat/model/types";
import { haversineKm } from "@/lib/public-data/distance";
import { loadWalkCourses } from "./load-walk-courses";
import type { WalkCourse, WalkCourseCategory } from "./types";

const PLACE_CHIP_TO_CATEGORY: Record<string, WalkCourseCategory> = {
  river: "river",
  park: "park",
  mountain: "mountain",
  urban: "urban",
  lake: "lake",
};

export type RecommendWalkCoursesInput = {
  selectionPlaces?: AssistantPlaceSelection[];
  durationMin?: number | null;
  referencePoint?: { lat: number; lng: number; label?: string };
  limit?: number;
};

export type ScoredWalkCourse = {
  course: WalkCourse;
  distanceFromUserKm: number | null;
  durationDiff: number;
};

function withDistance(
  course: WalkCourse,
  reference: { lat: number; lng: number },
): number | null {
  if (course.lat == null || course.lng == null) return null;
  return haversineKm(reference, { lat: course.lat, lng: course.lng });
}

function matchesCategory(
  course: WalkCourse,
  wanted: WalkCourseCategory[],
): boolean {
  if (wanted.length === 0) return true;
  return wanted.some((c) => course.categories.includes(c));
}

function durationScore(course: WalkCourse, targetMin: number | null): number {
  if (targetMin == null) return 0;
  if (course.durationMin == null) return 9999;
  return Math.abs(course.durationMin - targetMin);
}

export function parsePlaceChips(places?: string): AssistantPlaceSelection[] {
  if (!places?.trim()) return [];
  return places
    .split(",")
    .map((p) => p.trim())
    .filter((p): p is AssistantPlaceSelection =>
      ["river", "park", "mountain", "urban", "lake"].includes(p),
    );
}

export function parseDurationMin(duration?: string): number | null {
  if (!duration?.trim()) return null;
  const n = parseInt(duration, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** CSV 산책 코스 필터·정렬 (어시스턴트·추천 API 공용) */
export async function recommendWalkCourses(
  input: RecommendWalkCoursesInput,
): Promise<ScoredWalkCourse[]> {
  const reference = input.referencePoint ?? DUMMY_REFERENCE_POINT;
  const limit = input.limit ?? 12;
  const courses = await loadWalkCourses();

  const wantedCategories =
    input.selectionPlaces?.map((p) => PLACE_CHIP_TO_CATEGORY[p]) ?? [];
  const targetMin = input.durationMin ?? null;

  let filtered = courses.filter((c) => matchesCategory(c, wantedCategories));

  if (targetMin != null) {
    const within = filtered.filter(
      (c) =>
        c.durationMin != null &&
        c.durationMin <= Math.max(targetMin * 1.5, targetMin + 20),
    );
    if (within.length >= 3) filtered = within;
  }

  if (filtered.length === 0) filtered = courses;

  const scored: ScoredWalkCourse[] = filtered.map((course) => ({
    course,
    distanceFromUserKm: withDistance(course, reference),
    durationDiff: durationScore(course, targetMin),
  }));

  scored.sort((a, b) => {
    if (targetMin != null && a.durationDiff !== b.durationDiff) {
      return a.durationDiff - b.durationDiff;
    }
    const ad = a.distanceFromUserKm ?? Number.POSITIVE_INFINITY;
    const bd = b.distanceFromUserKm ?? Number.POSITIVE_INFINITY;
    return ad - bd;
  });

  return scored.slice(0, limit);
}
