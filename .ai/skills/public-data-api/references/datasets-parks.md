# Public Data Parks Dataset

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
