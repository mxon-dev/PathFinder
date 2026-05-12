import axios from "axios";

const DEFAULT = "응답을 가져오지 못했습니다. 잠시 후 다시 시도해 주세요.";

export function formatAssistantChatError(err: unknown): string {
  if (!axios.isAxiosError(err)) return DEFAULT;
  const data = err.response?.data as
    | { error?: string; detail?: string }
    | undefined;
  const detail = data?.detail?.trim();
  const apiErr = data?.error?.trim();
  if (detail) return `${DEFAULT} (${detail})`;
  if (apiErr) return `${DEFAULT} (${apiErr})`;
  if (err.code === "ERR_NETWORK") {
    return `${DEFAULT} (네트워크 오류 — 서버가 실행 중인지 확인해 주세요.)`;
  }
  return DEFAULT;
}
