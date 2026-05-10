# Kakao Map URLs

## 10. Kakao Map URL Generation

### 10.1 Map View URL

`src/lib/kakao/kakao-url.ts`

```ts
import type { LatLng } from "./kakao-types";

function encodeKakaoMapName(name: string) {
  return encodeURIComponent(name.replaceAll("/", " ").trim());
}

export function createKakaoMapViewUrl(params: {
  name: string;
  position: LatLng;
}) {
  const name = encodeKakaoMapName(params.name);
  const { lat, lng } = params.position;

  return `https://map.kakao.com/link/map/${name},${lat},${lng}`;
}
```

### 10.2 Walking Navigation URL

```ts
import type { LatLng } from "./kakao-types";

type RoutePoint = {
  name: string;
  position: LatLng;
};

function formatRoutePoint(point: RoutePoint) {
  const name = encodeURIComponent(point.name.replaceAll("/", " ").trim());
  return `${name},${point.position.lat},${point.position.lng}`;
}

export function createKakaoWalkRouteUrl(params: {
  points: RoutePoint[];
}) {
  if (params.points.length < 2) {
    throw new Error("At least two points are required.");
  }

  if (params.points.length > 7) {
    throw new Error(
      "Kakao Map URL supports start, up to 5 waypoints, and destination.",
    );
  }

  return `https://map.kakao.com/link/by/walk/${params.points
    .map(formatRoutePoint)
    .join("/")}`;
}
```

### 10.3 Round-Trip Walking Course URL

A course that goes from the current location to a specific place and back is handled as follows:

```ts
const url = createKakaoWalkRouteUrl({
  points: [
    {
      name: "Current Location",
      position: userLocation,
    },
    {
      name: course.title,
      position: course.center,
    },
    {
      name: "Current Location",
      position: userLocation,
    },
  ],
});
```

Note: Kakao Maps may not calculate a natural round-trip route, so display the following message in the UI:

```txt
For accurate walking directions, please check in Kakao Maps.
```
