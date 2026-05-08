# Kakao Setup and Types

## 2. Environment Variables

Set the following values in `.env.local`:

```bash
NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY=your_kakao_javascript_key
KAKAO_REST_API_KEY=your_kakao_rest_api_key
```

### 2.1 Key Usage Rules

| Key | Usage Location | Browser Exposure |
|---|---|---|
| `NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY` | Browser map SDK load | Allowed. However, domain restriction in Kakao Developer Console is required. |
| `KAKAO_REST_API_KEY` | Next.js Route Handler | Must not be exposed to the browser |

### 2.2 Kakao Developer Console Setup

Complete the following settings in the Kakao Developer Console:

1. Create an application
2. Platform > Register Web site domain
3. Register local development domain
   - `http://localhost:3000`
4. Register production domain
   - e.g., `https://pathfinder.vercel.app`
5. Confirm Kakao Map API is enabled
6. Confirm REST API Key and JavaScript Key

If the domain is not registered, Kakao Maps JavaScript API may not display correctly.

## 4. Next.js Recommended Folder Structure

```txt
src/
  app/
    api/
      kakao/
        coord-to-region/
          route.ts
        search-keyword/
          route.ts
        search-category/
          route.ts
        search-address/
          route.ts
  lib/
    kakao/
      kakao-map-loader.ts
      kakao-url.ts
      kakao-types.ts
      kakao-local-client.ts
  components/
    map/
      KakaoMap.tsx
      CoursePolyline.tsx
      CourseMarker.tsx
```

## 5. Type Definitions

`src/lib/kakao/kakao-types.ts`

```ts
export type LatLng = {
  lat: number;
  lng: number;
};

export type KakaoRegionDocument = {
  region_type: "B" | "H";
  code: string;
  address_name: string;
  region_1depth_name: string;
  region_2depth_name: string;
  region_3depth_name: string;
  region_4depth_name: string;
  x: number;
  y: number;
};

export type KakaoPlaceDocument = {
  id: string;
  place_name: string;
  category_name: string;
  category_group_code: string;
  category_group_name: string;
  phone: string;
  address_name: string;
  road_address_name: string;
  x: string;
  y: string;
  place_url: string;
  distance: string;
};

export type KakaoLocalMeta = {
  total_count: number;
  pageable_count: number;
  is_end: boolean;
  same_name?: {
    region: string[];
    keyword: string;
    selected_region: string;
  };
};

export type KakaoLocalResponse<T> = {
  meta: KakaoLocalMeta;
  documents: T[];
};

export type NormalizedKakaoPlace = {
  id: string;
  name: string;
  categoryName: string;
  categoryGroupCode: string;
  addressName: string;
  roadAddressName: string;
  lat: number;
  lng: number;
  placeUrl: string;
  distanceM?: number;
  source: "kakao_local";
};
```
