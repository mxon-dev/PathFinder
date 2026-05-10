# Public Data Tourism Trails Dataset

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
