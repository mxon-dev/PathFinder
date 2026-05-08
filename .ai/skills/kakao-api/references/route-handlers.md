# Kakao Route Handlers

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
