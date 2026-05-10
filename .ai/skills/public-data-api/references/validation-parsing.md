# Public Data Validation and Parsing

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
