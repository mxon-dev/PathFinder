import type { AssistantPlaceSelection } from "@/features/assistant-chat/model/types";

export function parsePlaceChips(places?: string): AssistantPlaceSelection[] {
  if (!places?.trim()) return [];
  return places
    .split(",")
    .map((p) => p.trim())
    .filter((p): p is AssistantPlaceSelection =>
      ["river", "park", "mountain", "urban", "lake"].includes(p),
    );
}

export function parseDurationMin(duration?: string): number | null {
  if (!duration?.trim()) return null;
  const n = parseInt(duration, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}
