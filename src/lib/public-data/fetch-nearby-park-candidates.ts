import type { AssistantPlaceSelection } from "@/features/assistant-chat/model/types";
import type { CourseCandidate, LatLng } from "@/features/walk/model/types";
import { haversineKm } from "@/lib/public-data/distance";
import {
  assertPublicDataHeader,
  requestPublicDataJson,
} from "@/lib/public-data/public-data-client";
import {
  type StandardListEnvelope,
  toItemArray,
} from "@/lib/public-data/public-data-envelope";

type RawRecord = Record<string, unknown>;

const DEFAULT_PARK_ENDPOINT =
  "http://apis.data.go.kr/1613000/UrbparkInfosService/getPbParkInfoList";

const RIVER_HINT_RE = /강|천|수변|한강|하천|탄천|개울|워터|해안|수목/i;

function parseCoord(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number.parseFloat(v.replace(/,/g, ""));
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

function parkTitle(it: RawRecord): string {
  return String(
    it["공원명"] ?? it["parkTitle"] ?? it["dataTitle"] ?? it["parkNm"] ?? "",
  ).trim();
}

function parkId(it: RawRecord, title: string): string {
  const raw =
    it["관리번호"] ?? it["mngNo"] ?? it["parkId"] ?? it["dataId"] ?? title;
  return `park-${String(raw).trim().replace(/\s+/g, "-")}`;
}

function formatParamKey(): "type" | "_type" {
  return process.env.PUBLIC_DATA_RESPONSE_FORMAT_PARAM === "_type"
    ? "_type"
    : "type";
}

function radiusKm(): number {
  const n = Number(process.env.PUBLIC_DATA_NEAR_RADIUS_KM ?? "40");
  return Number.isFinite(n) && n > 0 ? n : 40;
}

function pageSize(): number {
  const n = Number(process.env.PUBLIC_DATA_PAGE_SIZE ?? "120");
  return Number.isFinite(n) && n > 0 ? Math.min(n, 500) : 120;
}

function shouldFetchParks(places: AssistantPlaceSelection[]): boolean {
  if (!places.length) return true;
  return places.some((p) => p === "park" || p === "river" || p === "lake");
}

/** 공공데이터 도시공원 → CourseCandidate (추천 목록용) */
export async function fetchNearbyParkCandidates(input: {
  reference: LatLng & { label?: string };
  selectionPlaces?: AssistantPlaceSelection[];
  limit?: number;
}): Promise<CourseCandidate[]> {
  const key = process.env.PUBLIC_DATA_SERVICE_KEY?.trim();
  if (!key) return [];

  const places = input.selectionPlaces ?? [];
  if (!shouldFetchParks(places)) return [];

  const endpoint =
    process.env.PUBLIC_DATA_PARK_ENDPOINT?.trim() ?? DEFAULT_PARK_ENDPOINT;

  let data: StandardListEnvelope<RawRecord>;
  try {
    data = await requestPublicDataJson<StandardListEnvelope<RawRecord>>({
      endpoint,
      pageNo: 1,
      numOfRows: pageSize(),
      formatParamKey: formatParamKey(),
    });
    await assertPublicDataHeader(data);
  } catch {
    return [];
  }

  const rawItems = toItemArray(data.response?.body?.items?.item);
  const riverPref = places.includes("river");

  const enriched = rawItems
    .map((it) => {
      const title = parkTitle(it);
      const lat = parseCoord(
        it["위도"] ?? it["latitude"] ?? it["LATITUDE"] ?? it["lat"] ?? it["posx"],
      );
      const lng = parseCoord(
        it["경도"] ?? it["longitude"] ?? it["LONGITUDE"] ?? it["lng"] ?? it["posy"],
      );
      if (!title || lat == null || lng == null) return null;

      const addr = String(
        it["소재지도로명주소"] ??
          it["rdnmadr"] ??
          it["address"] ??
          it["소재지지번주소"] ??
          "",
      ).trim();
      const agency = String(it["관리기관명"] ?? it["institutionNm"] ?? "").trim();
      const km = haversineKm(input.reference, { lat, lng });

      return { title, lat, lng, addr, agency, km, id: parkId(it, title) };
    })
    .filter((x): x is NonNullable<typeof x> => x != null)
    .filter((x) => x.km <= radiusKm());

  let near = enriched.sort((a, b) => a.km - b.km);
  if (riverPref) {
    const riverFirst = near.filter((x) => RIVER_HINT_RE.test(`${x.title} ${x.addr}`));
    if (riverFirst.length >= 2) near = riverFirst;
  }

  const limit = input.limit ?? 8;
  return near.slice(0, limit).map((x) => ({
    id: x.id,
    title: x.title,
    category:
      riverPref && RIVER_HINT_RE.test(`${x.title} ${x.addr}`)
        ? ["river", "park"]
        : ["park"],
    source: "public_park" as const,
    center: { lat: x.lat, lng: x.lng },
    start: {
      name: x.addr || x.title,
      lat: x.lat,
      lng: x.lng,
    },
    description: [
      x.addr,
      x.agency,
      `기준 위치에서 약 ${x.km.toFixed(1)}km`,
    ]
      .filter(Boolean)
      .join(" · ")
      .slice(0, 220),
  }));
}
