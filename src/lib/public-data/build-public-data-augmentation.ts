import { DUMMY_REFERENCE_POINT } from "@/shared/config/dummy-location";
import type { AssistantPlaceSelection } from "@/features/assistant-chat/model/types";
import { haversineKm } from "./distance";
import {
  assertPublicDataHeader,
  requestPublicDataJson,
} from "./public-data-client";
import {
  type StandardListEnvelope,
  toItemArray,
} from "./public-data-envelope";
import { resolvePublicDataIntent } from "./resolve-public-data-intent";

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

function trailTitle(it: RawRecord): string {
  return String(
    it["길명"] ?? it["pathNm"] ?? it["routeNm"] ?? it["trailNm"] ?? "",
  ).trim();
}

function trailDescription(it: RawRecord): string {
  const d = String(
    it["길소개"] ?? it["pathIntrcn"] ?? it["description"] ?? "",
  ).trim();
  return d.slice(0, 160);
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
  /** 길 API 없을 때 폴백 등 추가 안내 줄 */
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
  const rawItems = toItemArray(data.response?.body?.items?.item);

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

    const trailEndpoint = process.env.PUBLIC_DATA_TRAIL_ENDPOINT?.trim();
    if (!trailEndpoint) {
      const preamble = [
        "[안내] 사용자 의도는 길·산책로·강변 등인데 PUBLIC_DATA_TRAIL_ENDPOINT가 비어 있어, 같은 서비스키로 도시공원 목록을 참고 자료로 대체했습니다.",
        "목록 속 공원명·주소만 근거로 답하고, 실제 강변 산책로 존재 여부는 단정하지 마세요.",
      ];
      const lines = await buildUrbanParkAugmentationLines({
        selectionPlaces,
        preamble,
      });
      return lines.join("\n");
    }

    const data = await requestPublicDataJson<
      StandardListEnvelope<RawRecord>
    >({
      endpoint: trailEndpoint,
      pageNo: 1,
      numOfRows: Math.min(pageSize(), 80),
      formatParamKey: formatParamKey(),
    });

    await assertPublicDataHeader(data);
    const rawItems = toItemArray(data.response?.body?.items?.item);

    const rows = rawItems
      .map((it) => {
        const title = trailTitle(it);
        if (!title) return null;
        const intro = trailDescription(it);
        const len = String(it["총길이"] ?? it["totalLength"] ?? "").trim();
        const time = String(it["총소요시간"] ?? it["reqreTime"] ?? "").trim();
        const start = String(
          it["시작지점명"] ?? it["startPointNm"] ?? "",
        ).trim();
        const agency = String(it["관리기관명"] ?? it["institutionNm"] ?? "").trim();
        return { title, intro, len, time, start, agency };
      })
      .filter((x): x is NonNullable<typeof x> => x != null)
      .slice(0, 12);

    const lines = rows.map((x, i) => {
      const bits = [
        x.len ? `길이 ${x.len}` : null,
        x.time ? `소요 ${x.time}` : null,
        x.start ? `시작 ${x.start}` : null,
        x.agency ? x.agency : null,
      ].filter(Boolean);
      return `${i + 1}. ${x.title}${x.intro ? ` — ${x.intro}` : ""}${bits.length ? ` (${bits.join(", ")})` : ""}`;
    });

    return [
      "[공공데이터 참고 텍스트 — 원문과 다를 수 있으니 과장·단정 금지]",
      `길·산책로류 오픈API 조회 결과 일부 (${rows.length}건).`,
      `기준 위치는 더미 좌표만 사용 중 (${DUMMY_REFERENCE_POINT.label}).`,
      ...lines,
    ].join("\n");
  } catch (e) {
    const msg = e instanceof Error ? e.message.slice(0, 400) : String(e);
    return [
      "[공공데이터]",
      "오픈API 호출에 실패했습니다. 사용자에게 잠시 후 재시도하거나 포털 키·엔드포인트 설정을 확인하라고 안내하세요.",
      `세부: ${msg}`,
    ].join(" ");
  }
}
