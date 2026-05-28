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

export function isPublicDataOk(code: string | undefined): boolean {
  if (!code) return true;
  const normalized = code.trim();
  return normalized === "00" || normalized === "0000";
}
