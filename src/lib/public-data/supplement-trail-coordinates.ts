import { searchAddress, searchKeyword } from "@/lib/kakao/kakao-local-client";
import type { LatLng, NormalizedWalkCandidate } from "./public-data-types";
import {
  parseTrailRouteWaypoints,
  regionHintFromAddress,
} from "./parse-trail-route-waypoints";
import { isValidKoreaCoordinate } from "./validators/validate-coordinate";

const geocodeCache = new Map<string, LatLng | null>();

function cacheKey(kind: "addr" | "kw", query: string): string {
  return `${kind}:${query.trim()}`;
}

function waypointLimit(): number {
  const n = Number(process.env.PUBLIC_DATA_TRAIL_WAYPOINT_LIMIT ?? "12");
  return Number.isFinite(n) && n > 0 ? Math.min(n, 16) : 12;
}

function labelsMatch(a: string, b?: string): boolean {
  if (!b?.trim()) return false;
  const na = a.replace(/\s/g, "");
  const nb = b.replace(/\s/g, "");
  return na === nb || na.includes(nb) || nb.includes(na);
}

function dedupeNearbyWaypoints(
  points: { name: string; position: LatLng }[],
  minMeters = 40,
): { name: string; position: LatLng }[] {
  if (points.length <= 1) return points;
  const out: { name: string; position: LatLng }[] = [points[0]];
  for (let i = 1; i < points.length; i += 1) {
    const prev = out[out.length - 1].position;
    const cur = points[i].position;
    const dLat = (cur.lat - prev.lat) * 111_320;
    const dLng =
      (cur.lng - prev.lng) * 111_320 * Math.cos((prev.lat * Math.PI) / 180);
    const dist = Math.hypot(dLat, dLng);
    if (dist >= minMeters) out.push(points[i]);
  }
  return out;
}

async function geocodeAddress(query: string): Promise<LatLng | null> {
  const key = cacheKey("addr", query);
  if (geocodeCache.has(key)) return geocodeCache.get(key) ?? null;

  try {
    const data = await searchAddress({ query, size: 1 });
    const doc = data.documents?.[0];
    if (!doc) {
      geocodeCache.set(key, null);
      return null;
    }
    const position = { lat: Number(doc.y), lng: Number(doc.x) };
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

async function geocodeWaypoint(
  label: string,
  near: LatLng,
  regionHint?: string,
): Promise<LatLng | null> {
  const keywordQuery = regionHint ? `${regionHint} ${label}` : label;
  const key = cacheKey(
    "kw",
    `${keywordQuery}|${near.lat.toFixed(3)}|${near.lng.toFixed(3)}`,
  );
  if (geocodeCache.has(key)) return geocodeCache.get(key) ?? null;

  try {
    const data = await searchKeyword({
      query: keywordQuery,
      lat: near.lat,
      lng: near.lng,
      radius: 20_000,
      size: 1,
      sort: "distance",
    });
    const doc = data.documents?.[0];
    if (doc) {
      const position = { lat: Number(doc.y), lng: Number(doc.x) };
      if (isValidKoreaCoordinate(position)) {
        geocodeCache.set(key, position);
        return position;
      }
    }
  } catch {
    // keyword 실패 시 address 폴백
  }

  const addressPos = await geocodeAddress(keywordQuery);
  geocodeCache.set(key, addressPos);
  return addressPos;
}

async function buildPathFromRouteText(
  trail: NormalizedWalkCandidate,
): Promise<{ name: string; position: LatLng }[]> {
  const routeText =
    typeof trail.raw?.routeText === "string" ? trail.raw.routeText : "";
  const labels = parseTrailRouteWaypoints(routeText).slice(0, waypointLimit());
  if (labels.length < 2) return [];

  const startPos = trail.start?.position;
  const endPos = trail.end?.position;
  const near = startPos ?? trail.center ?? endPos;
  if (!near) return [];

  const region = regionHintFromAddress(
    trail.start?.address ?? trail.end?.address,
  );

  const waypoints: { name: string; position: LatLng }[] = [];
  for (let i = 0; i < labels.length; i += 1) {
    const label = labels[i];
    const isFirst = i === 0;
    const isLast = i === labels.length - 1;
    let pos: LatLng | null = null;

    if (isFirst && startPos) {
      pos = startPos;
    } else if (isLast && endPos) {
      pos = endPos;
    } else if (isFirst && labelsMatch(label, trail.start?.name)) {
      pos = startPos ?? (await geocodeWaypoint(label, near, region));
    } else if (isLast && labelsMatch(label, trail.end?.name)) {
      pos = endPos ?? (await geocodeWaypoint(label, near, region));
    } else {
      const anchor = waypoints[waypoints.length - 1]?.position ?? near;
      pos = await geocodeWaypoint(label, anchor, region);
    }

    if (pos) waypoints.push({ name: label, position: pos });
  }

  return dedupeNearbyWaypoints(waypoints);
}

type SupplementTrailOptions = {
  /** 지오코딩 검색 중심 (사용자 기준 위치 등) */
  near?: LatLng;
};

/** 시작·종료 주소 + 경로정보 경유지 Kakao geocode */
export async function supplementTrailCoordinates(
  trail: NormalizedWalkCandidate,
  options?: SupplementTrailOptions,
): Promise<NormalizedWalkCandidate | null> {
  const bias =
    options?.near ??
    trail.start?.position ??
    trail.center ??
    trail.end?.position;
  const region = regionHintFromAddress(
    trail.start?.address ?? trail.end?.address,
  );

  let startPos = trail.start?.position;
  let endPos = trail.end?.position;

  if (!startPos && trail.start?.address) {
    startPos = (await geocodeAddress(trail.start.address)) ?? undefined;
  }
  if (!startPos && trail.start?.name && bias) {
    startPos =
      (await geocodeWaypoint(trail.start.name, bias, region)) ?? undefined;
  }

  if (!endPos && trail.end?.address) {
    endPos = (await geocodeAddress(trail.end.address)) ?? undefined;
  }
  if (!endPos && trail.end?.name && bias) {
    const anchor = startPos ?? bias;
    endPos =
      (await geocodeWaypoint(trail.end.name, anchor, region)) ?? undefined;
  }

  const withEndpoints: NormalizedWalkCandidate = {
    ...trail,
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

  let pathWaypoints = await buildPathFromRouteText(withEndpoints);
  let path = pathWaypoints.map((w) => w.position);

  if (path.length < 2 && startPos && endPos) {
    path = [startPos, endPos];
    pathWaypoints = [
      {
        name: withEndpoints.start?.name ?? trail.title,
        position: startPos,
      },
      {
        name: withEndpoints.end?.name ?? "종료 지점",
        position: endPos,
      },
    ];
  }

  if (path.length < 2 && !startPos && !endPos) {
    return null;
  }

  const center =
    path.length >= 2
      ? {
          lat: path.reduce((s, p) => s + p.lat, 0) / path.length,
          lng: path.reduce((s, p) => s + p.lng, 0) / path.length,
        }
      : startPos && endPos
        ? {
            lat: (startPos.lat + endPos.lat) / 2,
            lng: (startPos.lng + endPos.lng) / 2,
          }
        : startPos ?? endPos;

  if (!center) return null;

  const pathStart = path[0] ?? startPos;
  const pathEnd = path[path.length - 1] ?? endPos;

  return {
    ...withEndpoints,
    center,
    path: path.length >= 2 ? path : undefined,
    pathWaypoints: pathWaypoints.length >= 2 ? pathWaypoints : undefined,
    start:
      pathStart && withEndpoints.start
        ? { ...withEndpoints.start, position: pathStart }
        : pathStart
          ? { name: withEndpoints.start?.name ?? trail.title, position: pathStart }
          : withEndpoints.start,
    end:
      pathEnd && withEndpoints.end
        ? { ...withEndpoints.end, position: pathEnd }
        : pathEnd
          ? {
              name: withEndpoints.end?.name ?? "종료 지점",
              position: pathEnd,
            }
          : withEndpoints.end,
  };
}

export async function supplementTrailCoordinatesBatch(
  trails: NormalizedWalkCandidate[],
  limit: number,
  options?: SupplementTrailOptions,
): Promise<NormalizedWalkCandidate[]> {
  const out: NormalizedWalkCandidate[] = [];
  for (const trail of trails.slice(0, limit)) {
    const enriched = await supplementTrailCoordinates(trail, options);
    if (enriched?.center) out.push(enriched);
  }
  return out;
}
