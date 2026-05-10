# Kakao Recommendation Search

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
