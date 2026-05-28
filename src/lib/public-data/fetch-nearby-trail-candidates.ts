import type { AssistantPlaceSelection } from "@/features/assistant-chat/model/types";
import type { CourseCandidate, LatLng } from "@/features/walk/model/types";
import { normalizeTourismTrail } from "@/lib/public-data/normalizers/normalize-trails";
import { supplementTrailCoordinatesBatch } from "@/lib/public-data/supplement-trail-coordinates";
import {
  distanceFromReference,
  durationDiff,
  fetchTourismTrailRecords,
  matchesTrailPlaces,
  trailToCourseCandidate,
} from "@/lib/public-data/trail-candidate-mapper";

function radiusKm(): number {
  const n = Number(process.env.PUBLIC_DATA_NEAR_RADIUS_KM ?? "40");
  return Number.isFinite(n) && n > 0 ? n : 40;
}

function shouldFetchTrails(places: AssistantPlaceSelection[]): boolean {
  if (!places.length) return true;
  return places.some(
    (place) =>
      place === "river" ||
      place === "mountain" ||
      place === "urban" ||
      place === "lake",
  );
}

/** 공공데이터 전국길관광 → CourseCandidate (추천 목록용) */
export async function fetchNearbyTrailCandidates(input: {
  reference: LatLng & { label?: string };
  selectionPlaces?: AssistantPlaceSelection[];
  durationMin?: number | null;
  limit?: number;
}): Promise<CourseCandidate[]> {
  const places = input.selectionPlaces ?? [];
  if (!shouldFetchTrails(places)) return [];

  let rawItems;
  try {
    rawItems = await fetchTourismTrailRecords();
  } catch (e) {
    console.error("[fetch-nearby-trail-candidates]", e);
    return [];
  }

  if (!rawItems.length) return [];

  const normalized = rawItems
    .map((row) => normalizeTourismTrail(row))
    .filter((trail): trail is NonNullable<typeof trail> => trail != null)
    .filter((trail) => matchesTrailPlaces(trail, places));

  const targetMin = input.durationMin ?? null;
  let filtered = normalized;

  if (targetMin != null) {
    const within = filtered.filter(
      (trail) =>
        trail.durationMin != null &&
        trail.durationMin <= Math.max(targetMin * 1.5, targetMin + 20),
    );
    if (within.length >= 3) filtered = within;
  }

  filtered.sort((a, b) => {
    const diff = durationDiff(a, targetMin) - durationDiff(b, targetMin);
    if (diff !== 0) return diff;
    return a.title.localeCompare(b.title, "ko");
  });

  const geocodeLimit = Number(process.env.PUBLIC_DATA_TRAIL_GEOCODE_LIMIT ?? "16");
  const enriched = await supplementTrailCoordinatesBatch(
    filtered,
    Number.isFinite(geocodeLimit) ? geocodeLimit : 16,
  );

  const withBothEndpoints = enriched.filter(
    (trail) => trail.start?.position && trail.end?.position,
  );

  const near = withBothEndpoints
    .map((trail) => ({
      trail,
      km: distanceFromReference(trail, input.reference),
    }))
    .filter(
      (item): item is { trail: (typeof enriched)[number]; km: number } =>
        item.km != null && item.km <= radiusKm(),
    )
    .sort((a, b) => a.km - b.km);

  const limit = input.limit ?? 8;
  return near
    .slice(0, limit)
    .map(({ trail, km }) => trailToCourseCandidate(trail, km))
    .filter((candidate): candidate is CourseCandidate => candidate != null);
}
