import type { KakaoMapMarker } from "@/components/map/KakaoMap";
import type { CourseCandidate } from "@/features/walk/model/types";

/** 코스 경유지 → 지도 마커 (출발 빨강, 도착 파랑, 중간 번호) */
export function buildCourseMapMarkers(course: CourseCandidate): KakaoMapMarker[] {
  const named = course.waypoints?.filter(
    (w) =>
      typeof w.lat === "number" &&
      typeof w.lng === "number" &&
      Number.isFinite(w.lat) &&
      Number.isFinite(w.lng),
  );

  if (named && named.length >= 2) {
    const last = named.length - 1;
    return named.map((w, i) => ({
      id: `${course.id}-wp-${i}`,
      position: { lat: w.lat, lng: w.lng },
      title: w.name,
      tone:
        i === 0 ? "start" : i === last ? "end" : ("waypoint" as const),
      order: i + 1,
    }));
  }

  const nextMarkers: KakaoMapMarker[] = [];

  if (
    typeof course.start?.lat === "number" &&
    typeof course.start.lng === "number"
  ) {
    nextMarkers.push({
      id: `${course.id}-start`,
      position: { lat: course.start.lat, lng: course.start.lng },
      title: course.start.name ?? `${course.title} 출발`,
      tone: "start",
      order: 1,
    });
  }

  if (
    typeof course.end?.lat === "number" &&
    typeof course.end.lng === "number"
  ) {
    nextMarkers.push({
      id: `${course.id}-end`,
      position: { lat: course.end.lat, lng: course.end.lng },
      title: course.end.name ?? `${course.title} 도착`,
      tone: "end",
      order: nextMarkers.length + 1,
    });
  }

  if (nextMarkers.length === 0) {
    nextMarkers.push({
      id: `${course.id}-center`,
      position: course.center,
      title: course.title,
      tone: "default",
    });
  }

  return nextMarkers;
}
