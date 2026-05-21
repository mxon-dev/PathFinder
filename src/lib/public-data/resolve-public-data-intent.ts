import type { AssistantPlaceSelection } from "@/features/assistant-chat/model/types";

export type PublicDataIntent = "urbanPark" | "tourismTrail";

const PARK_RE = /공원|파크|park|녹지|(?:🌳)/i;
/** 칩 요약의 "산책" 등과 충돌하지 않도록 단어 선택 */
const TRAIL_RE =
  /둘레길|산책로|산책길|등산|트레일|trail|길관광|걷기길|탐방로|숲길|해안길|호숫길|(?:⛰️)|(?:🌊)|(?:🏖️)|(?:🏙️)|\b산\b|\b강\b|호수|한강|도심|골목/i;

/** 장소 칩이 있으면 텍스트보다 우선 (소요시간·장소 선택 플로우용) */
export function resolvePublicDataIntent(
  text: string,
  selectionPlaces?: readonly AssistantPlaceSelection[],
): PublicDataIntent | null {
  if (selectionPlaces?.length) {
    if (selectionPlaces.includes("park")) return "urbanPark";
    return "tourismTrail";
  }

  const t = text.trim();
  if (!t) return null;
  const parkHit = PARK_RE.test(t);
  const trailHit = TRAIL_RE.test(t);
  if (parkHit && !trailHit) return "urbanPark";
  if (trailHit && !parkHit) return "tourismTrail";
  if (parkHit && trailHit) return "urbanPark";
  return null;
}
