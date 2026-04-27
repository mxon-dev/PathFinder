---
name: kakao-api
description: Provides configuration, implementation patterns, prohibited actions, and code templates for using Kakao Maps JavaScript API, Kakao Local REST API, and Kakao Map URLs in the PathFinder project.
---

# Kakao API Skill

## 0. Purpose of This Skill

This file defines the mandatory work guidelines for using Kakao APIs in the PathFinder project.

PathFinder is a mobile web-based walking route recommendation service, and Kakao APIs are used exclusively for the following purposes:

1. Map rendering
2. Searching for places near the current location
3. Converting coordinates to administrative regions
4. Converting user-entered locations/places to coordinates
5. Displaying markers and route previews on the walking course detail screen
6. Delegating actual navigation to Kakao Map URLs

## 1. Core Principles

### 1.1 Rules That Must Be Followed

- Kakao Maps JavaScript API is used exclusively for displaying maps in the browser.
- The Kakao REST API Key must never be exposed to the browser.
- All Kakao Local REST API calls must be executed on the server via Next.js Route Handlers.
- Kakao Local API response data must not be stored in a database or static files.
- Kakao Local API responses may only be used for processing the current request, displaying the current session, and computing immediate recommendations.
- Place data received from Kakao APIs must not be accumulated as a service-owned POI database.
- Since Kakao Map API does not provide a Navigation REST API, actual navigation must link to Kakao Map URLs.
- Walking route coordinates must not be calculated internally.
- Do not confuse the order of latitude and longitude.
- Always verify that the coordinate order differs between the map display API and REST API requests.

### 1.2 Coordinate Ordering Rules

The most common error when using Kakao APIs is confusing the latitude/longitude order.

| Usage | Order |
|---|---|
| Kakao Maps JavaScript API `new kakao.maps.LatLng()` | `lat, lng` |
| Kakao Local REST API `x`, `y` | `x=lng`, `y=lat` |
| Kakao Map URL `/link/by/walk/` | `name,lat,lng` |
| Internal project type | `{ lat: latitude, lng: longitude }` |

Internally, always use the following form:

```ts
type LatLng = {
  lat: number;
  lng: number;
};
```

Only when passing to the Kakao Local REST API, convert like this:

```ts
const params = new URLSearchParams({
  x: String(lng),
  y: String(lat),
});
```

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

## 3. Usage Scope in the Project

### 3.1 Kakao API Usage by Screen

| Screen | API Used | Purpose |
|---|---|---|
| Home screen | Browser Geolocation + Kakao Local Proxy | Check administrative region for current location |
| Home screen | Kakao Local Keyword Search | Search user-entered place when location permission is denied |
| Recommendation list | Kakao Local Keyword/Category Search | Supplement nearby candidates when public data candidates are insufficient |
| Recommendation list | Kakao Maps JavaScript API | Card-style map preview. Can be omitted in MVP. |
| Detail screen | Kakao Maps JavaScript API | Display map, markers, and Polyline |
| Detail screen | Kakao Map URL | Link to Kakao Maps app/web for navigation |

### 3.2 API Selection Criteria

| Situation | API to Use |
|---|---|
| Map display | Kakao Maps JavaScript API |
| Get city/district/town for current coordinates | Kakao Local `coord2regioncode` |
| Search user-entered place name | Kakao Local `keyword` |
| Search nearby parks/attractions/cultural facilities/cafes | Kakao Local `category` |
| Convert exact address to coordinates | Kakao Local `address` |
| Actual navigation | Kakao Map URL |
| Calculate walking route coordinates | Not implemented with Kakao API |

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

## 6. Kakao Maps JavaScript API Usage

### 6.1 SDK Loader

In Next.js, `window` is not available during server rendering, so the SDK must only be loaded on the client.

`src/lib/kakao/kakao-map-loader.ts`

```ts
let kakaoMapLoadingPromise: Promise<typeof window.kakao> | null = null;

declare global {
  interface Window {
    kakao: any;
  }
}

export function loadKakaoMapSdk(): Promise<typeof window.kakao> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Kakao Map SDK must be loaded in browser."));
  }

  if (window.kakao?.maps) {
    return Promise.resolve(window.kakao);
  }

  if (kakaoMapLoadingPromise) {
    return kakaoMapLoadingPromise;
  }

  const appKey = process.env.NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY;

  if (!appKey) {
    return Promise.reject(
      new Error("NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY is not defined."),
    );
  }

  kakaoMapLoadingPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[data-kakao-map-sdk="true"]',
    );

    if (existingScript) {
      existingScript.addEventListener("load", () => {
        window.kakao.maps.load(() => resolve(window.kakao));
      });
      existingScript.addEventListener("error", reject);
      return;
    }

    const script = document.createElement("script");
    script.dataset.kakaoMapSdk = "true";
    script.async = true;
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${appKey}&libraries=services&autoload=false`;

    script.onload = () => {
      window.kakao.maps.load(() => resolve(window.kakao));
    };

    script.onerror = () => {
      kakaoMapLoadingPromise = null;
      reject(new Error("Failed to load Kakao Map SDK."));
    };

    document.head.appendChild(script);
  });

  return kakaoMapLoadingPromise;
}
```

### 6.2 Map Component

`src/components/map/KakaoMap.tsx`

```tsx
"use client";

import { useEffect, useRef } from "react";
import { loadKakaoMapSdk } from "@/lib/kakao/kakao-map-loader";
import type { LatLng } from "@/lib/kakao/kakao-types";

type KakaoMapProps = {
  center: LatLng;
  level?: number;
  markers?: Array<{
    id: string;
    position: LatLng;
    title: string;
  }>;
  path?: LatLng[];
};

export function KakaoMap({
  center,
  level = 4,
  markers = [],
  path = [],
}: KakaoMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let map: any;
    let renderedMarkers: any[] = [];
    let polyline: any | null = null;

    async function renderMap() {
      if (!containerRef.current) return;

      const kakao = await loadKakaoMapSdk();

      map = new kakao.maps.Map(containerRef.current, {
        center: new kakao.maps.LatLng(center.lat, center.lng),
        level,
      });

      renderedMarkers = markers.map((marker) => {
        const kakaoMarker = new kakao.maps.Marker({
          map,
          position: new kakao.maps.LatLng(marker.position.lat, marker.position.lng),
          title: marker.title,
        });

        return kakaoMarker;
      });

      if (path.length >= 2) {
        polyline = new kakao.maps.Polyline({
          map,
          path: path.map((point) => new kakao.maps.LatLng(point.lat, point.lng)),
          strokeWeight: 5,
          strokeOpacity: 0.9,
          strokeStyle: "solid",
        });
      }
    }

    renderMap();

    return () => {
      renderedMarkers.forEach((marker) => marker.setMap(null));
      if (polyline) polyline.setMap(null);
    };
  }, [center.lat, center.lng, level, markers, path]);

  return <div ref={containerRef} className="h-full w-full" />;
}
```

### 6.3 Map Usage Checklist

- Declare `"use client"` at the top of the component.
- The map container must have an explicit height.
- Pass arguments to the `LatLng` constructor in `lat, lng` order.
- Load the map SDK only once.
- Load the map SDK only on the detail screen to reduce initial page cost.
- If the map fails to load, display text information and a Kakao Maps link.

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

## 8. Next.js Route Handler Implementation

### 8.1 Coordinate → Administrative Region Conversion

`src/app/api/kakao/coord-to-region/route.ts`

```ts
import { NextRequest, NextResponse } from "next/server";
import { coordToRegion } from "@/lib/kakao/kakao-local-client";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json(
      { message: "lat, lng are required." },
      { status: 400 },
    );
  }

  try {
    const data = await coordToRegion({ lat, lng });

    const legalRegion = data.documents.find((item) => item.region_type === "B");
    const adminRegion = data.documents.find((item) => item.region_type === "H");

    return NextResponse.json({
      legalRegion,
      adminRegion,
      rawCount: data.documents.length,
    });
  } catch (error) {
    return NextResponse.json(
      { message: "Failed to convert coordinate to region." },
      { status: 502 },
    );
  }
}
```

### 8.2 Keyword Place Search

`src/app/api/kakao/search-keyword/route.ts`

```ts
import { NextRequest, NextResponse } from "next/server";
import { searchKeyword } from "@/lib/kakao/kakao-local-client";
import type { NormalizedKakaoPlace } from "@/lib/kakao/kakao-types";

function normalizePlace(document: any): NormalizedKakaoPlace {
  return {
    id: document.id,
    name: document.place_name,
    categoryName: document.category_name,
    categoryGroupCode: document.category_group_code,
    addressName: document.address_name,
    roadAddressName: document.road_address_name,
    lat: Number(document.y),
    lng: Number(document.x),
    placeUrl: document.place_url,
    distanceM: document.distance ? Number(document.distance) : undefined,
    source: "kakao_local",
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const query = searchParams.get("query")?.trim();
  const lat = searchParams.get("lat") ? Number(searchParams.get("lat")) : undefined;
  const lng = searchParams.get("lng") ? Number(searchParams.get("lng")) : undefined;
  const radius = searchParams.get("radius")
    ? Number(searchParams.get("radius"))
    : 3000;

  if (!query) {
    return NextResponse.json(
      { message: "query is required." },
      { status: 400 },
    );
  }

  try {
    const data = await searchKeyword({
      query,
      lat,
      lng,
      radius,
      sort: lat && lng ? "distance" : "accuracy",
      size: 10,
    });

    return NextResponse.json({
      meta: data.meta,
      places: data.documents.map(normalizePlace),
    });
  } catch (error) {
    return NextResponse.json(
      { message: "Failed to search Kakao keyword." },
      { status: 502 },
    );
  }
}
```

### 8.3 Category Place Search

`src/app/api/kakao/search-category/route.ts`

```ts
import { NextRequest, NextResponse } from "next/server";
import { searchCategory } from "@/lib/kakao/kakao-local-client";

const ALLOWED_CATEGORY_GROUP_CODES = new Set([
  "AT4", // Tourist attractions
  "CT1", // Cultural facilities
  "CE7", // Cafes
]);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const categoryGroupCode = searchParams.get("categoryGroupCode")?.trim();
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));
  const radius = searchParams.get("radius")
    ? Number(searchParams.get("radius"))
    : 3000;

  if (!categoryGroupCode || !ALLOWED_CATEGORY_GROUP_CODES.has(categoryGroupCode)) {
    return NextResponse.json(
      { message: "Invalid categoryGroupCode." },
      { status: 400 },
    );
  }

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json(
      { message: "lat, lng are required." },
      { status: 400 },
    );
  }

  try {
    const data = await searchCategory({
      categoryGroupCode,
      lat,
      lng,
      radius,
      sort: "distance",
      size: 10,
    });

    return NextResponse.json({
      meta: data.meta,
      places: data.documents.map((document) => ({
        id: document.id,
        name: document.place_name,
        categoryName: document.category_name,
        categoryGroupCode: document.category_group_code,
        addressName: document.address_name,
        roadAddressName: document.road_address_name,
        lat: Number(document.y),
        lng: Number(document.x),
        placeUrl: document.place_url,
        distanceM: document.distance ? Number(document.distance) : undefined,
        source: "kakao_local",
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { message: "Failed to search Kakao category." },
      { status: 502 },
    );
  }
}
```

## 9. Kakao Local Search Strategy for PathFinder Recommendations

### 9.1 Search Queries by Place Type

| UI Place Type | Kakao Keyword Search Query |
|---|---|
| River | `강변`, `하천`, `수변공원`, `산책로` |
| Park | `공원`, `근린공원`, `산책로` |
| Mountain | `산`, `숲길`, `둘레길` |
| City | `광장`, `거리`, `문화시설`, `산책로` |
| Lake | `호수`, `저수지`, `생태공원`, `수변공원` |

### 9.2 Category Supplement Search

| Purpose | Kakao Category Code |
|---|---|
| Tourist attractions | `AT4` |
| Cultural facilities | `CT1` |
| Post-walk visit candidates | `CE7` |

### 9.3 Conditions for Calling Kakao Local API in Recommendation Logic

Call Kakao Local API only when recommendation candidates are insufficient.

```txt
1. Search candidates within 3km of current location from public data static JSON
2. Filter candidates by selected place type and desired duration
3. If fewer than 4 candidates, call Kakao Local API
4. Merge Kakao Local responses into the current recommendation result only
5. Do not save Kakao Local responses to files or database
```

### 9.4 Radius Policy

| Situation | Radius |
|---|---|
| Default recommendation | 3km |
| Insufficient candidates | 5km |
| Still insufficient at 5km | 10km |
| Still insufficient at 10km | Show "no results" message |

Do not set the Kakao Local search radius too large. This is a walking recommendation service, so nearby candidates take priority.

## 10. Kakao Map URL Generation

### 10.1 Map View URL

`src/lib/kakao/kakao-url.ts`

```ts
import type { LatLng } from "./kakao-types";

function encodeKakaoMapName(name: string) {
  return encodeURIComponent(name.replaceAll("/", " ").trim());
}

export function createKakaoMapViewUrl(params: {
  name: string;
  position: LatLng;
}) {
  const name = encodeKakaoMapName(params.name);
  const { lat, lng } = params.position;

  return `https://map.kakao.com/link/map/${name},${lat},${lng}`;
}
```

### 10.2 Walking Navigation URL

```ts
import type { LatLng } from "./kakao-types";

type RoutePoint = {
  name: string;
  position: LatLng;
};

function formatRoutePoint(point: RoutePoint) {
  const name = encodeURIComponent(point.name.replaceAll("/", " ").trim());
  return `${name},${point.position.lat},${point.position.lng}`;
}

export function createKakaoWalkRouteUrl(params: {
  points: RoutePoint[];
}) {
  if (params.points.length < 2) {
    throw new Error("At least two points are required.");
  }

  if (params.points.length > 7) {
    throw new Error(
      "Kakao Map URL supports start, up to 5 waypoints, and destination.",
    );
  }

  return `https://map.kakao.com/link/by/walk/${params.points
    .map(formatRoutePoint)
    .join("/")}`;
}
```

### 10.3 Round-Trip Walking Course URL

A course that goes from the current location to a specific place and back is handled as follows:

```ts
const url = createKakaoWalkRouteUrl({
  points: [
    {
      name: "Current Location",
      position: userLocation,
    },
    {
      name: course.title,
      position: course.center,
    },
    {
      name: "Current Location",
      position: userLocation,
    },
  ],
});
```

Note: Kakao Maps may not calculate a natural round-trip route, so display the following message in the UI:

```txt
For accurate walking directions, please check in Kakao Maps.
```

## 11. Recommendation Result Data Model

Places fetched from Kakao Local API are converted to the project's recommendation model before use.

```ts
export type CourseCandidate = {
  id: string;
  title: string;
  category: Array<"river" | "park" | "mountain" | "city" | "lake">;
  source: "public_park" | "public_trail" | "forest_trail" | "kakao_local";
  center: {
    lat: number;
    lng: number;
  };
  distanceKm?: number;
  durationMin?: number;
  description: string;
  kakaoPlaceUrl?: string;
  kakaoPlaceId?: string;
};
```

When converting Kakao Local responses, use the following rules:

```ts
function kakaoPlaceToCourseCandidate(place: NormalizedKakaoPlace): CourseCandidate {
  return {
    id: `kakao-${place.id}`,
    title: place.name,
    category: inferCategoriesFromKakaoPlace(place),
    source: "kakao_local",
    center: {
      lat: place.lat,
      lng: place.lng,
    },
    description: `${place.name} is a nearby walking candidate.`,
    kakaoPlaceUrl: place.placeUrl,
    kakaoPlaceId: place.id,
  };
}
```

## 12. Place Type Inference Rules

```ts
function inferCategoriesFromKakaoPlace(place: NormalizedKakaoPlace) {
  const text = `${place.name} ${place.categoryName} ${place.addressName}`;

  const categories = new Set<"river" | "park" | "mountain" | "city" | "lake">();

  if (/강|하천|천|수변|둔치|제방/.test(text)) categories.add("river");
  if (/공원|근린공원|어린이공원|도시공원|생태공원/.test(text)) categories.add("park");
  if (/산|숲|둘레길|등산|자락길/.test(text)) categories.add("mountain");
  if (/광장|거리|문화|카페|상가|도심/.test(text)) categories.add("city");
  if (/호수|저수지|연못|생태/.test(text)) categories.add("lake");

  if (categories.size === 0) categories.add("city");

  return Array.from(categories);
}
```

## 13. Error Handling

### 13.1 Kakao SDK Load Failure

Handling:

```txt
1. Display an error message in the map area
2. Continue to show course name, distance, and estimated duration
3. Continue to provide the Kakao Map URL button
```

UI message:

```txt
Failed to load the map. Please check it directly in Kakao Maps.
```

### 13.2 Kakao Local API Failure

Handling:

```txt
1. Use only public data-based candidates
2. If the user directly entered a place to search, prompt a retry
3. Log only status, endpoint, and query to the server log
4. Do not log the API Key
```

UI message:

```txt
Place search is temporarily unavailable. Please try again with different conditions.
```

### 13.3 Location Permission Denied

Handling:

```txt
1. Switch to manual input mode
2. Search the user-entered keyword using Kakao Keyword Search
3. Show the user candidates before using the first result as the reference coordinate
```

UI message:

```txt
Current location is unavailable. Please enter a region or place to use as the starting point.
```

## 14. Security Rules

### 14.1 Prohibited Actions

- Do not use `NEXT_PUBLIC_` prefix for `KAKAO_REST_API_KEY`.
- Do not use the REST API Key in client components.
- Do not expose the REST API Key in the browser network tab.
- Do not commit the API Key to Git.
- Do not log the full raw response from the Kakao Local API.
- Do not continuously log the user's exact location to the server log.
- Do not store the user's search history.

### 14.2 Permitted Actions

- The JavaScript Key can be used in the browser to load the map SDK.
- However, Web domain restriction must be configured in the Kakao Developer Console.
- Kakao Local API responses may be used only to generate recommendation results for the current request.
- The `place_url` from the Kakao Local API may be provided to users as a "View in Kakao Maps" link.

## 15. Caching Policy

### 15.1 Permitted Caching

| Target | Permitted | Method |
|---|---:|---|
| Map SDK load state | Permitted | Browser memory |
| Same search results within the same session | Permitted | Client memory |
| Storing Kakao Local API responses in server DB | Prohibited | Not used |
| Converting Kakao Local API responses to static JSON | Prohibited | Not used |

### 15.2 Session Memory Caching Example

```ts
const memoryCache = new Map<string, unknown>();

export async function getCachedInMemory<T>(
  key: string,
  fetcher: () => Promise<T>,
): Promise<T> {
  if (memoryCache.has(key)) {
    return memoryCache.get(key) as T;
  }

  const value = await fetcher();
  memoryCache.set(key, value);

  return value;
}
```

Note: This cache is maintained only in browser memory. Do not persist it.

## 16. Quota Management

Do not hard-code Kakao quota numbers in code, as they may change.
Check actual usage in the Kakao Developer Console quota screen during operation.

### 16.1 Ways to Reduce API Calls

- Do not load the map SDK on the home screen.
- Load the map SDK when entering the detail screen.
- Call Kakao Local API only when candidates are insufficient.
- Return at most 4 recommendation results.
- Do not make repeated calls with the same conditions on the same screen.
- Do not call on every keystroke; call on form submission.
- If autocomplete becomes necessary, apply debounce of at least 500ms in MVP.

## 17. Test Checklist

### 17.1 Map Display Tests

- [ ] Map displays on local domain
- [ ] Map displays on production domain
- [ ] Map container height is applied
- [ ] Map centers on current location
- [ ] Markers are displayed
- [ ] Polyline is displayed
- [ ] SDK load failure UI is confirmed

### 17.2 Local API Tests

- [ ] Coordinate → administrative region conversion
- [ ] Keyword search
- [ ] Category search
- [ ] Direct place name input search
- [ ] Verify REST API Key is not exposed in the browser
- [ ] Confirm 502 handling on API failure
- [ ] Confirm empty result handling

### 17.3 Navigation URL Tests

- [ ] Kakao Map navigation on mobile browser
- [ ] Walking mode URL generation
- [ ] Origin/destination coordinate order verification
- [ ] Korean place name encoding verification
- [ ] URL with waypoints verification

## 18. Implementation Order

When Kakao API work is required, proceed in the following order:

```txt
1. Set Kakao Keys in .env.local
2. Register localhost and production domain in Kakao Developer Console
3. Write kakao-types.ts
4. Write kakao-map-loader.ts
5. Write KakaoMap component
6. Write kakao-local-client.ts
7. Write /api/kakao/* Route Handlers
8. Call Kakao Local in recommendation logic when public data candidates are insufficient
9. Generate Kakao Map URL button on detail screen
10. Test security / quota / coordinate ordering
```

## 19. AI Agent Work Rules

When an AI Agent performs Kakao API-related work, it must follow these rules:

1. Read this file first and define the scope of work.
2. If the Kakao REST API Key is found in client-side code, fix it immediately.
3. Remove any code that stores Kakao Local responses.
4. Do not attempt to implement a Navigation REST API.
5. Verify coordinate ordering at every call site.
6. When creating a new API Route, always include failure responses and input validation.
7. Before working, re-verify Kakao API policies, quotas, and endpoints in the official documentation.
8. Prefer using existing types; if a new type is needed, add it to `kakao-types.ts`.
9. The recommendation logic must not depend solely on Kakao data — use public data first.
10. Do not store user location or search history.

## 20. Official Documentation

- Kakao Maps JavaScript API Guide: https://apis.map.kakao.com/web/guide/
- Kakao Maps JavaScript API Documentation: https://apis.map.kakao.com/web/documentation/
- Kakao Local REST API Guide: https://developers.kakao.com/docs/latest/ko/local/dev-guide
- Kakao Local API Overview: https://developers.kakao.com/docs/latest/ko/local/common
- Kakao Developers Quota: https://developers.kakao.com/docs/latest/ko/getting-started/quota
- Kakao Map API FAQ: https://devtalk.kakao.com/t/faq-api/125610
