# Public Data Tree-Lined Roads Dataset

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
