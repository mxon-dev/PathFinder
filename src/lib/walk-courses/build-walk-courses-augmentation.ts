import { DUMMY_REFERENCE_POINT } from "@/shared/config/dummy-location";
import type {
  AssistantDurationSelection,
  AssistantPlaceSelection,
} from "@/features/assistant-chat/model/types";
import { haversineKm } from "@/lib/public-data/distance";
import { loadWalkCourses } from "./load-walk-courses";
import type { WalkCourse, WalkCourseCategory } from "./types";

const PLACE_TO_CATEGORY: Record<AssistantPlaceSelection, WalkCourseCategory> = {
  river: "river",
  park: "park",
  mountain: "mountain",
  urban: "urban",
  lake: "lake",
};

function durationMinutes(d?: AssistantDurationSelection): number | null {
  if (!d) return null;
  const n = parseInt(d, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function withDistance(course: WalkCourse): number | null {
  if (course.lat == null || course.lng == null) return null;
  return haversineKm(DUMMY_REFERENCE_POINT, {
    lat: course.lat,
    lng: course.lng,
  });
}

function matchesCategory(
  course: WalkCourse,
  wanted: WalkCourseCategory[],
): boolean {
  if (wanted.length === 0) return true;
  return wanted.some((c) => course.categories.includes(c));
}

function durationScore(
  course: WalkCourse,
  targetMin: number | null,
): number {
  if (targetMin == null) return 0;
  if (course.durationMin == null) return 9999;
  const diff = Math.abs(course.durationMin - targetMin);
  return diff;
}

type Scored = {
  course: WalkCourse;
  distanceKm: number | null;
  durationDiff: number;
};

function formatCourseLine(s: Scored, i: number): string {
  const c = s.course;
  const title =
    c.courseName && c.courseName !== c.groupName
      ? `${c.groupName} · ${c.courseName}`
      : c.groupName || c.courseName;
  const meta: string[] = [];
  if (c.distanceKm != null) meta.push(`${c.distanceKm}km`);
  if (c.durationText) meta.push(`소요 ${c.durationText}`);
  if (c.level) meta.push(`난이도 ${c.level}`);
  if (s.distanceKm != null) {
    meta.push(`기준점에서 약 ${s.distanceKm.toFixed(1)}km`);
  }
  if (c.region) meta.push(c.region);

  const head = `${i + 1}. ${title}${meta.length ? ` — ${meta.join(", ")}` : ""}`;

  const detail = c.description
    ? c.description.replace(/\s+/g, " ").trim().slice(0, 140)
    : c.waypoints
      ? c.waypoints.replace(/\s+/g, " ").trim().slice(0, 140)
      : "";
  return detail ? `${head}\n   ${detail}` : head;
}

const MAX_CANDIDATES = 6;

export async function buildWalkCoursesAugmentationBlock(input: {
  selectionPlaces?: AssistantPlaceSelection[];
  selectionDuration?: AssistantDurationSelection;
}): Promise<string> {
  let courses: WalkCourse[];
  try {
    courses = await loadWalkCourses();
  } catch (e) {
    const msg = e instanceof Error ? e.message.slice(0, 200) : String(e);
    return [
      "[산책 코스 데이터]",
      "로컬 CSV(src/data/walk-courses-2021.csv) 로드에 실패했습니다.",
      `세부: ${msg}`,
    ].join(" ");
  }

  if (courses.length === 0) {
    return "[산책 코스 데이터] 산책 코스 데이터가 비어 있습니다.";
  }

  const wantedCategories =
    input.selectionPlaces?.map((p) => PLACE_TO_CATEGORY[p]) ?? [];
  const targetMin = durationMinutes(input.selectionDuration);

  let filtered = courses.filter((c) => matchesCategory(c, wantedCategories));

  /** 시간 칩이 있으면 그 시간의 1.5배 이내 코스만 우선 */
  if (targetMin != null) {
    const within = filtered.filter(
      (c) => c.durationMin != null && c.durationMin <= Math.max(targetMin * 1.5, targetMin + 20),
    );
    if (within.length >= 3) filtered = within;
  }

  if (filtered.length === 0) filtered = courses;

  const scored: Scored[] = filtered.map((course) => ({
    course,
    distanceKm: withDistance(course),
    durationDiff: durationScore(course, targetMin),
  }));

  scored.sort((a, b) => {
    if (targetMin != null && a.durationDiff !== b.durationDiff) {
      return a.durationDiff - b.durationDiff;
    }
    const ad = a.distanceKm ?? Number.POSITIVE_INFINITY;
    const bd = b.distanceKm ?? Number.POSITIVE_INFINITY;
    return ad - bd;
  });

  const top = scored.slice(0, MAX_CANDIDATES);
  if (top.length === 0) {
    return "[산책 코스 데이터] 조건에 맞는 코스를 찾지 못했습니다.";
  }

  const placeLabel = input.selectionPlaces?.length
    ? input.selectionPlaces.join(", ")
    : "(미선택)";
  const durationLabel = input.selectionDuration
    ? `${input.selectionDuration}분`
    : "(미선택)";

  return [
    "[산책 코스 데이터 — 2021년 한국관광공사 보행 둘레길/걷기길 데이터, 출처 원문이라 단정·과장 금지]",
    `사용자 선택: 시간=${durationLabel}, 장소=${placeLabel}.`,
    `기준점(더미): ${DUMMY_REFERENCE_POINT.label} (${DUMMY_REFERENCE_POINT.lat.toFixed(5)}, ${DUMMY_REFERENCE_POINT.lng.toFixed(5)}).`,
    `아래 ${top.length}건은 위 조건을 우선 적용한 후보입니다. 답변 시 이 목록의 항목명·거리·소요시간만 인용하고, 새 장소를 지어내지 마세요.`,
    ...top.map(formatCourseLine),
  ].join("\n");
}
