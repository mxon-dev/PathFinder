import type { AIDocentRequest } from "../model/types";

const PREFERENCE_LABEL: Record<
  NonNullable<AIDocentRequest["userPreference"]>,
  string
> = {
  healing: "힐링·여유",
  exercise: "운동·걷기 강도",
  history: "역사·문화",
  nature: "자연·풍경",
  family: "가족·동반",
};

export function buildDocentPrompt(input: AIDocentRequest): string {
  const pref = input.userPreference
    ? PREFERENCE_LABEL[input.userPreference]
    : null;

  const parts = [
    "당신은 산책로 안내를 돕는 친근한 도슨트입니다.",
    "아래에 주어진 정보만 사용하고, 제공되지 않은 시설·역사·운영시간·안전 보장·접근성·행사 등은 절대 만들어내지 마세요.",
    "사실처럼 단정할 수 없는 내용은 피하고, 부족하면 '제공된 경로 정보만으로는 알 수 없습니다'라는 뉘앙스로 짧게 언급하세요.",
    "응답은 반드시 한국어로 작성하세요.",
    "톤은 따뜻하고 걷기 좋게 격려하되 과장하지 마세요.",
    "",
    "반환 형식은 JSON만 허용합니다. 다른 설명·마크다운·코드 블록 없이 순수 JSON 한 개만 출력하세요.",
    "",
    "JSON 스키마(키 이름은 정확히 일치):",
    `{ "title": string, "summary": string, "highlights": string[], "recommendedFor": string[], "cautionNotes": string[], "docentScript": string }`,
    "",
    "- title: 경로에 어울리는 짧은 제목",
    "- summary: 2~4문장 요약",
    "- highlights: 불릿 포인트 3~5개 (주어진 정보만 반영)",
    "- recommendedFor: 이런 분께 추천한다는 짧은 문구 2~4개",
    "- cautionNotes: 주의·보수적 안내 1~3개 (확인되지 않은 구체 사실 금지)",
    "- docentScript: 도슨트가 읽어 줄 짧은 내레이션 1분 이내 분량",
    "",
    "## 경로 식별자",
    `routeId: ${input.routeId}`,
    `routeName: ${input.routeName}`,
    "",
    "## 수치·난이도",
    input.distanceKm != null ? `distanceKm: ${input.distanceKm}` : null,
    input.estimatedMinutes != null
      ? `estimatedMinutes: ${input.estimatedMinutes}`
      : null,
    input.difficulty ? `difficulty: ${input.difficulty}` : null,
    pref ? `userPreference: ${pref}` : null,
    "",
    "## 위치·설명(공공데이터 등 제공 텍스트만 사용)",
    input.locationText
      ? `locationText:\n${input.locationText}`
      : "locationText: (없음)",
    "",
    input.routeDescription
      ? `routeDescription:\n${input.routeDescription}`
      : "routeDescription: (없음)",
    "",
    input.keywords?.length
      ? `keywords: ${input.keywords.join(", ")}`
      : "keywords: (없음)",
  ];

  return parts.filter((line): line is string => line != null).join("\n");
}
