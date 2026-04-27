# PathFinder — AI Agent Guide

## Project Overview

PathFinder is a **mobile web-based walking route recommendation service**.
It takes the user's current location, preferred place types, and desired walking duration as input, recommends nearby walking candidates, and provides a detailed map with Kakao Maps navigation links.

Tech stack: Next.js 15 (App Router), TypeScript, Kakao Maps JavaScript API, Public Data Portal API

---

## Skill Files

This project has **AI Agent Skill** files organized by work area.
Before starting any work in a related area, you must read the corresponding skill file first.
You must follow all rules, implementation patterns, and prohibited actions specified in the skill.

### kakao-api

**File**: `docs/ai-skills/kakao-api.md`

**Applicable areas**:
- `src/lib/kakao/**`
- `src/app/api/kakao/**`
- `src/components/map/**`

**Read this before working on**:
- Displaying maps, markers, and Polylines with Kakao Maps JavaScript API
- Calling Kakao Local REST API (keyword / category / address / coord-to-region search)
- Implementing Next.js Route Handlers (`/api/kakao/*`)
- Generating Kakao Map URLs (map view, walking navigation)
- Any code involving latitude/longitude coordinate ordering
- Code related to environment variables (`NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY`, `KAKAO_REST_API_KEY`)

### public-data-api

**File**: `docs/ai-skills/public-data-api.md`

**Applicable areas**:
- `src/lib/public-data/**`
- `src/data/**`
- `scripts/sync-*.ts`

**Read this before working on**:
- Writing data collection scripts for the Public Data Portal API
- Normalizing parks, trails, tree-lined roads, and forest trail candidates
- Coordinate validation and deduplication logic
- Building the `merged-candidates.json` generation pipeline
- Code that reads static JSON and filters/matches candidates in the recommendation logic
- Code related to environment variables (`PUBLIC_DATA_SERVICE_KEY`)

---

## Task Decision Guide

| Task | Skill to Read |
|---|---|
| Map display, markers, route Polyline | kakao-api |
| Place search API calls | kakao-api |
| Kakao Map URL generation | kakao-api |
| Collecting and normalizing recommendation candidates | public-data-api |
| Static JSON-based recommendation filtering | public-data-api |
| Supplementing candidates with Kakao Local when candidates are insufficient | kakao-api + public-data-api |

If a task spans both areas, read both skills.
