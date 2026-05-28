import { searchAddress } from "@/lib/kakao/kakao-local-client";
import type { LatLng, NormalizedWalkCandidate } from "./public-data-types";
import { isValidKoreaCoordinate } from "./validators/validate-coordinate";

const geocodeCache = new Map<string, LatLng | null>();

async function geocodeAddress(query: string): Promise<LatLng | null> {
  const key = query.trim();
  if (!key) return null;
  if (geocodeCache.has(key)) return geocodeCache.get(key) ?? null;

  try {
    const data = await searchAddress({ query: key, size: 1 });
    const doc = data.documents?.[0];
    if (!doc) {
      geocodeCache.set(key, null);
      return null;
    }

    const lat = Number(doc.y);
    const lng = Number(doc.x);
    const position = { lat, lng };
    if (!isValidKoreaCoordinate(position)) {
      geocodeCache.set(key, null);
      return null;
    }

    geocodeCache.set(key, position);
    return position;
  } catch {
    geocodeCache.set(key, null);
    return null;
  }
}

/** 시작·종료 주소 → Kakao 주소 검색으로 좌표 보강 (요청 단위 캐시, 영구 저장 없음) */
export async function supplementTrailCoordinates(
  trail: NormalizedWalkCandidate,
): Promise<NormalizedWalkCandidate | null> {
  let startPos = trail.start?.position;
  let endPos = trail.end?.position;

  if (!startPos && trail.start?.address) {
    startPos = (await geocodeAddress(trail.start.address)) ?? undefined;
  }

  if (!endPos && trail.end?.address) {
    endPos = (await geocodeAddress(trail.end.address)) ?? undefined;
  }

  if (!startPos && !endPos) return null;

  const center =
    startPos && endPos
      ? { lat: (startPos.lat + endPos.lat) / 2, lng: (startPos.lng + endPos.lng) / 2 }
      : startPos ?? endPos;

  return {
    ...trail,
    center,
    start: trail.start
      ? { ...trail.start, position: startPos ?? trail.start.position }
      : startPos
        ? { position: startPos }
        : undefined,
    end: trail.end
      ? { ...trail.end, position: endPos ?? trail.end.position }
      : endPos
        ? { position: endPos }
        : undefined,
  };
}

export async function supplementTrailCoordinatesBatch(
  trails: NormalizedWalkCandidate[],
  limit: number,
): Promise<NormalizedWalkCandidate[]> {
  const out: NormalizedWalkCandidate[] = [];
  for (const trail of trails.slice(0, limit)) {
    const enriched = await supplementTrailCoordinates(trail);
    if (enriched?.center) out.push(enriched);
  }
  return out;
}
