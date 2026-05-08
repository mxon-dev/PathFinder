# Public Data Static JSON Generation

## 14. Static JSON Generation Script

`scripts/sync-public-data.ts`

```ts
import fs from "node:fs/promises";
import path from "node:path";
import { normalizeCityPark } from "@/lib/public-data/normalizers/normalize-parks";
import { normalizeTourismTrail } from "@/lib/public-data/normalizers/normalize-trails";
import { mergeCandidates } from "@/lib/public-data/merge-candidates";

async function main() {
  const parksRaw = await fetchCityParks();
  const trailsRaw = await fetchTourismTrails();

  const parks = parksRaw
    .map(normalizeCityPark)
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  const trails = trailsRaw
    .map(normalizeTourismTrail)
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  const merged = mergeCandidates([parks, trails]);

  await writeJson("parks.json", parks);
  await writeJson("trails.json", trails);
  await writeJson("merged-candidates.json", merged);

  console.log(`parks: ${parks.length}`);
  console.log(`trails: ${trails.length}`);
  console.log(`merged: ${merged.length}`);
}

async function writeJson(fileName: string, data: unknown) {
  const outputPath = path.join(process.cwd(), "src", "data", "courses", fileName);

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, JSON.stringify(data, null, 2), "utf-8");
}

async function fetchCityParks() {
  // Check the actual endpoint on the Open API tab of the dataset page.
  // e.g., https://www.data.go.kr/data/15012890/standard.do
  return [];
}

async function fetchTourismTrails() {
  // Check the actual endpoint on the Open API tab of the dataset page.
  // e.g., https://www.data.go.kr/data/15017321/standard.do
  return [];
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
```

`package.json`

```json
{
  "scripts": {
    "sync:public-data": "tsx scripts/sync-public-data.ts"
  }
}
```
