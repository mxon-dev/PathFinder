# Public Data Operations and Checklists

## 16. Data Update Policy

### 16.1 MVP Update Frequency

| Data | Update Frequency |
|---|---|
| National Urban Park Information | Monthly or manual |
| National Tourism Trail Information | Monthly or manual |
| National Tree-Lined Road Information | Manual as needed |
| Korea Forest Service 둘레길 Information | Manual as needed |

Do not use automated cron jobs in MVP.
When data needs updating, run the script locally and commit the resulting JSON.

```bash
pnpm sync:public-data
```

### 16.2 What to Check When Updating Data

- [ ] API call success
- [ ] totalCount matches actual collected count
- [ ] Number of entries without coordinates
- [ ] Number of entries with invalid coordinates
- [ ] Count before and after deduplication
- [ ] Final `merged-candidates.json` count
- [ ] File size
- [ ] Recommendation API response time

## 17. Public Data API Failure Handling

### 17.1 Failure During Sync

```txt
1. Terminate the script immediately
2. Log which dataset failed
3. Log response status, resultCode, resultMsg
4. Mask the authentication key in logs
5. Do not overwrite existing JSON files
```

### 17.2 Failure at Runtime

Do not call the Public Data API at runtime in MVP.
Therefore, only consider static JSON import failures as runtime failures.

Handling:

```txt
1. Return empty array from recommendation API
2. Attempt supplementation via Kakao Local API
3. If still no candidates, show guidance message
```

UI message:

```txt
No nearby walking candidates found. Please try changing your location or conditions.
```

## 18. Public Data + Kakao API Combination Rules

### 18.1 Basic Combination

```txt
1. Search nearby candidates from public data static JSON
2. If 4 or more recommendation candidates exist, do not call Kakao Local API
3. If fewer than 4 candidates, supplement with Kakao Local API
4. Show public data candidates first in the final results
5. Mark Kakao candidates with source as kakao_local
```

### 18.2 Address Coordinate Supplementation

Kakao address search may be used for public data without coordinates.

Follow these rules:

```txt
1. For bulk coordinate supplementation at build time, confirm policy first
2. In MVP, the default is to exclude data without coordinates
3. Coordinate supplementation is only allowed for a specific candidate selected by the user at runtime
4. Do not save the supplemented result — use it only for the current request
```

### 18.3 Route Display on Detail Screen

| Data State | Map Display |
|---|---|
| Has path coordinates | Display actual Polyline |
| Has start/end coordinates | Display straight line or simple Polyline from start to end |
| Has center coordinate only | Display center marker |
| No coordinates | Do not display map; show text only |

## 20. Data Attribution Display

Include attribution in the recommendation detail screen or developer-facing data.

Example:

```txt
Source: National Urban Park Standard Data / Agency: Seoul Metropolitan Government ○○ District / Reference Date: 2026-03-31
```

The display may be abbreviated in the user-facing UI.
However, attribution fields must always be maintained in internal data.

## 21. Prohibited Actions

- Do not display raw public data on screen without validation.
- Do not display candidates without coordinates on the map.
- Do not display estimated durations as exact times for candidates without duration data.
- Always display estimated values with "approx." or "estimated".
- Do not call the Public Data API on every user request.
- Do not expose API authentication keys to the client.
- Do not remove the data reference date.
- Do not remove the management agency name.
- Do not permanently store Kakao-supplemented data without confirming policy.

## 22. Test Checklist

### 22.1 Data Collection Tests

- [ ] API authentication key loaded
- [ ] First page call succeeds
- [ ] Full pagination collection
- [ ] totalCount matches collected count
- [ ] API error code handling
- [ ] Encoded/decoded key issue check

### 22.2 Normalization Tests

- [ ] Park name / trail name missing entries removed
- [ ] Latitude/longitude parsed
- [ ] South Korea coordinate range validated
- [ ] Distance parsed
- [ ] Duration parsed
- [ ] Category inferred
- [ ] Source field retained
- [ ] Reference date retained

### 22.3 Recommendation Tests

- [ ] Radius filtering by current location
- [ ] Duration matching
- [ ] Category matching
- [ ] Quality score applied
- [ ] Kakao Local supplement when candidates are insufficient
- [ ] No-candidate handling
- [ ] Map display availability check for detail screen

## 23. Implementation Order

When public data API work is required, proceed in the following order:

```txt
1. Check target dataset on data.go.kr
2. Apply for access and confirm authentication key
3. Check request URL and parameters on the Open API tab
4. Write or update public-data-types.ts
5. Write fetch functions per dataset
6. Write normalizer per dataset
7. Validate coordinates, distance, and duration
8. Deduplicate
9. Generate merged-candidates.json
10. Use static JSON in recommendation logic
11. Supplement with Kakao Local API when candidates are insufficient
12. Verify recommendation results on mobile screen
```

## 24. AI Agent Work Rules

When an AI Agent performs public data-related work, it must follow these rules:

1. Read this file first and define the scope of work.
2. When adding new public data, write the dataset purpose, fields to use, and normalization rules first.
3. Do not connect raw responses directly to the screen.
4. Create the normalized type first, then convert to that type.
5. Do not use data that fails coordinate validation as map candidates.
6. Always handle the possibility of distance and duration parsing failure.
7. Do not put the API authentication key in browser-side code.
8. Prefer generating static JSON over runtime calls.
9. If the collection script fails, do not overwrite existing JSON.
10. Do not remove data source and reference date.
11. When combining with Kakao API, confirm Kakao data storage policy.
12. Before working, re-verify the actual request URL and parameters on the official Public Data Portal page.

## 25. Official Data Pages

- National Urban Park Standard Data: https://www.data.go.kr/data/15012890/standard.do
- National Tourism Trail Standard Data: https://www.data.go.kr/data/15017321/standard.do
- National Tree-Lined Road Standard Data: https://www.data.go.kr/data/15021145/standard.do
- Korea Forest Service Forest Service and 둘레길 Information: https://www.data.go.kr/data/15002725/openapi.do
