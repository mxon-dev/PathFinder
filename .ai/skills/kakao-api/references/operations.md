# Kakao Operations and Checklists

## 13. Error Handling

### 13.1 Kakao SDK Load Failure

Handling:

```txt
1. Display an error message in the map area
2. Continue to show course name, distance, and estimated duration
3. Continue to provide the Kakao Map URL button
```

UI message:

```txt
Failed to load the map. Please check it directly in Kakao Maps.
```

### 13.2 Kakao Local API Failure

Handling:

```txt
1. Use only public data-based candidates
2. If the user directly entered a place to search, prompt a retry
3. Log only status, endpoint, and query to the server log
4. Do not log the API Key
```

UI message:

```txt
Place search is temporarily unavailable. Please try again with different conditions.
```

### 13.3 Location Permission Denied

Handling:

```txt
1. Switch to manual input mode
2. Search the user-entered keyword using Kakao Keyword Search
3. Show the user candidates before using the first result as the reference coordinate
```

UI message:

```txt
Current location is unavailable. Please enter a region or place to use as the starting point.
```

## 14. Security Rules

### 14.1 Prohibited Actions

- Do not use `NEXT_PUBLIC_` prefix for `KAKAO_REST_API_KEY`.
- Do not use the REST API Key in client components.
- Do not expose the REST API Key in the browser network tab.
- Do not commit the API Key to Git.
- Do not log the full raw response from the Kakao Local API.
- Do not continuously log the user's exact location to the server log.
- Do not store the user's search history.

### 14.2 Permitted Actions

- The JavaScript Key can be used in the browser to load the map SDK.
- However, Web domain restriction must be configured in the Kakao Developer Console.
- Kakao Local API responses may be used only to generate recommendation results for the current request.
- The `place_url` from the Kakao Local API may be provided to users as a "View in Kakao Maps" link.

## 15. Caching Policy

### 15.1 Permitted Caching

| Target | Permitted | Method |
|---|---:|---|
| Map SDK load state | Permitted | Browser memory |
| Same search results within the same session | Permitted | Client memory |
| Storing Kakao Local API responses in server DB | Prohibited | Not used |
| Converting Kakao Local API responses to static JSON | Prohibited | Not used |

### 15.2 Session Memory Caching Example

```ts
const memoryCache = new Map<string, unknown>();

export async function getCachedInMemory<T>(
  key: string,
  fetcher: () => Promise<T>,
): Promise<T> {
  if (memoryCache.has(key)) {
    return memoryCache.get(key) as T;
  }

  const value = await fetcher();
  memoryCache.set(key, value);

  return value;
}
```

Note: This cache is maintained only in browser memory. Do not persist it.

## 16. Quota Management

Do not hard-code Kakao quota numbers in code, as they may change.
Check actual usage in the Kakao Developer Console quota screen during operation.

### 16.1 Ways to Reduce API Calls

- Do not load the map SDK on the home screen.
- Load the map SDK when entering the detail screen.
- Call Kakao Local API only when candidates are insufficient.
- Return at most 4 recommendation results.
- Do not make repeated calls with the same conditions on the same screen.
- Do not call on every keystroke; call on form submission.
- If autocomplete becomes necessary, apply debounce of at least 500ms in MVP.

## 17. Test Checklist

### 17.1 Map Display Tests

- [ ] Map displays on local domain
- [ ] Map displays on production domain
- [ ] Map container height is applied
- [ ] Map centers on current location
- [ ] Markers are displayed
- [ ] Polyline is displayed
- [ ] SDK load failure UI is confirmed

### 17.2 Local API Tests

- [ ] Coordinate → administrative region conversion
- [ ] Keyword search
- [ ] Category search
- [ ] Direct place name input search
- [ ] Verify REST API Key is not exposed in the browser
- [ ] Confirm 502 handling on API failure
- [ ] Confirm empty result handling

### 17.3 Navigation URL Tests

- [ ] Kakao Map navigation on mobile browser
- [ ] Walking mode URL generation
- [ ] Origin/destination coordinate order verification
- [ ] Korean place name encoding verification
- [ ] URL with waypoints verification

## 18. Implementation Order

When Kakao API work is required, proceed in the following order:

```txt
1. Set Kakao Keys in .env.local
2. Register localhost and production domain in Kakao Developer Console
3. Write kakao-types.ts
4. Write kakao-map-loader.ts
5. Write KakaoMap component
6. Write kakao-local-client.ts
7. Write /api/kakao/* Route Handlers
8. Call Kakao Local in recommendation logic when public data candidates are insufficient
9. Generate Kakao Map URL button on detail screen
10. Test security / quota / coordinate ordering
```

## 19. AI Agent Work Rules

When an AI Agent performs Kakao API-related work, it must follow these rules:

1. Read this file first and define the scope of work.
2. If the Kakao REST API Key is found in client-side code, fix it immediately.
3. Remove any code that stores Kakao Local responses.
4. Do not attempt to implement a Navigation REST API.
5. Verify coordinate ordering at every call site.
6. When creating a new API Route, always include failure responses and input validation.
7. Before working, re-verify Kakao API policies, quotas, and endpoints in the official documentation.
8. Prefer using existing types; if a new type is needed, add it to `kakao-types.ts`.
9. The recommendation logic must not depend solely on Kakao data — use public data first.
10. Do not store user location or search history.

## 20. Official Documentation

- Kakao Maps JavaScript API Guide: https://apis.map.kakao.com/web/guide/
- Kakao Maps JavaScript API Documentation: https://apis.map.kakao.com/web/documentation/
- Kakao Local REST API Guide: https://developers.kakao.com/docs/latest/ko/local/dev-guide
- Kakao Local API Overview: https://developers.kakao.com/docs/latest/ko/local/common
- Kakao Developers Quota: https://developers.kakao.com/docs/latest/ko/getting-started/quota
- Kakao Map API FAQ: https://devtalk.kakao.com/t/faq-api/125610
