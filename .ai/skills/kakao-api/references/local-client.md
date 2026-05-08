# Kakao Local REST API Client

## 7. Kakao Local REST API Common Client

`src/lib/kakao/kakao-local-client.ts`

```ts
import type {
  KakaoLocalResponse,
  KakaoPlaceDocument,
  KakaoRegionDocument,
} from "./kakao-types";

const KAKAO_LOCAL_BASE_URL = "https://dapi.kakao.com/v2/local";

function getKakaoRestApiKey() {
  const apiKey = process.env.KAKAO_REST_API_KEY;

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
    // Do not store Kakao Local responses.
    cache: "no-store",
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(
      `Kakao Local API failed: ${response.status} ${response.statusText} ${errorBody}`,
    );
  }

  return response.json();
}

export async function coordToRegion(params: {
  lat: number;
  lng: number;
}) {
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
  return requestKakaoLocal<KakaoPlaceDocument>("/search/keyword.json", {
    query: params.query,
    x: params.lng,
    y: params.lat,
    radius: params.radius ?? 3000,
    page: params.page ?? 1,
    size: params.size ?? 10,
    sort: params.sort ?? "distance",
  });
}

export async function searchCategory(params: {
  categoryGroupCode: string;
  lat: number;
  lng: number;
  radius?: number;
  page?: number;
  size?: number;
  sort?: "accuracy" | "distance";
}) {
  return requestKakaoLocal<KakaoPlaceDocument>("/search/category.json", {
    category_group_code: params.categoryGroupCode,
    x: params.lng,
    y: params.lat,
    radius: params.radius ?? 3000,
    page: params.page ?? 1,
    size: params.size ?? 10,
    sort: params.sort ?? "distance",
  });
}

export async function searchAddress(params: {
  query: string;
  page?: number;
  size?: number;
}) {
  return requestKakaoLocal<any>("/search/address.json", {
    query: params.query,
    page: params.page ?? 1,
    size: params.size ?? 10,
  });
}
```
