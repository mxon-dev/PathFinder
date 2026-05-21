import type { RecommendationFilterId } from "./types";

export const RECOMMENDATION_FILTERS: Array<{
  id: RecommendationFilterId;
  label: string;
}> = [
  { id: "all", label: "전체" },
  { id: "under30", label: "30분 이하" },
  { id: "under60", label: "1시간 이하" },
  { id: "river", label: "강변" },
  { id: "park", label: "공원" },
  { id: "mountain", label: "산" },
  { id: "city", label: "도심" },
  { id: "lake", label: "호수" },
];
