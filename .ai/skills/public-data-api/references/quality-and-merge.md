# Public Data Quality, Deduplication, and Merge

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
