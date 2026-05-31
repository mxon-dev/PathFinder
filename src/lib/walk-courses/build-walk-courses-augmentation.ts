import type {
  AssistantDurationSelection,
  AssistantPlaceSelection,
} from "@/features/assistant-chat/model/types";
import { DUMMY_REFERENCE_POINT } from "@/shared/config/dummy-location";
import {
  parseDurationMin,
  recommendWalkCourses,
} from "./recommend-walk-courses";
import type { WalkCourse } from "./types";

function formatCourseLine(
  course: WalkCourse,
  distanceKm: number | null,
  i: number,
): string {
  const title =
    course.courseName && course.courseName !== course.groupName
      ? `${course.groupName} · ${course.courseName}`
      : course.groupName || course.courseName;
  const meta: string[] = [];
  if (course.distanceKm != null) meta.push(`${course.distanceKm}km`);
  if (course.durationText) meta.push(`소요 ${course.durationText}`);
  if (course.level) meta.push(`난이도 ${course.level}`);
  if (distanceKm != null) {
    meta.push(`기준점에서 약 ${distanceKm.toFixed(1)}km`);
  }
  if (course.region) meta.push(course.region);

  const head = `${i + 1}. ${title}${meta.length ? ` — ${meta.join(", ")}` : ""}`;

  const detail = course.description
    ? course.description.replace(/\s+/g, " ").trim().slice(0, 140)
    : course.waypoints
      ? course.waypoints.replace(/\s+/g, " ").trim().slice(0, 140)
      : "";
  return detail ? `${head}\n   ${detail}` : head;
}

const MAX_CANDIDATES = 6;

export async function buildWalkCoursesAugmentationBlock(input: {
  selectionPlaces?: AssistantPlaceSelection[];
  selectionDuration?: AssistantDurationSelection;
  referencePoint?: { lat: number; lng: number; label?: string };
}): Promise<string> {
  const reference = input.referencePoint ?? DUMMY_REFERENCE_POINT;
  const referenceLabel =
    input.referencePoint?.label ?? DUMMY_REFERENCE_POINT.label;

  let scored;
  try {
    scored = await recommendWalkCourses({
      selectionPlaces: input.selectionPlaces,
      durationMin: parseDurationMin(input.selectionDuration),
      referencePoint: reference,
      limit: MAX_CANDIDATES,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message.slice(0, 200) : String(e);
    return [
      "[산책 코스 데이터]",
      "로컬 CSV(src/data/walk-courses-2021.csv) 로드에 실패했습니다.",
      `세부: ${msg}`,
    ].join(" ");
  }

  if (scored.length === 0) {
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
    `기준점: ${referenceLabel} (${reference.lat.toFixed(5)}, ${reference.lng.toFixed(5)}).`,
    `아래 ${scored.length}건은 위 조건을 우선 적용한 후보입니다. 답변 시 이 목록의 항목명·거리·소요시간만 인용하고, 새 장소를 지어내지 마세요.`,
    ...scored.map(({ course, distanceFromUserKm }, i) =>
      formatCourseLine(course, distanceFromUserKm, i),
    ),
  ].join("\n");
}
