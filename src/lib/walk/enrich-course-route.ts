import type { CourseCandidate, LatLng } from "@/features/walk/model/types";

const KM_PER_DEG_LAT = 111.32;

function deg2rad(d: number) {
  return (d * Math.PI) / 180;
}

function hashSeed(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i += 1) {
    h = (h * 31 + input.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/** 기준점에서 방위각·거리(km)만큼 이동한 좌표 */
export function offsetPoint(
  origin: LatLng,
  bearingDeg: number,
  distanceKm: number,
): LatLng {
  const bearing = deg2rad(bearingDeg);
  const latRad = deg2rad(origin.lat);
  const dLat = (distanceKm / KM_PER_DEG_LAT) * Math.cos(bearing);
  const dLng =
    (distanceKm / (KM_PER_DEG_LAT * Math.cos(latRad))) * Math.sin(bearing);
  return {
    lat: origin.lat + dLat,
    lng: origin.lng + dLng,
  };
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function interpolatePath(from: LatLng, to: LatLng, segments: number): LatLng[] {
  const points: LatLng[] = [];
  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments;
    points.push({
      lat: lerp(from.lat, to.lat, t),
      lng: lerp(from.lng, to.lng, t),
    });
  }
  return points;
}

/** COURS_DC 경유지 텍스트 → 라벨 목록 */
export function parseWaypointLabels(waypoints: string): string[] {
  if (!waypoints.trim()) return [];
  return waypoints
    .split(/[~⇒→>·]|(?:\s*-\s*)|(?:\s*~\s*)/)
    .map((part) =>
      part
        .replace(/\(\d+(?:\.\d+)?\s*(?:km|㎞|KM)\)/gi, "")
        .replace(/\d+(?:\.\d+)?\s*(?:km|㎞|KM)/gi, "")
        .trim(),
    )
    .filter((label) => label.length >= 2);
}

function loopRadiusKm(distanceKm?: number | null): number {
  const km = distanceKm != null && distanceKm > 0 ? distanceKm : 1.2;
  return Math.max(km / (2 * Math.PI), 0.12);
}

function isLoopTrail(waypoints: string): boolean {
  const labels = parseWaypointLabels(waypoints);
  if (labels.length < 2) return true;
  const normalize = (value: string) => value.replace(/\s/g, "");
  const first = normalize(labels[0]);
  const last = normalize(labels[labels.length - 1]);
  if (!first || !last) return true;
  return (
    first === last ||
    last.includes(first.slice(0, Math.min(4, first.length))) ||
    first.includes(last.slice(0, Math.min(4, last.length)))
  );
}

/** 순환 아닌 코스: 중심 → 종료 방향 직선(거리 반영) */
export function generateOpenPath(
  center: LatLng,
  distanceKm?: number | null,
  seed = 0,
): LatLng[] {
  const lengthKm = Math.max(distanceKm ?? 1.2, 0.3);
  const bearing = (seed % 360) + 20;
  const end = offsetPoint(center, bearing, lengthKm);
  return interpolatePath(center, end, 10);
}

/** 코스 중심을 기준으로 순환 산책 경로(타원) 생성 */
export function generateLoopPath(
  center: LatLng,
  distanceKm?: number | null,
  seed = 0,
): LatLng[] {
  const radiusKm = loopRadiusKm(distanceKm);
  const startAngle = (seed % 360) + 15;
  const segments = 8 + (seed % 5);
  const points: LatLng[] = [];

  for (let i = 0; i <= segments; i += 1) {
    const angle = startAngle + (360 * i) / segments;
    const stretch = 0.85 + ((seed + i) % 4) * 0.05;
    points.push(offsetPoint(center, angle, radiusKm * stretch));
  }

  return points;
}

type EnrichCourseRouteInput = {
  reference: LatLng & { label?: string };
  waypoints?: string;
  distanceKm?: number | null;
};

/** center만 있는 후보에 start/end/path 보강 */
export function enrichCourseRoute(
  candidate: CourseCandidate,
  input: EnrichCourseRouteInput,
): CourseCandidate {
  if (candidate.path && candidate.path.length >= 2) {
    return candidate;
  }

  const { reference } = input;
  const hasEndpoints =
    typeof candidate.start?.lat === "number" &&
    typeof candidate.start?.lng === "number" &&
    typeof candidate.end?.lat === "number" &&
    typeof candidate.end?.lng === "number";

  if (hasEndpoints) {
    const start = {
      lat: candidate.start!.lat!,
      lng: candidate.start!.lng!,
    };
    const end = {
      lat: candidate.end!.lat!,
      lng: candidate.end!.lng!,
    };
    const path = interpolatePath(start, end, 8);

    return {
      ...candidate,
      path,
      center: {
        lat: (start.lat + end.lat) / 2,
        lng: (start.lng + end.lng) / 2,
      },
    };
  }

  const waypointLabels = parseWaypointLabels(input.waypoints ?? "");
  const seed = hashSeed(candidate.id);
  const isParkLike =
    candidate.source === "public_park" ||
    (candidate.source === "kakao_local" && !input.waypoints);

  if (isParkLike) {
    const dest = candidate.center;
    const refFar =
      haversineKm(reference, dest) > 0.05
        ? reference
        : offsetPoint(dest, 225, 0.4);
    const path = interpolatePath(refFar, dest, 6);

    return {
      ...candidate,
      start: {
        name: input.reference.label?.trim() || "내 위치",
        lat: refFar.lat,
        lng: refFar.lng,
      },
      end: {
        name: candidate.start?.name ?? candidate.title,
        lat: dest.lat,
        lng: dest.lng,
      },
      path,
      center: {
        lat: (refFar.lat + dest.lat) / 2,
        lng: (refFar.lng + dest.lng) / 2,
      },
    };
  }

  const distanceKm = input.distanceKm ?? candidate.distanceKm;
  const loopTrail = isLoopTrail(input.waypoints ?? "");
  const path = loopTrail
    ? generateLoopPath(candidate.center, distanceKm, seed)
    : generateOpenPath(candidate.center, distanceKm, seed);
  const startLabel = waypointLabels[0] ?? candidate.start?.name ?? candidate.title;
  const endLabel =
    waypointLabels[waypointLabels.length - 1] ??
    waypointLabels[1] ??
    "종료 지점";

  if (loopTrail) {
    const midIndex = Math.floor(path.length / 2);
    return {
      ...candidate,
      start: {
        name: startLabel,
        lat: path[0].lat,
        lng: path[0].lng,
      },
      end: {
        name: endLabel,
        lat: path[midIndex].lat,
        lng: path[midIndex].lng,
      },
      path,
    };
  }

  const pathEnd = path[path.length - 1];
  return {
    ...candidate,
    start: {
      name: startLabel,
      lat: path[0].lat,
      lng: path[0].lng,
    },
    end: {
      name: endLabel,
      lat: pathEnd.lat,
      lng: pathEnd.lng,
    },
    path,
    center: {
      lat: (path[0].lat + pathEnd.lat) / 2,
      lng: (path[0].lng + pathEnd.lng) / 2,
    },
  };
}

function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const dLat = deg2rad(b.lat - a.lat);
  const dLng = deg2rad(b.lng - a.lng);
  const lat1 = deg2rad(a.lat);
  const lat2 = deg2rad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}
