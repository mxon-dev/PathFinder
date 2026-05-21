export type AssistantChatRole = "user" | "assistant";

/** PathFinder 장소 칩 id — 산책 코스 후보 필터링에 사용 */
export type AssistantPlaceSelection =
  | "river"
  | "park"
  | "mountain"
  | "urban"
  | "lake";

/** PathFinder 소요시간 칩 id (분) */
export type AssistantDurationSelection = "15" | "30" | "45" | "60" | "90";

export type AssistantChatMessageDTO = {
  role: AssistantChatRole;
  content: string;
};

export type AssistantChatRequest = {
  messages: AssistantChatMessageDTO[];
  /** 마지막 전송 시 선택했던 장소 칩 (텍스트만으로는 알 수 없어 서버로 함께 보냄) */
  selectionPlaces?: AssistantPlaceSelection[];
  /** 마지막 전송 시 선택했던 소요시간 칩 */
  selectionDuration?: AssistantDurationSelection;
};

export type AssistantChatResponse = {
  reply: string;
};
