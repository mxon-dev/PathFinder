import type { NormalizedWalkCandidate, WalkCategory } from "../public-data-types";
import { parseDistanceKm, parseDurationMin } from "./parse-walk-values";

type RawTourismTrail = Record<string, unknown>;

function hashText(text: string) {
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

function inferTrailCategories(text: string): WalkCategory[] {
  const categories = new Set<WalkCategory>();

  if (/강|하천|천|수변|해안|갈맷길/.test(text)) categories.add("river");
  if (/공원|생태/.test(text)) categories.add("park");
  if (/산|숲|둘레길|등산|자락길|탐방로/.test(text)) categories.add("mountain");
  if (/도심|거리|골목|문화|유적|역사/.test(text)) categories.add("city");
  if (/호수|저수지|연못/.test(text)) categories.add("lake");

  if (categories.size === 0) categories.add("city");
  return Array.from(categories);
}

function pickAddress(...values: unknown[]): string | undefined {
  for (const value of values) {
    const text = String(value ?? "").trim();
    if (text && text !== "없음") return text;
  }
  return undefined;
}

/** 전국길관광정보표준데이터 / openapi 영문 필드 모두 지원 */
export function normalizeTourismTrail(
  row: RawTourismTrail,
): NormalizedWalkCandidate | null {
  const title = String(
    row["길명"] ?? row["stretNm"] ?? row["pathNm"] ?? row["name"] ?? "",
  ).trim();

  if (!title) return null;

  const description = String(
    row["길소개"] ?? row["stretIntrcn"] ?? row["pathIntrcn"] ?? "",
  ).trim();
  const routeText = String(
    row["경로정보"] ?? row["coursInfo"] ?? row["routeText"] ?? "",
  ).trim();
  const combinedText = `${title} ${description} ${routeText}`;

  return {
    id: `trail-${hashText(`${title}${routeText}`)}`,
    title,
    categories: inferTrailCategories(combinedText),
    source: "data_go_kr_tourism_trail",
    sourceName: "전국길관광정보표준데이터",
    sourceUrl: "https://www.data.go.kr/data/15017321/standard.do",
    description: String(description || routeText || title).trim(),
    distanceKm: parseDistanceKm(
      row["총길이"] ?? row["stretLt"] ?? row["totalLength"],
    ),
    durationMin: parseDurationMin(
      row["총소요시간"] ?? row["reqreTime"] ?? row["totalTime"],
    ),
    start: {
      name: String(
        row["시작지점명"] ?? row["beginSpotNm"] ?? row["startPointNm"] ?? "",
      ).trim() || undefined,
      address: pickAddress(
        row["시작지점도로명주소"],
        row["beginRdnmadr"],
        row["startRoadAddress"],
        row["시작지점소재지지번주소"],
        row["beginLnmadr"],
      ),
    },
    end: {
      name: String(
        row["종료지점명"] ?? row["endSpotNm"] ?? row["endPointNm"] ?? "",
      ).trim() || undefined,
      address: pickAddress(
        row["종료지점소재지도로명주소"],
        row["endRdnmadr"],
        row["endRoadAddress"],
        row["종료지점소재지지번주소"],
        row["endLnmadr"],
      ),
    },
    phone: String(
      row["관리기관전화번호"] ?? row["phoneNumber"] ?? "",
    ).trim() || undefined,
    managementAgency: String(
      row["관리기관명"] ?? row["institutionNm"] ?? "",
    ).trim() || undefined,
    referenceDate: String(
      row["데이터기준일자"] ?? row["referenceDate"] ?? "",
    ).trim() || undefined,
    raw: {
      routeText,
    },
  };
}
