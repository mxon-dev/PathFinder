import { KakaoLocalApiError } from "./kakao-local-client";

const LOCAL_SERVICE_SETUP_MESSAGE =
  "카카오 앱에서 「지도/로컬」(OPEN_MAP_AND_LOCAL) 제품을 켜 주세요. " +
  "Kakao Developers → 내 애플리케이션 → 제품 설정 → 지도/로컬 ON → " +
  "REST API 키·JavaScript 키를 .env.local에 넣은 뒤 pnpm dev를 재시작하세요.";

export function kakaoErrorToHttpResponse(error: unknown): {
  status: number;
  body: { message: string; code?: number };
} {
  if (!(error instanceof KakaoLocalApiError)) {
    return {
      status: 502,
      body: { message: "Kakao API request failed." },
    };
  }

  if (error.isLocalServiceDisabled) {
    return {
      status: 403,
      body: { message: LOCAL_SERVICE_SETUP_MESSAGE },
    };
  }

  if (error.isQuotaExceeded) {
    return {
      status: 429,
      body: {
        message:
          "카카오 Local API 일일 호출 한도를 초과했습니다. 내일 다시 시도하거나 Kakao Developers에서 사용량을 확인해 주세요.",
        code: error.kakaoCode,
      },
    };
  }

  return {
    status: error.status >= 400 && error.status < 600 ? error.status : 502,
    body: {
      message: error.kakaoMessage ?? "Kakao API request failed.",
      code: error.kakaoCode,
    },
  };
}
