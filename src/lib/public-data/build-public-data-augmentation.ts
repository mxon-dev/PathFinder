import { DUMMY_REFERENCE_POINT } from "@/shared/config/dummy-location";
import type { AssistantPlaceSelection } from "@/features/assistant-chat/model/types";
import { haversineKm } from "./distance";
import { fetchNearbyTrailCandidates } from "./fetch-nearby-trail-candidates";
import {
  assertPublicDataHeader,
  requestPublicDataJson,
} from "./public-data-client";
import {
  extractPublicDataItems,
  type StandardListEnvelope,
} from "./public-data-envelope";
import { normalizeTourismTrail } from "./normalizers/normalize-trails";
import {
  DEFAULT_TRAIL_ENDPOINT,
  fetchTourismTrailRecords,
  matchesTrailPlaces,
} from "./trail-candidate-mapper";
import { resolvePublicDataIntent } from "./resolve-public-data-intent";

type RawRecord = Record<string, unknown>;

const DEFAULT_PARK_ENDPOINT =
  "https://api.data.go.kr/openapi/tn_pubr_public_cty_park_info_api";

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

function parkLat(it: RawRecord) {
  return parseCoord(
    it["위도"] ?? it["latitude"] ?? it["LATITUDE"] ?? it["lat"] ?? it["posx"],
  );
}

function parkLng(it: RawRecord) {
  return parseCoord(
    it["경도"] ?? it["longitude"] ?? it["LONGITUDE"] ?? it["lng"] ?? it["posy"],
  );
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

function prefersRiverHint(places?: AssistantPlaceSelection[]): boolean {
  return places?.includes("river") ?? false;
}

function rowHintsRiver(title: string, addr: string): boolean {
  return RIVER_HINT_RE.test(`${title} ${addr}`);
}

async function buildUrbanParkAugmentationLines(options: {
  selectionPlaces?: AssistantPlaceSelection[];
  preamble?: string[];
}): Promise<string[]> {
  const endpoint =
    process.env.PUBLIC_DATA_PARK_ENDPOINT?.trim() ?? DEFAULT_PARK_ENDPOINT;
  const data = await requestPublicDataJson<StandardListEnvelope<RawRecord>>({
    endpoint,
    pageNo: 1,
    numOfRows: pageSize(),
    formatParamKey: formatParamKey(),
  });

  await assertPublicDataHeader(data);
  const rawItems = extractPublicDataItems(data.response?.body?.items);

  const enriched = rawItems.map((it) => {
    const title = parkTitle(it);
    const lat = parkLat(it);
    const lng = parkLng(it);
    const km =
      title && lat != null && lng != null
        ? haversineKm(DUMMY_REFERENCE_POINT, { lat, lng })
        : undefined;
    const addr = String(
      it["소재지도로명주소"] ??
        it["rdnmadr"] ??
        it["address"] ??
        it["소재지지번주소"] ??
        "",
    ).trim();
    const agency = String(it["관리기관명"] ?? it["institutionNm"] ?? "").trim();
    return { title, lat, lng, km, addr, agency };
  });

  const withDist = enriched.filter(
    (x): x is (typeof enriched)[number] & { km: number } =>
      Boolean(x.title) && x.km !== undefined,
  );
  let near = withDist
    .filter((x) => x.km <= radiusKm())
    .sort((a, b) => a.km - b.km);

  const riverPref = prefersRiverHint(options.selectionPlaces);
  if (riverPref && near.length > 0) {
    const riverFirst = near.filter((x) => rowHintsRiver(x.title, x.addr));
    if (riverFirst.length >= 2) near = riverFirst;
  }

  const pickNear = near.slice(0, 12);
  const fallback = enriched.filter((x) => x.title).slice(0, 8);

  const lines =
    pickNear.length > 0
      ? pickNear.map(
          (x, i) =>
            `${i + 1}. ${x.title} — 약 ${x.km.toFixed(1)}km (${DUMMY_REFERENCE_POINT.label})${x.addr ? ` / ${x.addr}` : ""}${x.agency ? ` / ${x.agency}` : ""}`,
        )
      : fallback.map(
          (x, i) =>
            `${i + 1}. ${x.title}${x.addr ? ` — ${x.addr}` : ""}${x.agency ? ` (${x.agency})` : ""}`,
        );

  const headerCore = `전국 도시공원 오픈API 일부 목록. 수신 ${rawItems.length}건, 좌표 있으면 반경 ${radiusKm()}km 필터${riverPref ? ", 강 의도 시 이름·주소에 물가 관련 단서가 있는 곳 우선" : ""}.`;

  return [
    "[공공데이터 참고 텍스트 — 원문과 다를 수 있으니 과장·단정 금지]",
    ...(options.preamble ?? []),
    headerCore,
    `기준점(더미): ${DUMMY_REFERENCE_POINT.label} (${DUMMY_REFERENCE_POINT.lat.toFixed(5)}, ${DUMMY_REFERENCE_POINT.lng.toFixed(5)})`,
    ...lines,
  ];
}

async function buildTourismTrailAugmentationLines(options: {
  selectionPlaces?: AssistantPlaceSelection[];
}): Promise<string[]> {
  const rawItems = await fetchTourismTrailRecords();
  const normalized = rawItems
    .map((row) => normalizeTourismTrail(row))
    .filter((trail): trail is NonNullable<typeof trail> => trail != null)
    .filter((trail) => matchesTrailPlaces(trail, options.selectionPlaces ?? []));

  const nearby = await fetchNearbyTrailCandidates({
    reference: DUMMY_REFERENCE_POINT,
    selectionPlaces: options.selectionPlaces,
    limit: 12,
  });

  const lines =
    nearby.length > 0
      ? nearby.map((trail, i) => {
          const bits = [
            trail.distanceKm != null ? `${trail.distanceKm}km` : null,
            trail.durationMin != null ? `약 ${trail.durationMin}분` : null,
            trail.start?.name ? `시작 ${trail.start.name}` : null,
            trail.end?.name ? `종료 ${trail.end.name}` : null,
          ].filter(Boolean);
          return `${i + 1}. ${trail.title}${bits.length ? ` — ${bits.join(", ")}` : ""}`;
        })
      : normalized.slice(0, 12).map((trail, i) => {
          const bits = [
            trail.distanceKm != null ? `${trail.distanceKm}km` : null,
            trail.durationMin != null ? `${trail.durationMin}분` : null,
            trail.start?.name ? `시작 ${trail.start.name}` : null,
            trail.start?.address ? trail.start.address : null,
          ].filter(Boolean);
          return `${i + 1}. ${trail.title}${bits.length ? ` — ${bits.join(", ")}` : ""}`;
        });

  const endpoint =
    process.env.PUBLIC_DATA_TRAIL_ENDPOINT?.trim() ?? DEFAULT_TRAIL_ENDPOINT;

  return [
    "[공공데이터 — 전국길관광정보표준데이터, 출처 원문이라 단정·과장 금지]",
    `길·산책로 openapi (${endpoint}) 조회 ${rawItems.length}건, 장소 칩 필터 후 ${normalized.length}건.`,
    nearby.length
      ? `기준점 ${DUMMY_REFERENCE_POINT.label} 반경 ${radiusKm()}km 내 좌표 보강 후 ${nearby.length}건.`
      : "좌표 보강 실패 시 텍스트 정보만 참고.",
    `기준점: ${DUMMY_REFERENCE_POINT.label} (${DUMMY_REFERENCE_POINT.lat.toFixed(5)}, ${DUMMY_REFERENCE_POINT.lng.toFixed(5)})`,
    ...lines,
  ];
}

/** Gemini systemInstruction에 붙일 공공데이터 요약 (실패 시에도 짧은 안내) */
export async function buildPublicDataAugmentationBlock(
  lastUserMessage: string,
  selectionPlaces?: AssistantPlaceSelection[],
): Promise<string> {
  const intent = resolvePublicDataIntent(lastUserMessage, selectionPlaces);
  if (!intent) return "";

  const key = process.env.PUBLIC_DATA_SERVICE_KEY?.trim();
  if (!key) {
    return [
      "[공공데이터]",
      "서버에 PUBLIC_DATA_SERVICE_KEY가 없어 오픈API를 호출하지 않았습니다.",
      "사용자에게 data.go.kr에서 발급 후 .env.local에 넣도록 안내할 수 있습니다.",
    ].join(" ");
  }

  try {
    if (intent === "urbanPark") {
      const lines = await buildUrbanParkAugmentationLines({
        selectionPlaces,
      });
      return lines.join("\n");
    }

    try {
      const lines = await buildTourismTrailAugmentationLines({
        selectionPlaces,
      });
      return lines.join("\n");
    } catch (trailError) {
      const msg =
        trailError instanceof Error
          ? trailError.message.slice(0, 200)
          : String(trailError);
      const preamble = [
        `[안내] 전국길관광 openapi 호출 실패(${msg}).`,
        "포털에서 '전국길관광정보표준데이터' openapi 활용신청 및 PUBLIC_DATA_TRAIL_ENDPOINT 확인 필요.",
        "아래는 도시공원 목록으로 대체한 참고 자료입니다.",
      ];
      const lines = await buildUrbanParkAugmentationLines({
        selectionPlaces,
        preamble,
      });
      return lines.join("\n");
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message.slice(0, 400) : String(e);
    return [
      "[공공데이터]",
      "오픈API 호출에 실패했습니다. 사용자에게 잠시 후 재시도하거나 포털 키·엔드포인트 설정을 확인하라고 안내하세요.",
      `세부: ${msg}`,
    ].join(" ");
  }
}
