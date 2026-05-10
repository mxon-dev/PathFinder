# Public Data Setup and Types

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
