import { DURATION_OPTIONS, type DurationId } from "./PathFinderDurationChips";
import { PLACE_OPTIONS, type PlaceId } from "./PathFinderPlaceTypeChips";

function durationLabel(id: DurationId): string {
  return DURATION_OPTIONS.find((o) => o.id === id)?.label ?? id;
}

function placeSegment(id: PlaceId): string {
  const p = PLACE_OPTIONS.find((o) => o.id === id);
  return p ? `${p.emoji} ${p.label}` : id;
}

/** 말풍선·전송에 쓰는 한 줄 요약 (선택 없으면 null) */
export function buildSelectionSummary(
  duration: DurationId | null,
  places: PlaceId[],
): string | null {
  if (!duration && places.length === 0) return null;
  const parts: string[] = [];
  if (duration) parts.push(`${durationLabel(duration)} 산책`);
  if (places.length) parts.push(places.map(placeSegment).join(" · "));
  return `${parts.join(" · ")} 코스`;
}

export function buildComposedMessage(
  duration: DurationId | null,
  places: PlaceId[],
  extraText: string,
): string {
  const s = buildSelectionSummary(duration, places);
  const extra = extraText.trim();
  if (s && extra) return `${s} ${extra}`;
  if (s) return s;
  return extra;
}
