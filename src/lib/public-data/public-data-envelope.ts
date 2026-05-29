export type StandardListEnvelope<T> = {
  response?: {
    header?: { resultCode?: string; resultMsg?: string };
    body?: {
      items?: { item?: T | T[] };
      totalCount?: number | string;
      pageNo?: number | string;
      numOfRows?: number | string;
    };
  };
};

export function toItemArray<T>(value: T | T[] | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

/** 표준 openapi는 `items` 배열, 구형 API는 `items.item` 래퍼를 쓴다. */
export function extractPublicDataItems<T>(
  items: T[] | { item?: T | T[] } | undefined,
): T[] {
  if (!items) return [];
  if (Array.isArray(items)) return items;
  return toItemArray(items.item);
}

export function isPublicDataOk(code: string | undefined): boolean {
  if (!code) return true;
  const normalized = code.trim();
  return normalized === "00" || normalized === "0000";
}
