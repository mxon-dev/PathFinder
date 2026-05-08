# Public Data Recommendation Logic

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
