import type {
  KakaoLocalResponse,
  KakaoPlaceDocument,
  KakaoRegionDocument,
} from "./kakao-types";

const KAKAO_LOCAL_BASE_URL = "https://dapi.kakao.com/v2/local";

export class KakaoLocalApiError extends Error {
  status: number;
  statusText: string;
  endpoint: string;
  kakaoCode?: number;
  kakaoMessage?: string;

  constructor(params: {
    status: number;
    statusText: string;
    endpoint: string;
    kakaoCode?: number;
    kakaoMessage?: string;
  }) {
    const detail = params.kakaoMessage ?? params.statusText;
    super(`Kakao Local API failed: ${params.status} ${detail}`);
    this.name = "KakaoLocalApiError";
    this.status = params.status;
    this.statusText = params.statusText;
    this.endpoint = params.endpoint;
    this.kakaoCode = params.kakaoCode;
    this.kakaoMessage = params.kakaoMessage;
  }

  get isQuotaExceeded(): boolean {
    return this.kakaoCode === -10;
  }

  /** 새 앱에서 지도/로컬(OPEN_MAP_AND_LOCAL) 미활성화 시 403 */
  get isLocalServiceDisabled(): boolean {
    const msg = this.kakaoMessage ?? "";
    return (
      this.status === 403 &&
      (msg.includes("OPEN_MAP_AND_LOCAL") ||
        (msg.includes("disabled") && msg.includes("LOCAL")))
    );
  }
}

function getKakaoRestApiKey() {
  const apiKey = process.env.KAKAO_REST_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("KAKAO_REST_API_KEY is not defined.");
  }

  return apiKey;
}

export async function requestKakaoLocal<T>(
  path: string,
  params: Record<string, string | number | undefined>,
): Promise<KakaoLocalResponse<T>> {
  const url = new URL(`${KAKAO_LOCAL_BASE_URL}${path}`);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  const response = await fetch(url, {
    headers: {
      Authorization: `KakaoAK ${getKakaoRestApiKey()}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    let kakaoCode: number | undefined;
    let kakaoMessage: string | undefined;
    try {
      const body = (await response.json()) as {
        code?: number;
        message?: string;
        msg?: string;
      };
      kakaoCode = body.code;
      kakaoMessage = body.message ?? body.msg;
    } catch {
      // ignore parse errors
    }
    throw new KakaoLocalApiError({
      status: response.status,
      statusText: response.statusText,
      endpoint: path,
      kakaoCode,
      kakaoMessage,
    });
  }

  return response.json();
}

export async function coordToRegion(params: { lat: number; lng: number }) {
  return requestKakaoLocal<KakaoRegionDocument>("/geo/coord2regioncode.json", {
    x: params.lng,
    y: params.lat,
    input_coord: "WGS84",
    output_coord: "WGS84",
  });
}

export async function searchKeyword(params: {
  query: string;
  lat?: number;
  lng?: number;
  radius?: number;
  page?: number;
  size?: number;
  sort?: "accuracy" | "distance";
}) {
  const hasCenter =
    typeof params.lat === "number" &&
    typeof params.lng === "number" &&
    Number.isFinite(params.lat) &&
    Number.isFinite(params.lng);

  return requestKakaoLocal<KakaoPlaceDocument>("/search/keyword.json", {
    query: params.query,
    x: hasCenter ? params.lng : undefined,
    y: hasCenter ? params.lat : undefined,
    radius: hasCenter ? (params.radius ?? 20_000) : undefined,
    page: params.page ?? 1,
    size: params.size ?? 10,
    sort:
      hasCenter && params.sort === "distance" ? "distance" : "accuracy",
  });
}

export async function searchAddress(params: {
  query: string;
  page?: number;
  size?: number;
}) {
  return requestKakaoLocal<{ x: string; y: string; address_name?: string }>(
    "/search/address.json",
    {
      query: params.query,
      page: params.page ?? 1,
      size: params.size ?? 1,
    },
  );
}
