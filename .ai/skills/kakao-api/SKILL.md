---
name: kakao-api
description: Entry point for Kakao API work in PathFinder. Read this first, then follow the task routing table to the focused detail document.
---

# Kakao API Skill

## Purpose

This file is the entry point for Kakao API work in PathFinder.
Read it before touching Kakao Maps, Kakao Local REST API proxy routes, Kakao Map URLs, or latitude/longitude handling.

PathFinder uses Kakao APIs only for:

1. Map rendering
2. Searching for places near the current location
3. Converting coordinates to administrative regions
4. Converting user-entered locations or addresses to coordinates
5. Displaying markers and route previews on the walking course detail screen
6. Delegating actual navigation to Kakao Map URLs

## Always Follow

- Kakao Maps JavaScript API is used only in the browser for map display.
- `KAKAO_REST_API_KEY` must never be exposed to the browser.
- All Kakao Local REST API calls must go through Next.js Route Handlers.
- Do not store Kakao Local API responses in a database or static files.
- Do not accumulate Kakao place data as a service-owned POI database.
- Kakao does not provide a walking Navigation REST API, so actual navigation must link to Kakao Map URLs.
- Do not calculate walking route coordinates internally.
- Always verify latitude/longitude order before calling a Kakao API.

## Coordinate Order

| Usage | Order |
|---|---|
| Kakao Maps JavaScript API `new kakao.maps.LatLng()` | `lat, lng` |
| Kakao Local REST API `x`, `y` | `x=lng`, `y=lat` |
| Kakao Map URL `/link/by/walk/` | `name,lat,lng` |
| Internal project type | `{ lat: latitude, lng: longitude }` |

## 3. Usage Scope in the Project

### 3.1 Kakao API Usage by Screen

| Screen | API Used | Purpose |
|---|---|---|
| Home screen | Browser Geolocation + Kakao Local Proxy | Check administrative region for current location |
| Home screen | Kakao Local Keyword Search | Search user-entered place when location permission is denied |
| Recommendation list | Kakao Local Keyword/Category Search | Supplement nearby candidates when public data candidates are insufficient |
| Recommendation list | Kakao Maps JavaScript API | Card-style map preview. Can be omitted in MVP. |
| Detail screen | Kakao Maps JavaScript API | Display map, markers, and Polyline |
| Detail screen | Kakao Map URL | Link to Kakao Maps app/web for navigation |

### 3.2 API Selection Criteria

| Situation | API to Use |
|---|---|
| Map display | Kakao Maps JavaScript API |
| Get city/district/town for current coordinates | Kakao Local `coord2regioncode` |
| Search user-entered place name | Kakao Local `keyword` |
| Search nearby parks/attractions/cultural facilities/cafes | Kakao Local `category` |
| Convert exact address to coordinates | Kakao Local `address` |
| Actual navigation | Kakao Map URL |
| Calculate walking route coordinates | Not implemented with Kakao API |

## Task Routing

| Task | Read |
|---|---|
| Environment variables, folder layout, shared Kakao types | `.ai/skills/kakao-api/references/setup.md` |
| Browser map display, markers, Polylines, SDK loading | `.ai/skills/kakao-api/references/maps-sdk.md` |
| Server-side Kakao Local API wrapper | `.ai/skills/kakao-api/references/local-client.md` |
| `/api/kakao/*` Route Handlers | `.ai/skills/kakao-api/references/route-handlers.md` |
| Nearby place search for recommendations, place type inference | `.ai/skills/kakao-api/references/recommendation-search.md` |
| Kakao Map view and walking navigation links | `.ai/skills/kakao-api/references/map-urls.md` |
| Error handling, security, caching, quota, tests, implementation order | `.ai/skills/kakao-api/references/operations.md` |

## Read With Public Data Docs

If a recommendation task combines public data candidates with Kakao Local supplementation, read this file and `.ai/skills/public-data-api/SKILL.md` first. Then read:

- `.ai/skills/kakao-api/references/recommendation-search.md`
- `.ai/skills/public-data-api/references/recommendation-logic.md`
- `.ai/skills/public-data-api/references/operations.md`
