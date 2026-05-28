import { readFile } from "node:fs/promises";
import path from "node:path";
import { parseCsv } from "./parse-csv";
import type { WalkCourse, WalkCourseCategory } from "./types";

const CSV_REL_PATH = "src/data/walk-courses-2021.csv";

const HEADER_INDEX = {
  ESNTL_ID: 0,
  WLK_COURS_FLAG_NM: 1,
  WLK_COURS_NM: 2,
  COURS_DC: 3,
  SIGNGU_NM: 4,
  COURS_LEVEL_NM: 5,
  COURS_LT_CN: 6,
  COURS_DETAIL_LT_CN: 7,
  ADIT_DC: 8,
  COURS_TIME_CN: 9,
  OPTN_DC: 10,
  TOILET_DC: 11,
  CVNTL_NM: 12,
  LNM_ADDR: 13,
  COURS_SPOT_LA: 14,
  COURS_SPOT_LO: 15,
} as const;

const RIVER_RE = /강|하천|천변|수변|한강|개울|시내|호숫?변/;
const LAKE_RE = /호수|저수지|호반|호숫?가|연못/;
const MOUNTAIN_RE = /산|숲|등산|둘레길|자락길|능선|봉우리|숲길|임도|탐방로/;
const PARK_RE = /공원|녹지|식물원|수목원|생태공원|호수공원/;
const URBAN_RE = /도심|시내|골목|시가지|읍내|시청|역사거리|문화의 거리/;

function parseNumber(input: string | undefined): number | null {
  if (!input) return null;
  const trimmed = input.trim().replace(/,/g, "");
  if (!trimmed) return null;
  const n = Number.parseFloat(trimmed);
  return Number.isFinite(n) ? n : null;
}

/** "4시간", "1시간 30분", "45분" → 분 */
function parseDurationMin(input: string | undefined): number | null {
  if (!input) return null;
  const s = input.trim();
  if (!s) return null;

  let total = 0;
  let matched = false;

  const hour = s.match(/(\d+(?:\.\d+)?)\s*시간/);
  if (hour) {
    total += Math.round(parseFloat(hour[1]) * 60);
    matched = true;
  }

  const minute = s.match(/(\d+)\s*분/);
  if (minute) {
    total += parseInt(minute[1], 10);
    matched = true;
  }

  if (!matched) {
    const n = parseNumber(s);
    if (n != null) {
      total = Math.round(n);
      matched = true;
    }
  }

  return matched && total > 0 ? total : null;
}

function inferCategories(text: string): WalkCourseCategory[] {
  const cats = new Set<WalkCourseCategory>();
  if (RIVER_RE.test(text)) cats.add("river");
  if (LAKE_RE.test(text)) cats.add("lake");
  if (MOUNTAIN_RE.test(text)) cats.add("mountain");
  if (PARK_RE.test(text)) cats.add("park");
  if (URBAN_RE.test(text)) cats.add("urban");
  return Array.from(cats);
}

let cache: Promise<WalkCourse[]> | null = null;

export function loadWalkCourses(): Promise<WalkCourse[]> {
  if (!cache) {
    cache = loadOnce().catch((err) => {
      cache = null;
      throw err;
    });
  }
  return cache;
}

async function loadOnce(): Promise<WalkCourse[]> {
  const filePath = path.join(process.cwd(), CSV_REL_PATH);
  const raw = await readFile(filePath, "utf8");
  const rows = parseCsv(raw);
  if (rows.length <= 1) return [];

  const out: WalkCourse[] = [];
  for (let i = 1; i < rows.length; i += 1) {
    const r = rows[i];
    if (!r || r.length < 4) continue;

    const id = r[HEADER_INDEX.ESNTL_ID]?.trim() ?? "";
    const groupName = r[HEADER_INDEX.WLK_COURS_FLAG_NM]?.trim() ?? "";
    const courseName = r[HEADER_INDEX.WLK_COURS_NM]?.trim() ?? "";
    if (!id || (!groupName && !courseName)) continue;

    const waypoints = r[HEADER_INDEX.COURS_DC]?.trim() ?? "";
    const region = r[HEADER_INDEX.SIGNGU_NM]?.trim() ?? "";
    const level = r[HEADER_INDEX.COURS_LEVEL_NM]?.trim() ?? "";
    const lengthBucket = r[HEADER_INDEX.COURS_LT_CN]?.trim() ?? "";
    const distanceKm = parseNumber(r[HEADER_INDEX.COURS_DETAIL_LT_CN]);
    const description = r[HEADER_INDEX.ADIT_DC]?.trim() ?? "";
    const durationText = r[HEADER_INDEX.COURS_TIME_CN]?.trim() ?? "";
    const durationMin = parseDurationMin(durationText);
    const notes = r[HEADER_INDEX.OPTN_DC]?.trim() ?? "";
    const toilet = r[HEADER_INDEX.TOILET_DC]?.trim() ?? "";
    const convenience = r[HEADER_INDEX.CVNTL_NM]?.trim() ?? "";
    const address = r[HEADER_INDEX.LNM_ADDR]?.trim() ?? "";
    const lat = parseNumber(r[HEADER_INDEX.COURS_SPOT_LA]);
    const lng = parseNumber(r[HEADER_INDEX.COURS_SPOT_LO]);

    const haystack = [groupName, courseName, waypoints, description, region]
      .join(" ")
      .toLowerCase();
    const categories = inferCategories(haystack);

    out.push({
      id,
      groupName,
      courseName,
      waypoints,
      region,
      level,
      lengthBucket,
      distanceKm,
      description,
      durationText,
      durationMin,
      notes,
      toilet,
      convenience,
      address,
      lat,
      lng,
      categories,
    });
  }
  return out;
}
