import type { AssistantPlaceSelection } from "@/features/assistant-chat/model/types";
import type { CourseCandidate, LatLng } from "@/features/walk/model/types";
import { normalizeTourismTrail } from "@/lib/public-data/normalizers/normalize-trails";
import type { NormalizedWalkCandidate } from "@/lib/public-data/public-data-types";
import { supplementTrailCoordinates } from "@/lib/public-data/supplement-trail-coordinates";
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

function maxGeocodeAttempts(): number {
  const n = Number(process.env.PUBLIC_DATA_TRAIL_GEOCODE_MAX_ATTEMPTS ?? "24");
  return Number.isFinite(n) && n > 0 ? Math.min(n, 40) : 24;
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

const SEOUL_METRO_BBOX = {
  minLat: 37.41,
  maxLat: 37.71,
  minLng: 126.76,
  maxLng: 127.18,
};

function isSeoulMetroReference(ref: LatLng): boolean {
  return (
    ref.lat >= SEOUL_METRO_BBOX.minLat &&
    ref.lat <= SEOUL_METRO_BBOX.maxLat &&
    ref.lng >= SEOUL_METRO_BBOX.minLng &&
    ref.lng <= SEOUL_METRO_BBOX.maxLng
  );
}

function trailLocationText(trail: NormalizedWalkCandidate): string {
  return [
    trail.start?.address,
    trail.end?.address,
    trail.start?.name,
    trail.end?.name,
    trail.managementAgency,
    trail.title,
  ]
    .filter(Boolean)
    .join(" ");
}

/** 기준 위치와 주소·이름 단서가 맞는 코스를 먼저 지오코딩 */
function regionPriorityScore(
  trail: NormalizedWalkCandidate,
  reference: LatLng & { label?: string },
): number {
  const text = trailLocationText(trail);
  const label = reference.label?.replace(/\s/g, "") ?? "";

  if (label.length >= 2 && text.replace(/\s/g, "").includes(label.slice(0, 2))) {
    return 0;
  }

  if (isSeoulMetroReference(reference)) {
    if (/서울|경기|인천|수도권/.test(text)) return 1;
    if (/부산|대구|광주|대전|울산|제주|전라|경상|충청|강원|제주/.test(text)) {
      return 60;
    }
  }

  return 30;
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
    const region =
      regionPriorityScore(a, input.reference) -
      regionPriorityScore(b, input.reference);
    if (region !== 0) return region;
    const diff = durationDiff(a, targetMin) - durationDiff(b, targetMin);
    if (diff !== 0) return diff;
    return a.title.localeCompare(b.title, "ko");
  });

  const resultLimit = input.limit ?? 8;
  const radius = radiusKm();
  const near: { trail: NormalizedWalkCandidate; km: number }[] = [];

  for (const trail of filtered.slice(0, maxGeocodeAttempts())) {
    const enriched = await supplementTrailCoordinates(trail, {
      near: input.reference,
    });
    if (!enriched?.start?.position || !enriched?.end?.position) continue;

    const km = distanceFromReference(enriched, input.reference);
    if (km == null || km > radius) continue;

    near.push({ trail: enriched, km });
    if (near.length >= resultLimit) break;
  }

  near.sort((a, b) => a.km - b.km);

  return near
    .map(({ trail, km }) => trailToCourseCandidate(trail, km))
    .filter((candidate): candidate is CourseCandidate => candidate != null);
}
