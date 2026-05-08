# PathFinder — AI Agent Guide

## Project Overview

PathFinder is a **mobile web-based walking route recommendation service**.
It takes the user's current location, preferred place types, and desired walking duration as input, recommends nearby walking candidates, and provides a detailed map with Kakao Maps navigation links.

Tech stack: Next.js 15 (App Router), TypeScript, Kakao Maps JavaScript API, Public Data Portal API

---

## Shared AI Instructions

Project-wide AI instructions live in `.ai/`.
Treat `.ai/rules` and `.ai/skills` as the source of truth.
Tool-specific folders, such as `.cursor/`, should expose those shared files through links instead of keeping separate copies.

When adding a new shared rule or skill, follow `.ai/README.md`.

---

## Skill Files

This project has **AI Agent Skill** files organized by work area.
Before starting any work in a related area, read the corresponding top-level skill file first.
Each top-level skill file contains the common rules and a task routing table for focused detail documents.
You must follow all rules, implementation patterns, and prohibited actions specified in the relevant skill documents.

### kakao-api

**File**: `.ai/skills/kakao-api/SKILL.md`

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

**File**: `.ai/skills/public-data-api/SKILL.md`

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

| Task | Top-Level Skill | Focused Detail Docs |
|---|---|---|
| Map display, markers, route Polyline | `kakao-api` | `.ai/skills/kakao-api/references/maps-sdk.md` |
| Place search API calls | `kakao-api` | `.ai/skills/kakao-api/references/local-client.md`, `.ai/skills/kakao-api/references/route-handlers.md` |
| Kakao Map URL generation | `kakao-api` | `.ai/skills/kakao-api/references/map-urls.md` |
| Collecting and normalizing recommendation candidates | `public-data-api` | `.ai/skills/public-data-api/references/client-pagination.md`, then the relevant `.ai/skills/public-data-api/references/datasets-*.md` file |
| Static JSON-based recommendation filtering | `public-data-api` | `.ai/skills/public-data-api/references/recommendation-logic.md` |
| Supplementing candidates with Kakao Local when candidates are insufficient | `kakao-api` + `public-data-api` | `.ai/skills/kakao-api/references/recommendation-search.md`, `.ai/skills/public-data-api/references/recommendation-logic.md` |

If a task spans both areas, read both top-level skills first, then the focused detail docs listed in their routing tables.
