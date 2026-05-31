import type { StandardListEnvelope } from "./public-data-envelope";
import { formatPublicDataError } from "./public-data-errors";
import { isPublicDataOk } from "./public-data-envelope";

type RequestOpts = {
  endpoint: string;
  pageNo?: number;
  numOfRows?: number;
  /** 일부 API는 `type`, 다른 API는 `_type` 사용 */
  formatParamKey?: "type" | "_type";
  extraParams?: Record<string, string | number | undefined>;
};

function getServiceKey(): string {
  const key = process.env.PUBLIC_DATA_SERVICE_KEY?.trim();
  if (!key) {
    throw new Error("PUBLIC_DATA_SERVICE_KEY is not defined.");
  }
  return key;
}

/** 포털이 주는 인증키는 보통 `%2F` 등으로 이미 URL-인코딩된 문자열.
 *  URLSearchParams.set은 다시 인코딩(이중 인코딩)을 하므로,
 *  `%`가 포함되어 있으면 raw 문자열 그대로 쿼리에 붙이고,
 *  그렇지 않으면 안전하게 인코딩한다.
 */
function appendServiceKey(rawUrl: string, key: string): string {
  const sep = rawUrl.includes("?") ? "&" : "?";
  const looksEncoded = /%[0-9A-Fa-f]{2}/.test(key);
  const value = looksEncoded ? key : encodeURIComponent(key);
  return `${rawUrl}${sep}serviceKey=${value}`;
}

function isRetryableFetchError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  const cause = (error as NodeJS.ErrnoException).cause;
  const code =
    (error as NodeJS.ErrnoException).code ??
    (cause instanceof Error && "code" in cause
      ? String((cause as NodeJS.ErrnoException).code)
      : "");
  return (
    msg.includes("fetch failed") ||
    msg.includes("aborted") ||
    code === "ECONNRESET" ||
    code === "ETIMEDOUT" ||
    code === "ECONNREFUSED"
  );
}

async function fetchWithRetry(
  url: string,
  attempts = 3,
  timeoutMs = 25_000,
): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      const response = await fetch(url, {
        cache: "no-store",
        signal: controller.signal,
      });
      clearTimeout(timer);
      return response;
    } catch (error) {
      lastError = error;
      if (!isRetryableFetchError(error) || attempt === attempts - 1) {
        throw error;
      }
      await new Promise((resolve) =>
        setTimeout(resolve, 400 * (attempt + 1)),
      );
    }
  }
  throw lastError;
}

export async function requestPublicDataJson<T>(
  opts: RequestOpts,
): Promise<T> {
  const serviceKey = getServiceKey();
  const fmtKey = opts.formatParamKey ?? "type";

  const url = new URL(opts.endpoint);
  url.searchParams.set("pageNo", String(opts.pageNo ?? 1));
  url.searchParams.set("numOfRows", String(opts.numOfRows ?? 50));
  url.searchParams.set(fmtKey, "json");
  Object.entries(opts.extraParams ?? {}).forEach(([k, v]) => {
    if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
  });

  /** serviceKey는 인코딩 충돌을 피하려고 마지막에 직접 붙인다. */
  const finalUrl = appendServiceKey(url.toString(), serviceKey);

  if (process.env.NODE_ENV !== "production") {
    const masked = finalUrl.replace(
      /serviceKey=[^&]+/,
      "serviceKey=***masked***",
    );
    console.log("[public-data] GET", masked);
  }

  const response = await fetchWithRetry(finalUrl);

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `Public Data HTTP ${response.status}: ${body.slice(0, 240)}`,
    );
  }

  const ct = response.headers.get("content-type") ?? "";
  if (!ct.includes("json") && ct.includes("xml")) {
    const text = await response.text();
    throw new Error(
      `Unexpected XML response. Try PUBLIC_DATA_RESPONSE_FORMAT_PARAM=_type. Snippet: ${text.slice(0, 160)}`,
    );
  }

  return response.json() as Promise<T>;
}

export async function assertPublicDataHeader<T>(
  data: StandardListEnvelope<T>,
): Promise<void> {
  const code = data.response?.header?.resultCode;
  const msg = data.response?.header?.resultMsg ?? "";
  if (!isPublicDataOk(code)) {
    throw new Error(formatPublicDataError(code, msg));
  }
}
