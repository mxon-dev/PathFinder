# Public Data Client and Pagination

## 8. Public Data API Common Client

Request URLs and parameter names may vary slightly by dataset on the Public Data Portal.
Check the request URL and parameters on the "Open API" tab of each dataset's detail page before use.

`src/lib/public-data/public-data-client.ts`

```ts
type PublicDataRequestParams = {
  endpoint: string;
  serviceKey?: string;
  pageNo?: number;
  numOfRows?: number;
  type?: "json" | "xml";
  extraParams?: Record<string, string | number | undefined>;
};

function getPublicDataServiceKey() {
  const serviceKey = process.env.PUBLIC_DATA_SERVICE_KEY;

  if (!serviceKey) {
    throw new Error("PUBLIC_DATA_SERVICE_KEY is not defined.");
  }

  return serviceKey;
}

export async function requestPublicData<T>({
  endpoint,
  serviceKey = getPublicDataServiceKey(),
  pageNo = 1,
  numOfRows = 1000,
  type = "json",
  extraParams = {},
}: PublicDataRequestParams): Promise<T> {
  const url = new URL(endpoint);

  url.searchParams.set("serviceKey", serviceKey);
  url.searchParams.set("pageNo", String(pageNo));
  url.searchParams.set("numOfRows", String(numOfRows));

  // Each Public Data API may use type, _type, or dataType — override with extraParams to match the API.
  url.searchParams.set("type", type);

  Object.entries(extraParams).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  const response = await fetch(url, {
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `Public Data API failed: ${response.status} ${response.statusText} ${body}`,
    );
  }

  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json") || type === "json") {
    return response.json();
  }

  const text = await response.text();

  throw new Error(
    `Unexpected non-json response. Check API type parameter. Response starts with: ${text.slice(
      0,
      200,
    )}`,
  );
}
```

## 9. Pagination Collection Pattern

Public data is often provided in pages based on `pageNo`, `numOfRows`, and `totalCount`.
Use the following pattern to fetch all data:

```ts
type PublicDataListResponse<T> = {
  response?: {
    header?: {
      resultCode?: string;
      resultMsg?: string;
    };
    body?: {
      items?: {
        item?: T[] | T;
      };
      totalCount?: number;
      pageNo?: number;
      numOfRows?: number;
    };
  };
};

function toArray<T>(value: T[] | T | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

export async function fetchAllPages<T>(params: {
  endpoint: string;
  extraParams?: Record<string, string | number | undefined>;
  numOfRows?: number;
}) {
  const numOfRows = params.numOfRows ?? 1000;
  let pageNo = 1;
  let totalCount = Infinity;
  const result: T[] = [];

  while ((pageNo - 1) * numOfRows < totalCount) {
    const data = await requestPublicData<PublicDataListResponse<T>>({
      endpoint: params.endpoint,
      pageNo,
      numOfRows,
      type: "json",
      extraParams: params.extraParams,
    });

    const body = data.response?.body;
    const header = data.response?.header;

    if (header?.resultCode && header.resultCode !== "00") {
      throw new Error(`Public Data API error: ${header.resultCode} ${header.resultMsg}`);
    }

    totalCount = Number(body?.totalCount ?? 0);
    result.push(...toArray(body?.items?.item));

    pageNo += 1;

    // Safety guard
    if (pageNo > 1000) {
      throw new Error("Too many pages. Check totalCount or API response shape.");
    }
  }

  return result;
}
```

If the response structure differs, create an adapter for that API.
