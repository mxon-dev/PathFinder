---
name: pathFinder gemini docent integration
description: Use this rule when implementing Gemini AI docent prompts, API routes, hooks, and response types.
globs: src/features/ai-docent/**,src/app/api/ai-docent/**,src/entities/walking-route/**,src/shared/config/**
alwaysApply: false
---
# PathFinder Gemini Docent Rule
## 1. Purpose
Use this rule only for the PathFinder AI Docent feature.
Apply this when working on Gemini API routes, prompts, response schemas, React Query hooks, or AI docent UI rendering.
Do not apply this to normal Kakao Map rendering or public data parsing unless Gemini output is involved.
## 2. Recommended Location
Create this file here:
.cursor/rules/gemini-docent.mdc
Keep the existing overall project rule here:
.cursor/rules/project.mdc
`project.mdc` defines the whole project.
`gemini-docent.mdc` defines only Gemini integration rules.
## 3. Target Structure
Use this structure for the AI Docent feature:
src/app/api/ai-docent/route.ts
src/features/ai-docent/
├── api/
│   ├── AIDocentAPI.ts
│   ├── queries.ts
│   └── useAIDocentAPI.ts
├── lib/
│   ├── buildDocentPrompt.ts
│   └── parseDocentResponse.ts
├── model/
│   └── types.ts
└── ui/
    └── AIDocentPanel.tsx
## 4. Environment Variables
Gemini keys must stay server-side.
```env
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash
Never use `NEXT_PUBLIC_` for Gemini API keys.
Client components must call `/api/ai-docent`, not Gemini directly.
## 5. Integration Flow
Use this flow only:
AIDocentPanel
→ useAIDocentAPI
→ AIDocentAPI
→ /api/ai-docent
→ Gemini
→ normalized JSON
→ UI
The UI must not contain prompt text.
## 6. Request Type
```ts
export interface AIDocentRequest {
  routeId: string;
  routeName: string;
  distanceKm?: number;
  estimatedMinutes?: number;
  difficulty?: "easy" | "normal" | "hard";
  locationText?: string;
  routeDescription?: string;
  keywords?: string[];
  userPreference?: "healing" | "exercise" | "history" | "nature" | "family";
}
## 7. Response Type
```ts
export interface AIDocentResponse {
  title: string;
  summary: string;
  highlights: string[];
  recommendedFor: string[];
  cautionNotes: string[];
  docentScript: string;
}
Render only this normalized response.
Do not render raw Gemini text directly.
## 8. Prompt Rules
Create prompts only in `src/features/ai-docent/lib/buildDocentPrompt.ts`.
The prompt must include route name, distance or walking time, difficulty, location text, public data description, and user preference.
The prompt must require Gemini to answer in Korean, return JSON only, use a friendly walking docent tone, and avoid exaggerated claims.
The prompt must not allow Gemini to invent facilities, history, opening hours, events, safety facts, or accessibility information.
## 9. Server Route Rules
Implement Gemini calls only in `src/app/api/ai-docent/route.ts`.
The route handler must validate the request body.
The route handler must call Gemini only on the server.
The route handler must request JSON output.
The route handler must parse and normalize the response.
The route handler must return `AIDocentResponse`.
## 10. TanStack Query Rules
Follow the project API split rule:
AIDocentAPI.ts      # Axios request only
queries.ts         # mutation key, options, shared types
useAIDocentAPI.ts  # hook only
Use `useMutation`, not `useQuery`.
Reason: AI generation is user-triggered and depends on selected route and preference.
Use this mutation key:
```ts
["ai-docent", "generate"]
Do not include full prompt text in keys.
## 11. Error Handling
Handle missing `GEMINI_API_KEY`.
Handle invalid request body.
Handle Gemini timeout or network error.
Handle empty response.
Handle invalid JSON response.
Client error message:
AI 도슨트 생성에 실패했습니다. 잠시 후 다시 시도해주세요.
Never let malformed AI output break the page.
## 12. Safety Rules
Gemini output is not verified truth.
If data is missing, say the guide is based on available route data.
Do not allow Gemini to create fake historical facts, nearby facilities, safety guarantees, opening hours, or accessibility information.
## 13. UI Rules
`AIDocentPanel.tsx` should render title, summary, highlights, recommendedFor, cautionNotes, and docentScript.
Keep loading, success, and error states separate.
Do not put API or prompt logic inside UI components.
## 14. MVP Scope
Implement only selected route summary, highlights, caution notes, short docent script, and user preference option.
Do not implement streaming, voice narration, chat history, or personalization memory in MVP.
## 15. Forbidden Patterns
Do not call Gemini from client components.
Do not store API keys in `NEXT_PUBLIC_*`.
Do not write prompts inside UI components.
Do not return untyped `any` from API layers.
Do not mix Kakao Map logic with Gemini prompt logic.
Do not save AI output as permanent fact without review.
## 16. Implementation Order
When generating code, implement in this order:
1. `types.ts`
2. `buildDocentPrompt.ts`
3. `/api/ai-docent/route.ts`
4. `AIDocentAPI.ts`
5. `queries.ts`
6. `useAIDocentAPI.ts`
7. `AIDocentPanel.tsx`
