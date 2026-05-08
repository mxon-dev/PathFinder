# Kakao Maps JavaScript SDK

## 6. Kakao Maps JavaScript API Usage

### 6.1 SDK Loader

In Next.js, `window` is not available during server rendering, so the SDK must only be loaded on the client.

`src/lib/kakao/kakao-map-loader.ts`

```ts
let kakaoMapLoadingPromise: Promise<typeof window.kakao> | null = null;

declare global {
  interface Window {
    kakao: any;
  }
}

export function loadKakaoMapSdk(): Promise<typeof window.kakao> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Kakao Map SDK must be loaded in browser."));
  }

  if (window.kakao?.maps) {
    return Promise.resolve(window.kakao);
  }

  if (kakaoMapLoadingPromise) {
    return kakaoMapLoadingPromise;
  }

  const appKey = process.env.NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY;

  if (!appKey) {
    return Promise.reject(
      new Error("NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY is not defined."),
    );
  }

  kakaoMapLoadingPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[data-kakao-map-sdk="true"]',
    );

    if (existingScript) {
      existingScript.addEventListener("load", () => {
        window.kakao.maps.load(() => resolve(window.kakao));
      });
      existingScript.addEventListener("error", reject);
      return;
    }

    const script = document.createElement("script");
    script.dataset.kakaoMapSdk = "true";
    script.async = true;
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${appKey}&libraries=services&autoload=false`;

    script.onload = () => {
      window.kakao.maps.load(() => resolve(window.kakao));
    };

    script.onerror = () => {
      kakaoMapLoadingPromise = null;
      reject(new Error("Failed to load Kakao Map SDK."));
    };

    document.head.appendChild(script);
  });

  return kakaoMapLoadingPromise;
}
```

### 6.2 Map Component

`src/components/map/KakaoMap.tsx`

```tsx
"use client";

import { useEffect, useRef } from "react";
import { loadKakaoMapSdk } from "@/lib/kakao/kakao-map-loader";
import type { LatLng } from "@/lib/kakao/kakao-types";

type KakaoMapProps = {
  center: LatLng;
  level?: number;
  markers?: Array<{
    id: string;
    position: LatLng;
    title: string;
  }>;
  path?: LatLng[];
};

export function KakaoMap({
  center,
  level = 4,
  markers = [],
  path = [],
}: KakaoMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let map: any;
    let renderedMarkers: any[] = [];
    let polyline: any | null = null;

    async function renderMap() {
      if (!containerRef.current) return;

      const kakao = await loadKakaoMapSdk();

      map = new kakao.maps.Map(containerRef.current, {
        center: new kakao.maps.LatLng(center.lat, center.lng),
        level,
      });

      renderedMarkers = markers.map((marker) => {
        const kakaoMarker = new kakao.maps.Marker({
          map,
          position: new kakao.maps.LatLng(marker.position.lat, marker.position.lng),
          title: marker.title,
        });

        return kakaoMarker;
      });

      if (path.length >= 2) {
        polyline = new kakao.maps.Polyline({
          map,
          path: path.map((point) => new kakao.maps.LatLng(point.lat, point.lng)),
          strokeWeight: 5,
          strokeOpacity: 0.9,
          strokeStyle: "solid",
        });
      }
    }

    renderMap();

    return () => {
      renderedMarkers.forEach((marker) => marker.setMap(null));
      if (polyline) polyline.setMap(null);
    };
  }, [center.lat, center.lng, level, markers, path]);

  return <div ref={containerRef} className="h-full w-full" />;
}
```

### 6.3 Map Usage Checklist

- Declare `"use client"` at the top of the component.
- The map container must have an explicit height.
- Pass arguments to the `LatLng` constructor in `lat, lng` order.
- Load the map SDK only once.
- Load the map SDK only on the detail screen to reduce initial page cost.
- If the map fails to load, display text information and a Kakao Maps link.
