import type { CourseCandidate, WalkCategory } from "@/features/walk/model/types";
import type { WalkCourse } from "./types";

const CATEGORY_MAP: Record<string, WalkCategory> = {
  river: "river",
  park: "park",
  mountain: "mountain",
  urban: "city",
  lake: "lake",
};

function mapCategories(categories: WalkCourse["categories"]): WalkCategory[] {
  const out = categories
    .map((c) => CATEGORY_MAP[c])
    .filter((c): c is WalkCategory => Boolean(c));
  return out.length ? Array.from(new Set(out)) : ["city"];
}

export function walkCourseToCandidate(
  course: WalkCourse,
  distanceFromUserKm?: number | null,
): CourseCandidate | null {
  if (course.lat == null || course.lng == null) return null;

  const title =
    course.courseName && course.courseName !== course.groupName
      ? `${course.groupName} · ${course.courseName}`
      : course.groupName || course.courseName;

  if (!title) return null;

  const center = { lat: course.lat, lng: course.lng };
  const descriptionParts = [
    course.description?.trim(),
    course.region ? `(${course.region})` : null,
    distanceFromUserKm != null
      ? `기준 위치에서 약 ${distanceFromUserKm.toFixed(1)}km`
      : null,
  ].filter(Boolean);

  const startName =
    course.address?.trim() || course.region?.trim() || course.groupName;

  return {
    id: course.id,
    title,
    category: mapCategories(course.categories),
    source: "public_trail",
    center,
    start: {
      name: startName,
      lat: course.lat,
      lng: course.lng,
    },
    distanceKm: course.distanceKm ?? undefined,
    durationMin: course.durationMin ?? undefined,
    description:
      descriptionParts.join(" ").slice(0, 220) ||
      `${title} 산책 코스 (공공 보행 데이터)`,
  };
}

export function findWalkCourseCandidateById(
  courses: CourseCandidate[],
  courseId: string,
): CourseCandidate | undefined {
  const decoded = decodeURIComponent(courseId);
  return courses.find((c) => c.id === decoded || c.id === courseId);
}
