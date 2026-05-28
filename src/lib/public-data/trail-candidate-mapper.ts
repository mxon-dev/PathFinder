import type { AssistantPlaceSelection } from "@/features/assistant-chat/model/types";
import type { CourseCandidate } from "@/features/walk/model/types";
import { haversineKm } from "@/lib/public-data/distance";
import type { NormalizedWalkCandidate } from "@/lib/public-data/public-data-types";
import {
  assertPublicDataHeader,
  requestPublicDataJson,
} from "@/lib/public-data/public-data-client";
import {
  type StandardListEnvelope,
  toItemArray,
} from "@/lib/public-data/public-data-envelope";

type RawRecord = Record<string, unknown>;

export const DEFAULT_TRAIL_ENDPOINT =
  "https://api.data.go.kr/openapi/tn_pubr_public_stret_tursm_info_api";

function trailFormatParamKey(): "type" | "_type" {
  return process.env.PUBLIC_DATA_TRAIL_RESPONSE_FORMAT_PARAM === "_type"
    ? "_type"
    : "type";
}

function pageSize(): number {
  const n = Number(process.env.PUBLIC_DATA_TRAIL_PAGE_SIZE ?? "200");
  return Number.isFinite(n) && n > 0 ? Math.min(n, 500) : 200;
}

/** 전국길관광정보표준데이터 openapi 목록 조회 */
export async function fetchTourismTrailRecords(): Promise<RawRecord[]> {
  const key = process.env.PUBLIC_DATA_SERVICE_KEY?.trim();
  if (!key) return [];

  const endpoint =
    process.env.PUBLIC_DATA_TRAIL_ENDPOINT?.trim() ?? DEFAULT_TRAIL_ENDPOINT;

  const data = await requestPublicDataJson<StandardListEnvelope<RawRecord>>({
    endpoint,
    pageNo: 1,
    numOfRows: pageSize(),
    formatParamKey: trailFormatParamKey(),
  });

  await assertPublicDataHeader(data);
  return toItemArray(data.response?.body?.items?.item);
}

export function matchesTrailPlaces(
  trail: NormalizedWalkCandidate,
  places: AssistantPlaceSelection[],
): boolean {
  if (!places.length) return true;

  const wanted = new Set<string>();
  for (const place of places) {
    if (place === "urban") wanted.add("city");
    else wanted.add(place);
  }

  return trail.categories.some((category) => wanted.has(category));
}

export function durationDiff(
  trail: NormalizedWalkCandidate,
  targetMin: number | null,
): number {
  if (targetMin == null) return 0;
  if (trail.durationMin == null) return 9999;
  return Math.abs(trail.durationMin - targetMin);
}

export function distanceFromReference(
  trail: NormalizedWalkCandidate,
  reference: { lat: number; lng: number },
): number | null {
  const point =
    trail.start?.position ?? trail.center ?? trail.end?.position ?? null;
  if (!point) return null;
  return haversineKm(reference, point);
}

export function trailToCourseCandidate(
  trail: NormalizedWalkCandidate,
  distanceFromUserKm?: number | null,
): CourseCandidate | null {
  const startPos = trail.start?.position;
  const endPos = trail.end?.position;
  if (!startPos || !endPos) return null;

  const path = Array.from({ length: 9 }, (_, i) => {
    const t = i / 8;
    return {
      lat: startPos.lat + (endPos.lat - startPos.lat) * t,
      lng: startPos.lng + (endPos.lng - startPos.lng) * t,
    };
  });

  const center = {
    lat: (startPos.lat + endPos.lat) / 2,
    lng: (startPos.lng + endPos.lng) / 2,
  };

  const routeText =
    typeof trail.raw?.routeText === "string" ? trail.raw.routeText : "";

  return {
    id: trail.id,
    title: trail.title,
    category: trail.categories,
    source: "public_trail",
    center,
    start: {
      name: trail.start?.name ?? trail.start?.address ?? trail.title,
      lat: startPos.lat,
      lng: startPos.lng,
    },
    end: {
      name: trail.end?.name ?? trail.end?.address ?? "종료 지점",
      lat: endPos.lat,
      lng: endPos.lng,
    },
    path,
    distanceKm: trail.distanceKm,
    durationMin: trail.durationMin,
    description: [
      trail.description,
      trail.managementAgency,
      distanceFromUserKm != null
        ? `기준 위치에서 약 ${distanceFromUserKm.toFixed(1)}km`
        : null,
      routeText ? `경로: ${routeText.slice(0, 80)}` : null,
    ]
      .filter(Boolean)
      .join(" · ")
      .slice(0, 220),
  };
}
