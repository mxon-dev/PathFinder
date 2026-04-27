---
name: public-data-api
description: Provides work procedures and code templates for collecting, normalizing, validating, and converting Public Data Portal API data and standard datasets to static JSON in the PathFinder project.
---

# Public Data API Skill

## 0. Purpose of This Skill

This file defines the mandatory work guidelines for using public data APIs in the PathFinder project.

PathFinder is a mobile web-based walking route recommendation service, and public data is used for the following purposes:

1. Building nationwide park candidates
2. Building nationwide walking trail /둘레길 / tourism trail candidates
3. Supplementing tree-lined road and other walkable path candidates
4. Supplementing mountain / forest trail candidates
5. Ensuring recommendation result credibility
6. Reducing Kakao Local API call volume

Public data is the primary recommendation candidate data for PathFinder.
Kakao Local API is used only as a supplementary source when public data candidates are insufficient.

## 1. Core Principles

### 1.1 Rules That Must Be Followed

- Collect public data with scripts run before build or before deployment.
- Do not call the Public Data Portal API on every runtime request.
- Normalize all collected public data to the project's internal standard schema.
- Save only normalized results to `/data/*.json`.
- Do not use the raw response as-is for service data.
- Do not use data without coordinates as recommendation candidates directly.
- For address-only data, supplement coordinates via Kakao address search only when necessary.
- Before saving Kakao-supplemented coordinates, verify storage permissions against Kakao Local API policy.
- Retain source, reference date, and management agency name in normalized data.
- Always perform deduplication, coordinate validation, and distance/duration parsing.
- Do not store user location, search history, or recommendation history.

### 1.2 Data Priority

Use recommendation candidates in the following priority order:

```txt
Priority 1: Public data candidates with both coordinates and description
Priority 2: Public data candidates with start/end coordinates (trail data)
Priority 3: Public data candidates with address only (coordinates need supplementing)
Priority 4: Nearby place candidates from real-time Kakao Local API search
```

## 2. Environment Variables

Set the following values in `.env.local` or the build environment:

```bash
PUBLIC_DATA_SERVICE_KEY=your_public_data_portal_service_key
```

### 2.1 Key Usage Rules

| Key | Usage Location | Browser Exposure |
|---|---|---|
| `PUBLIC_DATA_SERVICE_KEY` | Data sync scripts or Next.js server | Must not be exposed to the browser |

### 2.2 Authentication Key Notes

The Public Data Portal may provide both an encoded and a decoded service key.

- When appending directly to a URL, follow the API documentation examples.
- When using `URLSearchParams`, check for double-encoding issues.
- If authentication errors occur, test with the encoded and decoded keys alternately.
- Do not commit the key to Git.

## 3. Public Data Usage Scope in the Project

### 3.1 Datasets to Use as Recommendation Candidates

| Dataset | Purpose | Priority |
|---|---|---|
| National Urban Park Standard Data | Park candidate recommendations | P0 |
| National Tourism Trail Standard Data | 둘레길, neighborhood alley, heritage trail, forest trail candidates | P0 |
| National Tree-Lined Road Standard Data | Supplement walkable tree-lined road candidates | P1 |
| Korea Forest Service Forest Service and 둘레길 Information | Mountain/forest/둘레길 candidates, GPX/SHP usage | P1 |

Build P0 datasets first in MVP.
Add P1 datasets when time allows.

### 3.2 Data Not to Use

- Real-time navigation road data
- Vehicle route data
- User location storage data
- Review/rating data
- Full commercial facility listings
- Tourism/administrative data unrelated to recommendations

## 4. Recommended Folder Structure

```txt
src/
  data/
    courses/
      parks.json
      trails.json
      tree-lined-roads.json
      forest-trails.json
      merged-candidates.json
  lib/
    public-data/
      public-data-types.ts
      public-data-client.ts
      normalizers/
        normalize-parks.ts
        normalize-trails.ts
        normalize-tree-lined-roads.ts
        normalize-forest-trails.ts
      validators/
        validate-coordinate.ts
        validate-course.ts
      merge-candidates.ts
      distance.ts
scripts/
  sync-public-data.ts
  sync-parks.ts
  sync-trails.ts
  sync-tree-lined-roads.ts
  sync-forest-trails.ts
```

## 5. Common Types

`src/lib/public-data/public-data-types.ts`

```ts
export type WalkCategory = "river" | "park" | "mountain" | "city" | "lake";

export type LatLng = {
  lat: number;
  lng: number;
};

export type PublicDataSource =
  | "data_go_kr_city_park"
  | "data_go_kr_tourism_trail"
  | "data_go_kr_tree_lined_road"
  | "data_go_kr_forest_trail";

export type NormalizedWalkCandidate = {
  id: string;
  title: string;
  categories: WalkCategory[];
  source: PublicDataSource;
  sourceName: string;
  sourceUrl: string;
  provider?: string;
  referenceDate?: string;
  managementAgency?: string;
  phone?: string;

  address?: {
    road?: string;
    lot?: string;
  };

  center?: LatLng;

  start?: {
    name?: string;
    address?: string;
    position?: LatLng;
  };

  end?: {
    name?: string;
    address?: string;
    position?: LatLng;
  };

  path?: LatLng[];

  distanceKm?: number;
  durationMin?: number;
  description?: string;

  facilities?: {
    exercise?: string;
    play?: string;
    convenience?: string;
    culture?: string;
    etc?: string;
  };

  raw?: Record<string, unknown>;
};

export type DataQualityIssue =
  | "MISSING_COORDINATE"
  | "INVALID_COORDINATE"
  | "MISSING_TITLE"
  | "DUPLICATED"
  | "TOO_FAR_FROM_KOREA"
  | "INVALID_DISTANCE"
  | "INVALID_DURATION";

export type ValidatedWalkCandidate = NormalizedWalkCandidate & {
  qualityScore: number;
  issues: DataQualityIssue[];
};
```

## 6. Coordinate Validation

`src/lib/public-data/validators/validate-coordinate.ts`

```ts
import type { LatLng } from "../public-data-types";

export function isValidKoreaCoordinate(position: LatLng | undefined): boolean {
  if (!position) return false;

  const { lat, lng } = position;

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;

  // Approximate bounding box for South Korea
  const isLatInKorea = lat >= 33 && lat <= 39;
  const isLngInKorea = lng >= 124 && lng <= 132;

  return isLatInKorea && isLngInKorea;
}

export function parseCoordinate(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();

  if (!normalized) {
    return undefined;
  }

  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : undefined;
}
```

## 7. Distance and Duration Parsing

`src/lib/public-data/normalizers/parse-walk-values.ts`

```ts
export function parseDistanceKm(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.replaceAll(",", "").trim();

  if (!normalized) {
    return undefined;
  }

  const kmMatch = normalized.match(/([\d.]+)\s*km/i);
  if (kmMatch) return Number(kmMatch[1]);

  const meterMatch = normalized.match(/([\d.]+)\s*m/i);
  if (meterMatch) return Number(meterMatch[1]) / 1000;

  const numberOnly = Number(normalized);
  return Number.isFinite(numberOnly) ? numberOnly : undefined;
}

export function parseDurationMin(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();

  if (!normalized) {
    return undefined;
  }

  const hourMatch = normalized.match(/(\d+)\s*시간/);
  const minMatch = normalized.match(/(\d+)\s*분/);

  const hours = hourMatch ? Number(hourMatch[1]) : 0;
  const minutes = minMatch ? Number(minMatch[1]) : 0;

  if (hours || minutes) {
    return hours * 60 + minutes;
  }

  const numberOnly = Number(normalized);
  return Number.isFinite(numberOnly) ? numberOnly : undefined;
}
```

## 8. Public Data API Common Client

Request URLs and parameter names may vary slightly by dataset on the Public Data Portal.
Check the request URL and parameters on the "Open API" tab of each dataset's detail page before use.

`src/lib/public-data/public-data-client.ts`

```ts
type PublicDataRequestParams = {
  endpoint: string;
  serviceKey?: string;
  pageNo?: number;
  numOfRows?: number;
  type?: "json" | "xml";
  extraParams?: Record<string, string | number | undefined>;
};

function getPublicDataServiceKey() {
  const serviceKey = process.env.PUBLIC_DATA_SERVICE_KEY;

  if (!serviceKey) {
    throw new Error("PUBLIC_DATA_SERVICE_KEY is not defined.");
  }

  return serviceKey;
}

export async function requestPublicData<T>({
  endpoint,
  serviceKey = getPublicDataServiceKey(),
  pageNo = 1,
  numOfRows = 1000,
  type = "json",
  extraParams = {},
}: PublicDataRequestParams): Promise<T> {
  const url = new URL(endpoint);

  url.searchParams.set("serviceKey", serviceKey);
  url.searchParams.set("pageNo", String(pageNo));
  url.searchParams.set("numOfRows", String(numOfRows));

  // Each Public Data API may use type, _type, or dataType — override with extraParams to match the API.
  url.searchParams.set("type", type);

  Object.entries(extraParams).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  const response = await fetch(url, {
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `Public Data API failed: ${response.status} ${response.statusText} ${body}`,
    );
  }

  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json") || type === "json") {
    return response.json();
  }

  const text = await response.text();

  throw new Error(
    `Unexpected non-json response. Check API type parameter. Response starts with: ${text.slice(
      0,
      200,
    )}`,
  );
}
```

## 9. Pagination Collection Pattern

Public data is often provided in pages based on `pageNo`, `numOfRows`, and `totalCount`.
Use the following pattern to fetch all data:

```ts
type PublicDataListResponse<T> = {
  response?: {
    header?: {
      resultCode?: string;
      resultMsg?: string;
    };
    body?: {
      items?: {
        item?: T[] | T;
      };
      totalCount?: number;
      pageNo?: number;
      numOfRows?: number;
    };
  };
};

function toArray<T>(value: T[] | T | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

export async function fetchAllPages<T>(params: {
  endpoint: string;
  extraParams?: Record<string, string | number | undefined>;
  numOfRows?: number;
}) {
  const numOfRows = params.numOfRows ?? 1000;
  let pageNo = 1;
  let totalCount = Infinity;
  const result: T[] = [];

  while ((pageNo - 1) * numOfRows < totalCount) {
    const data = await requestPublicData<PublicDataListResponse<T>>({
      endpoint: params.endpoint,
      pageNo,
      numOfRows,
      type: "json",
      extraParams: params.extraParams,
    });

    const body = data.response?.body;
    const header = data.response?.header;

    if (header?.resultCode && header.resultCode !== "00") {
      throw new Error(`Public Data API error: ${header.resultCode} ${header.resultMsg}`);
    }

    totalCount = Number(body?.totalCount ?? 0);
    result.push(...toArray(body?.items?.item));

    pageNo += 1;

    // Safety guard
    if (pageNo > 1000) {
      throw new Error("Too many pages. Check totalCount or API response shape.");
    }
  }

  return result;
}
```

If the response structure differs, create an adapter for that API.

## 10. Dataset-Specific Usage Rules

## 10.1 National Urban Park Standard Data

### Purpose

- Primary data for `park` type recommendations
- Provides nearby urban park candidates based on current location
- Calculates recommendation quality score from park name, coordinates, area, and facility info

### Fields to Use

| Source Field | Normalized Field | Description |
|---|---|---|
| 관리번호 | `id` | Unique park identifier |
| 공원명 | `title` | Course/place name |
| 공원구분 | `categories`, `description` | Neighborhood park, children's park, etc. |
| 소재지도로명주소 | `address.road` | Road name address |
| 소재지지번주소 | `address.lot` | Lot number address |
| 위도 | `center.lat` | Latitude |
| 경도 | `center.lng` | Longitude |
| 공원면적 | `raw.area` | Supplementary info for recommendation quality |
| 공원보유시설(운동시설) | `facilities.exercise` | Facility info |
| 공원보유시설(유희시설) | `facilities.play` | Facility info |
| 공원보유시설(편익시설) | `facilities.convenience` | Facility info |
| 공원보유시설(교양시설) | `facilities.culture` | Facility info |
| 공원보유시설(기타시설) | `facilities.etc` | Facility info |
| 관리기관명 | `managementAgency` | Attribution |
| 전화번호 | `phone` | Contact |
| 데이터기준일자 | `referenceDate` | Data reference date |

### Normalization Code

`src/lib/public-data/normalizers/normalize-parks.ts`

```ts
import type { NormalizedWalkCandidate } from "../public-data-types";
import { parseCoordinate } from "../validators/validate-coordinate";

type RawCityPark = Record<string, any>;

export function normalizeCityPark(row: RawCityPark): NormalizedWalkCandidate | null {
  const title = row["공원명"] ?? row["parkNm"] ?? row["PARK_NM"];
  const id = row["관리번호"] ?? row["mngNo"] ?? title;
  const lat = parseCoordinate(row["위도"] ?? row["latitude"] ?? row["LATITUDE"]);
  const lng = parseCoordinate(row["경도"] ?? row["longitude"] ?? row["LONGITUDE"]);

  if (!title) return null;

  return {
    id: `park-${String(id).trim()}`,
    title: String(title).trim(),
    categories: ["park"],
    source: "data_go_kr_city_park",
    sourceName: "전국도시공원정보표준데이터",
    sourceUrl: "https://www.data.go.kr/data/15012890/standard.do",
    managementAgency: row["관리기관명"] ?? row["institutionNm"],
    phone: row["전화번호"] ?? row["phoneNumber"],
    referenceDate: row["데이터기준일자"] ?? row["referenceDate"],
    address: {
      road: row["소재지도로명주소"] ?? row["rdnmadr"],
      lot: row["소재지지번주소"] ?? row["lnmadr"],
    },
    center: lat !== undefined && lng !== undefined ? { lat, lng } : undefined,
    description: createParkDescription(row),
    facilities: {
      exercise: row["공원보유시설(운동시설)"] ?? row["mvmFclty"],
      play: row["공원보유시설(유희시설)"] ?? row["amsmtFclty"],
      convenience: row["공원보유시설(편익시설)"] ?? row["cnvnncFclty"],
      culture: row["공원보유시설(교양시설)"] ?? row["cltrFclty"],
      etc: row["공원보유시설(기타시설)"] ?? row["etcFclty"],
    },
    raw: {
      parkType: row["공원구분"] ?? row["parkSe"],
      area: row["공원면적"] ?? row["parkAr"],
    },
  };
}

function createParkDescription(row: RawCityPark) {
  const name = row["공원명"] ?? row["parkNm"];
  const type = row["공원구분"] ?? row["parkSe"];
  const agency = row["관리기관명"] ?? row["institutionNm"];

  return [name, type, agency]
    .filter(Boolean)
    .join(" · ");
}
```

## 10.2 National Tourism Trail Standard Data

### Purpose

- Provides `mountain`, `city`, `river`, and `park` walking trail candidates
- Recommends walking courses such as 둘레길, neighborhood alleys, heritage trails, and forest trails
- Matches total distance and duration with the user's selected walking time

### Fields to Use

| Source Field | Normalized Field | Description |
|---|---|---|
| 길명 | `title` | Course name |
| 길소개 | `description` | Course description |
| 총길이 | `distanceKm` | Distance |
| 총소요시간 | `durationMin` | Estimated duration |
| 시작지점명 | `start.name` | Start point name |
| 시작지점도로명주소 | `start.address` | Start address |
| 시작지점소재지지번주소 | `start.address` (supplement) | Start address |
| 종료지점명 | `end.name` | End point name |
| 종료지점소재지도로명주소 | `end.address` | End address |
| 종료지점소재지지번주소 | `end.address` (supplement) | End address |
| 경로정보 | `raw.routeText` | Waypoint text |
| 관리기관전화번호 | `phone` | Contact |
| 관리기관명 | `managementAgency` | Attribution |
| 데이터기준일자 | `referenceDate` | Data reference date |

### Normalization Code

`src/lib/public-data/normalizers/normalize-trails.ts`

```ts
import type { NormalizedWalkCandidate, WalkCategory } from "../public-data-types";
import { parseDistanceKm, parseDurationMin } from "./parse-walk-values";

type RawTourismTrail = Record<string, any>;

export function normalizeTourismTrail(
  row: RawTourismTrail,
): NormalizedWalkCandidate | null {
  const title = row["길명"] ?? row["pathNm"] ?? row["name"];

  if (!title) return null;

  const description = row["길소개"] ?? row["pathIntrcn"] ?? "";
  const routeText = row["경로정보"] ?? row["coursInfo"] ?? "";
  const combinedText = `${title} ${description} ${routeText}`;

  return {
    id: `trail-${hashText(String(title) + String(routeText))}`,
    title: String(title).trim(),
    categories: inferTrailCategories(combinedText),
    source: "data_go_kr_tourism_trail",
    sourceName: "전국길관광정보표준데이터",
    sourceUrl: "https://www.data.go.kr/data/15017321/standard.do",
    description: String(description || routeText || title).trim(),
    distanceKm: parseDistanceKm(row["총길이"] ?? row["totalLength"]),
    durationMin: parseDurationMin(row["총소요시간"] ?? row["reqreTime"]),
    start: {
      name: row["시작지점명"] ?? row["startPointNm"],
      address:
        row["시작지점도로명주소"] ??
        row["시작지점소재지지번주소"] ??
        row["startRoadAddress"],
    },
    end: {
      name: row["종료지점명"] ?? row["endPointNm"],
      address:
        row["종료지점소재지도로명주소"] ??
        row["종료지점소재지지번주소"] ??
        row["endRoadAddress"],
    },
    phone: row["관리기관전화번호"] ?? row["phoneNumber"],
    managementAgency: row["관리기관명"] ?? row["institutionNm"],
    referenceDate: row["데이터기준일자"] ?? row["referenceDate"],
    raw: {
      routeText,
    },
  };
}

function inferTrailCategories(text: string): WalkCategory[] {
  const categories = new Set<WalkCategory>();

  if (/강|하천|천|수변|해안|갈맷길/.test(text)) categories.add("river");
  if (/공원|생태/.test(text)) categories.add("park");
  if (/산|숲|둘레길|등산|자락길|탐방로/.test(text)) categories.add("mountain");
  if (/도심|거리|골목|문화|유적|역사/.test(text)) categories.add("city");
  if (/호수|저수지|연못/.test(text)) categories.add("lake");

  if (categories.size === 0) categories.add("city");

  return Array.from(categories);
}

function hashText(text: string) {
  let hash = 0;

  for (let i = 0; i < text.length; i += 1) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }

  return Math.abs(hash).toString(36);
}
```

### Coordinate Supplementation Rules

National Tourism Trail Standard Data often has start/end addresses but no coordinates.

Supplement coordinates in the following order:

```txt
1. If start point road address exists, check coordinates via Kakao Address Search
2. Otherwise use the lot number address
3. Process end point the same way
4. If coordinate supplementation fails, exclude from recommendation candidates or keep as text-only candidate
5. Do not permanently store supplemented coordinates until Kakao policy is confirmed
```

In MVP, trail data without coordinates may be excluded from recommendations.
Use park data that already has coordinates in the public data as the primary source.

## 10.3 National Tree-Lined Road Standard Data

### Purpose

- Supplement urban walking candidates
- Add walkable road candidates
- Do not use seasonal descriptions in MVP

### Fields to Use

| Source Field | Normalized Field | Description |
|---|---|---|
| 가로수길명 | `title` | Road name |
| 가로수길시작위도 | `start.position.lat` | Start latitude |
| 가로수길시작경도 | `start.position.lng` | Start longitude |
| 가로수길종료위도 | `end.position.lat` | End latitude |
| 가로수길종료경도 | `end.position.lng` | End longitude |
| 가로수종류 | `raw.treeType` | Tree species |
| 가로수수량 | `raw.treeCount` | Tree count |
| 가로수길길이 | `distanceKm` | Length |
| 가로수길소개 | `description` | Description |
| 도로명 | `address.road` | Road name |
| 관리기관명 | `managementAgency` | Management agency |
| 데이터기준일자 | `referenceDate` | Reference date |

### Normalization Code

`src/lib/public-data/normalizers/normalize-tree-lined-roads.ts`

```ts
import type { NormalizedWalkCandidate } from "../public-data-types";
import { parseCoordinate } from "../validators/validate-coordinate";
import { parseDistanceKm } from "./parse-walk-values";

type RawTreeLinedRoad = Record<string, any>;

export function normalizeTreeLinedRoad(
  row: RawTreeLinedRoad,
): NormalizedWalkCandidate | null {
  const title = row["가로수길명"] ?? row["roadsideTreeNm"];

  if (!title) return null;

  const startLat = parseCoordinate(row["가로수길시작위도"]);
  const startLng = parseCoordinate(row["가로수길시작경도"]);
  const endLat = parseCoordinate(row["가로수길종료위도"]);
  const endLng = parseCoordinate(row["가로수길종료경도"]);

  const start =
    startLat !== undefined && startLng !== undefined
      ? { position: { lat: startLat, lng: startLng } }
      : undefined;

  const end =
    endLat !== undefined && endLng !== undefined
      ? { position: { lat: endLat, lng: endLng } }
      : undefined;

  return {
    id: `tree-road-${String(title).trim()}`,
    title: String(title).trim(),
    categories: ["city"],
    source: "data_go_kr_tree_lined_road",
    sourceName: "전국가로수길정보표준데이터",
    sourceUrl: "https://www.data.go.kr/data/15021145/standard.do",
    description:
      row["가로수길소개"] ??
      `${title} is a tree-lined road candidate good for walking.`,
    address: {
      road: row["도로명"],
    },
    start,
    end,
    center: getCenter(start?.position, end?.position),
    distanceKm: parseDistanceKm(row["가로수길길이"]),
    managementAgency: row["관리기관명"],
    phone: row["관리기관전화번호"],
    referenceDate: row["데이터기준일자"],
    raw: {
      treeType: row["가로수종류"],
      treeCount: row["가로수수량"],
      roadType: row["도로종류"],
      roadSection: row["도로구간"],
    },
  };
}

function getCenter(
  start?: { lat: number; lng: number },
  end?: { lat: number; lng: number },
) {
  if (!start && !end) return undefined;
  if (start && !end) return start;
  if (!start && end) return end;

  return {
    lat: (start!.lat + end!.lat) / 2,
    lng: (start!.lng + end!.lng) / 2,
  };
}
```

## 10.4 Korea Forest Service Forest Service and 둘레길 Information

### Purpose

- Supplement `mountain`, forest trail, and 둘레길 type candidates
- Display map Polylines if GPX or SHP files are available
- Many courses are longer than typical walks — use with care for sub-30-minute recommendations

### Fields to Use

| Source Field | Normalized Field | Description |
|---|---|---|
| dullegilvia | `raw.via` | Waypoints |
| dullegilintro | `description` | Introduction |
| dullegildetailintro | `raw.detailIntro` | Detailed introduction |
| dullegildistance | `distanceKm` | Distance |
| dullegiltime | `durationMin` | Duration |
| dullegilgpx | `raw.gpxUrl` | GPX file |
| dullegilshp | `raw.shpUrl` | SHP file |
| dullegilsections | `start.name` | Start section |
| dullegilsectione | `end.name` | End section |

### Usage Rules

```txt
1. If a GPX URL is available, parse the GPX to generate path coordinates
2. SHP is not required in MVP
3. Exclude courses with duration over 90 minutes from default recommendations
4. Show these preferentially only when the user selects mountain/forest trail filter
5. Classify courses with very long distance and duration as "long-distance courses"
```

## 11. Data Quality Validation

`src/lib/public-data/validators/validate-course.ts`

```ts
import type {
  DataQualityIssue,
  NormalizedWalkCandidate,
  ValidatedWalkCandidate,
} from "../public-data-types";
import { isValidKoreaCoordinate } from "./validate-coordinate";

export function validateCandidate(
  candidate: NormalizedWalkCandidate,
): ValidatedWalkCandidate {
  const issues: DataQualityIssue[] = [];

  if (!candidate.title?.trim()) {
    issues.push("MISSING_TITLE");
  }

  const hasAnyCoordinate =
    isValidKoreaCoordinate(candidate.center) ||
    isValidKoreaCoordinate(candidate.start?.position) ||
    isValidKoreaCoordinate(candidate.end?.position) ||
    Boolean(candidate.path?.some(isValidKoreaCoordinate));

  if (!hasAnyCoordinate) {
    issues.push("MISSING_COORDINATE");
  }

  if (candidate.center && !isValidKoreaCoordinate(candidate.center)) {
    issues.push("INVALID_COORDINATE");
  }

  if (
    candidate.distanceKm !== undefined &&
    (!Number.isFinite(candidate.distanceKm) || candidate.distanceKm <= 0)
  ) {
    issues.push("INVALID_DISTANCE");
  }

  if (
    candidate.durationMin !== undefined &&
    (!Number.isFinite(candidate.durationMin) || candidate.durationMin <= 0)
  ) {
    issues.push("INVALID_DURATION");
  }

  return {
    ...candidate,
    issues,
    qualityScore: calculateQualityScore(candidate, issues),
  };
}

function calculateQualityScore(
  candidate: NormalizedWalkCandidate,
  issues: DataQualityIssue[],
) {
  let score = 100;

  score -= issues.length * 20;

  if (candidate.description) score += 5;
  if (candidate.distanceKm) score += 5;
  if (candidate.durationMin) score += 5;
  if (candidate.path && candidate.path.length >= 2) score += 10;
  if (candidate.center) score += 5;
  if (candidate.referenceDate) score += 5;

  return Math.max(0, Math.min(100, score));
}
```

## 12. Deduplication

Apply the following criteria in order to determine duplicates:

```txt
1. Same source + same id
2. Same title and center coordinates within 50m
3. Very similar title and same address
4. Same start/end points and same distance
```

Simple MVP implementation:

```ts
import type { NormalizedWalkCandidate } from "./public-data-types";

export function dedupeCandidates(
  candidates: NormalizedWalkCandidate[],
): NormalizedWalkCandidate[] {
  const seen = new Set<string>();
  const result: NormalizedWalkCandidate[] = [];

  for (const candidate of candidates) {
    const key = [
      normalizeText(candidate.title),
      candidate.center?.lat.toFixed(5),
      candidate.center?.lng.toFixed(5),
      candidate.address?.road,
      candidate.address?.lot,
    ]
      .filter(Boolean)
      .join("|");

    if (seen.has(key)) continue;

    seen.add(key);
    result.push(candidate);
  }

  return result;
}

function normalizeText(value: string) {
  return value.replace(/\s+/g, "").toLowerCase();
}
```

## 13. Merged Candidate Data Generation for Recommendations

`src/lib/public-data/merge-candidates.ts`

```ts
import type {
  NormalizedWalkCandidate,
  ValidatedWalkCandidate,
} from "./public-data-types";
import { dedupeCandidates } from "./dedupe-candidates";
import { validateCandidate } from "./validators/validate-course";

export function mergeCandidates(
  groups: NormalizedWalkCandidate[][],
): ValidatedWalkCandidate[] {
  const merged = groups.flat();
  const deduped = dedupeCandidates(merged);

  return deduped
    .map(validateCandidate)
    .filter((candidate) => {
      return !candidate.issues.includes("MISSING_TITLE");
    })
    .sort((a, b) => b.qualityScore - a.qualityScore);
}
```

## 14. Static JSON Generation Script

`scripts/sync-public-data.ts`

```ts
import fs from "node:fs/promises";
import path from "node:path";
import { normalizeCityPark } from "@/lib/public-data/normalizers/normalize-parks";
import { normalizeTourismTrail } from "@/lib/public-data/normalizers/normalize-trails";
import { mergeCandidates } from "@/lib/public-data/merge-candidates";

async function main() {
  const parksRaw = await fetchCityParks();
  const trailsRaw = await fetchTourismTrails();

  const parks = parksRaw
    .map(normalizeCityPark)
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  const trails = trailsRaw
    .map(normalizeTourismTrail)
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  const merged = mergeCandidates([parks, trails]);

  await writeJson("parks.json", parks);
  await writeJson("trails.json", trails);
  await writeJson("merged-candidates.json", merged);

  console.log(`parks: ${parks.length}`);
  console.log(`trails: ${trails.length}`);
  console.log(`merged: ${merged.length}`);
}

async function writeJson(fileName: string, data: unknown) {
  const outputPath = path.join(process.cwd(), "src", "data", "courses", fileName);

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, JSON.stringify(data, null, 2), "utf-8");
}

async function fetchCityParks() {
  // Check the actual endpoint on the Open API tab of the dataset page.
  // e.g., https://www.data.go.kr/data/15012890/standard.do
  return [];
}

async function fetchTourismTrails() {
  // Check the actual endpoint on the Open API tab of the dataset page.
  // e.g., https://www.data.go.kr/data/15017321/standard.do
  return [];
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
```

`package.json`

```json
{
  "scripts": {
    "sync:public-data": "tsx scripts/sync-public-data.ts"
  }
}
```

## 15. Usage in Recommendation Logic

### 15.1 Static JSON Import

```ts
import candidates from "@/data/courses/merged-candidates.json";
import type { ValidatedWalkCandidate } from "@/lib/public-data/public-data-types";

export function getAllPublicCandidates() {
  return candidates as ValidatedWalkCandidate[];
}
```

### 15.2 Filtering by Current Location

```ts
import type { LatLng, ValidatedWalkCandidate } from "./public-data-types";

export function filterByRadius(params: {
  candidates: ValidatedWalkCandidate[];
  center: LatLng;
  radiusKm: number;
}) {
  return params.candidates.filter((candidate) => {
    const candidateCenter =
      candidate.center ??
      candidate.start?.position ??
      candidate.end?.position ??
      candidate.path?.[0];

    if (!candidateCenter) return false;

    const distanceKm = getDistanceKm(params.center, candidateCenter);

    return distanceKm <= params.radiusKm;
  });
}

export function getDistanceKm(a: LatLng, b: LatLng) {
  const earthRadiusKm = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);

  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);

  return 2 * earthRadiusKm * Math.asin(Math.sqrt(h));
}

function toRad(value: number) {
  return (value * Math.PI) / 180;
}
```

### 15.3 Duration Matching

```ts
export function estimateDurationMin(distanceKm?: number) {
  if (!distanceKm) return undefined;

  // Based on average adult walking speed of 4 km/h
  return Math.round((distanceKm / 4) * 60);
}

export function matchDuration(params: {
  candidateDurationMin?: number;
  candidateDistanceKm?: number;
  preferredDurationMin: number;
}) {
  const duration =
    params.candidateDurationMin ??
    estimateDurationMin(params.candidateDistanceKm);

  if (!duration) return 0;

  const diff = Math.abs(duration - params.preferredDurationMin);

  if (diff <= 10) return 25;
  if (diff <= 20) return 15;
  if (diff <= 30) return 8;

  return 0;
}
```

### 15.4 Category Matching

```ts
import type { WalkCategory } from "./public-data-types";

export function matchCategories(params: {
  candidateCategories: WalkCategory[];
  preferredCategories: WalkCategory[];
}) {
  if (params.preferredCategories.length === 0) return 10;

  const matchedCount = params.preferredCategories.filter((category) =>
    params.candidateCategories.includes(category),
  ).length;

  return Math.min(25, matchedCount * 15);
}
```

## 16. Data Update Policy

### 16.1 MVP Update Frequency

| Data | Update Frequency |
|---|---|
| National Urban Park Information | Monthly or manual |
| National Tourism Trail Information | Monthly or manual |
| National Tree-Lined Road Information | Manual as needed |
| Korea Forest Service 둘레길 Information | Manual as needed |

Do not use automated cron jobs in MVP.
When data needs updating, run the script locally and commit the resulting JSON.

```bash
pnpm sync:public-data
```

### 16.2 What to Check When Updating Data

- [ ] API call success
- [ ] totalCount matches actual collected count
- [ ] Number of entries without coordinates
- [ ] Number of entries with invalid coordinates
- [ ] Count before and after deduplication
- [ ] Final `merged-candidates.json` count
- [ ] File size
- [ ] Recommendation API response time

## 17. Public Data API Failure Handling

### 17.1 Failure During Sync

```txt
1. Terminate the script immediately
2. Log which dataset failed
3. Log response status, resultCode, resultMsg
4. Mask the authentication key in logs
5. Do not overwrite existing JSON files
```

### 17.2 Failure at Runtime

Do not call the Public Data API at runtime in MVP.
Therefore, only consider static JSON import failures as runtime failures.

Handling:

```txt
1. Return empty array from recommendation API
2. Attempt supplementation via Kakao Local API
3. If still no candidates, show guidance message
```

UI message:

```txt
No nearby walking candidates found. Please try changing your location or conditions.
```

## 18. Public Data + Kakao API Combination Rules

### 18.1 Basic Combination

```txt
1. Search nearby candidates from public data static JSON
2. If 4 or more recommendation candidates exist, do not call Kakao Local API
3. If fewer than 4 candidates, supplement with Kakao Local API
4. Show public data candidates first in the final results
5. Mark Kakao candidates with source as kakao_local
```

### 18.2 Address Coordinate Supplementation

Kakao address search may be used for public data without coordinates.

Follow these rules:

```txt
1. For bulk coordinate supplementation at build time, confirm policy first
2. In MVP, the default is to exclude data without coordinates
3. Coordinate supplementation is only allowed for a specific candidate selected by the user at runtime
4. Do not save the supplemented result — use it only for the current request
```

### 18.3 Route Display on Detail Screen

| Data State | Map Display |
|---|---|
| Has path coordinates | Display actual Polyline |
| Has start/end coordinates | Display straight line or simple Polyline from start to end |
| Has center coordinate only | Display center marker |
| No coordinates | Do not display map; show text only |

## 19. Recommendation Quality Score

Use the following criteria for public data candidate quality scores:

| Item | Score |
|---|---:|
| Has coordinates | +30 |
| Has description | +10 |
| Has distance | +10 |
| Has duration | +10 |
| Has path coordinates | +20 |
| Has reference date | +5 |
| Has management agency | +5 |
| Per issue | -20 |

Recommendation scores are calculated separately:

```txt
recommendScore =
  distanceScore
  + durationScore
  + categoryScore
  + qualityScore * 0.2
```

## 20. Data Attribution Display

Include attribution in the recommendation detail screen or developer-facing data.

Example:

```txt
Source: National Urban Park Standard Data / Agency: Seoul Metropolitan Government ○○ District / Reference Date: 2026-03-31
```

The display may be abbreviated in the user-facing UI.
However, attribution fields must always be maintained in internal data.

## 21. Prohibited Actions

- Do not display raw public data on screen without validation.
- Do not display candidates without coordinates on the map.
- Do not display estimated durations as exact times for candidates without duration data.
- Always display estimated values with "approx." or "estimated".
- Do not call the Public Data API on every user request.
- Do not expose API authentication keys to the client.
- Do not remove the data reference date.
- Do not remove the management agency name.
- Do not permanently store Kakao-supplemented data without confirming policy.

## 22. Test Checklist

### 22.1 Data Collection Tests

- [ ] API authentication key loaded
- [ ] First page call succeeds
- [ ] Full pagination collection
- [ ] totalCount matches collected count
- [ ] API error code handling
- [ ] Encoded/decoded key issue check

### 22.2 Normalization Tests

- [ ] Park name / trail name missing entries removed
- [ ] Latitude/longitude parsed
- [ ] South Korea coordinate range validated
- [ ] Distance parsed
- [ ] Duration parsed
- [ ] Category inferred
- [ ] Source field retained
- [ ] Reference date retained

### 22.3 Recommendation Tests

- [ ] Radius filtering by current location
- [ ] Duration matching
- [ ] Category matching
- [ ] Quality score applied
- [ ] Kakao Local supplement when candidates are insufficient
- [ ] No-candidate handling
- [ ] Map display availability check for detail screen

## 23. Implementation Order

When public data API work is required, proceed in the following order:

```txt
1. Check target dataset on data.go.kr
2. Apply for access and confirm authentication key
3. Check request URL and parameters on the Open API tab
4. Write or update public-data-types.ts
5. Write fetch functions per dataset
6. Write normalizer per dataset
7. Validate coordinates, distance, and duration
8. Deduplicate
9. Generate merged-candidates.json
10. Use static JSON in recommendation logic
11. Supplement with Kakao Local API when candidates are insufficient
12. Verify recommendation results on mobile screen
```

## 24. AI Agent Work Rules

When an AI Agent performs public data-related work, it must follow these rules:

1. Read this file first and define the scope of work.
2. When adding new public data, write the dataset purpose, fields to use, and normalization rules first.
3. Do not connect raw responses directly to the screen.
4. Create the normalized type first, then convert to that type.
5. Do not use data that fails coordinate validation as map candidates.
6. Always handle the possibility of distance and duration parsing failure.
7. Do not put the API authentication key in browser-side code.
8. Prefer generating static JSON over runtime calls.
9. If the collection script fails, do not overwrite existing JSON.
10. Do not remove data source and reference date.
11. When combining with Kakao API, confirm Kakao data storage policy.
12. Before working, re-verify the actual request URL and parameters on the official Public Data Portal page.

## 25. Official Data Pages

- National Urban Park Standard Data: https://www.data.go.kr/data/15012890/standard.do
- National Tourism Trail Standard Data: https://www.data.go.kr/data/15017321/standard.do
- National Tree-Lined Road Standard Data: https://www.data.go.kr/data/15021145/standard.do
- Korea Forest Service Forest Service and 둘레길 Information: https://www.data.go.kr/data/15002725/openapi.do
