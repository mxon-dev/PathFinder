---
name: pathFinder project instruction
description: Read this file at the start of a new chat.
globs: **
alwaysApply: false
---

## 1. Project Overview

This project is a service that recommends personalized walking routes by combining public data walking path APIs with the Kakao Maps API. It aims to implement declarative data fetching and optimized UX using Next.js and TanStack Query, while integrating Gemini 2.5 to provide an AI docent feature for walking routes.

## 2. Tech Stack

- **Framework:** Next.js (App Router recommended)
- **State Management:** Zustand (Client State), TanStack Query v5 (Server State)
- **Data Fetching:** Axios
- **AI / LLM:** Gemini 2.5 API
- **Map API:** Kakao Maps API

## 3. Folder Structure (FSD)

Layers are separated based on the Feature-Sliced Design architecture.

```
src/
├── app/              # Next.js App Router (page routing)
├── pages/            # Page-level composition
├── widgets/          # Composite UI blocks (Header, Sidebar, etc.)
├── features/         # Domain feature units
│   └── [Feature]/
│       ├── api/
│       │   ├── FeatureAPI.ts    # Axios class (pure API calls only)
│       │   ├── queries.ts       # queryKey, queryOptions, type definitions
│       │   └── useFeatureAPI.ts # useMutation / useQuery hooks
│       ├── model/               # Zustand store, types
│       └── ui/                  # Feature-specific components
├── entities/         # Domain entities (reusable models/UI)
├── shared/
│   ├── api/          # lib/api.ts (Axios instance)
│   ├── ui/           # Common components (Button, Input, etc.)
│   ├── lib/          # Utility functions
│   └── config/       # Environment variables, constants
└── styles/           # Global styles
```

## 4. TanStack Query Management Rules

Each Feature's API is managed by splitting it into 3 files.

- `FeatureAPI.ts` — Axios class responsible only for pure HTTP requests
- `queries.ts` — Defines `queryKey`, `queryOptions`, and shared types (`Props`)
- `useFeatureAPI.ts` — Exports only `useQuery` / `useMutation` hooks

```ts
// FeatureAPI.ts
class WalkAPI {
  getRoutes(params: RouteParams) {
    return api.get("/routes", { params });
  }
}
export default new WalkAPI();

// queries.ts
const queryOptions = {
  Routes: (params: RouteParams) => ({
    queryKey: ["routes", params],
    queryFn: () => WalkAPI.getRoutes(params),
  }),
};

// useWalkAPI.ts
export function useRoutes(params: RouteParams) {
  return useQuery(queryOptions.Routes(params));
}
```

## 5. System Architecture

The application follows a Layered Architecture pattern for maintainability and scalability.

- **View Layer:** UI and interaction implementation via Next.js components
- **State Layer:** Zustand (global state) and TanStack Query (async data) management
- **Service Layer:** Gemini 2.5 integration logic, API integration, and business logic
- **Infrastructure:** External API interfaces for public data and Kakao Maps

## 7. Features & API Definitions

- **LLM Call (Gemini 2.5):** Generates text guides and summary info based on walking route data via prompt engineering
- **Kakao Maps API:** Renders walking route polylines on the map using collected coordinates and handles user interactions
- **Public Data (Walking Route API):** Collects, filters, and parses nearby walking route base data

## 8. Related Skills

- When implementing the AI Docent feature with Gemini, use `.ai/skills/gemini-docent/SKILL.md`.
- Cursor exposes shared skills through `.cursor/skills`.
