---
name: public-data-api
description: Entry point for Public Data Portal work in PathFinder. Read this first, then follow the task routing table to the focused detail document.
---

# Public Data API Skill

## Purpose

This file is the entry point for public data work in PathFinder.
Read it before touching data collection scripts, public data normalization, static JSON generation, or recommendation filtering based on public data.

Public data is the primary recommendation candidate source for PathFinder.
Kakao Local API is supplementary and should be used only when public data candidates are insufficient.

PathFinder uses public data to:

1. Build nationwide park candidates
2. Build nationwide walking trail, 둘레길, and tourism trail candidates
3. Supplement tree-lined road and other walkable path candidates
4. Supplement mountain and forest trail candidates
5. Improve recommendation credibility
6. Reduce Kakao Local API call volume

## Always Follow

- Collect public data with scripts before build or deployment.
- Do not call the Public Data Portal API on every runtime request.
- Normalize collected data to the project internal schema.
- Save only normalized results to `/data/*.json`.
- Do not use raw API responses directly as service data.
- Do not use coordinate-less data directly as recommendation candidates.
- Retain source, reference date, and management agency name.
- Always perform deduplication, coordinate validation, and distance/duration parsing.
- Do not store user location, search history, or recommendation history.

## Data Priority

```txt
Priority 1: Public data candidates with both coordinates and description
Priority 2: Public data candidates with start/end coordinates (trail data)
Priority 3: Public data candidates with address only (coordinates need supplementing)
Priority 4: Nearby place candidates from real-time Kakao Local API search
```

## Task Routing

| Task | Read |
|---|---|
| Environment variables, dataset scope, folder layout, shared types | `.ai/skills/public-data-api/references/setup.md` |
| Coordinate validation, distance parsing, duration parsing | `.ai/skills/public-data-api/references/validation-parsing.md` |
| Public Data Portal client and pagination collection | `.ai/skills/public-data-api/references/client-pagination.md` |
| Park dataset normalization | `.ai/skills/public-data-api/references/datasets-parks.md` |
| Tourism trail / 둘레길 dataset normalization | `.ai/skills/public-data-api/references/datasets-trails.md` |
| Tree-lined road dataset normalization | `.ai/skills/public-data-api/references/datasets-tree-lined-roads.md` |
| Forest trail dataset usage | `.ai/skills/public-data-api/references/datasets-forest-trails.md` |
| Data quality scoring, deduplication, merged candidates | `.ai/skills/public-data-api/references/quality-and-merge.md` |
| Static JSON generation script | `.ai/skills/public-data-api/references/static-json-generation.md` |
| Runtime recommendation filtering and matching | `.ai/skills/public-data-api/references/recommendation-logic.md` |
| Update policy, failure handling, Kakao combination, attribution, tests | `.ai/skills/public-data-api/references/operations.md` |

## Read With Kakao Docs

If a task supplements candidates with Kakao Local API or displays a selected course on Kakao Maps, read this file and `.ai/skills/kakao-api/SKILL.md` first. Then read the focused Kakao detail document for the API surface involved.
