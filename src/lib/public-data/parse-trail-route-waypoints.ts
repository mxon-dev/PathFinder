/** 공공 API 경로정보(coursInfo) → 경유지명 목록 */
export function parseTrailRouteWaypoints(routeText: string): string[] {
  if (!routeText.trim()) return [];

  const rawParts = routeText
    .split(/→|⇒|->|>|~|·|\||-/)
    .map((part) =>
      part
        .replace(/\(\d+(?:\.\d+)?\s*(?:km|㎞|KM)\)/gi, "")
        .replace(/\d+(?:\.\d+)?\s*(?:km|㎞|KM)/gi, "")
        .replace(/\(\d+(?:\.\d+)?\s*(?:시간|분|h|m)\)/gi, "")
        .replace(/^\d+(?:\.\d+)?\s*(?:km|㎞|KM)\s*[:：]?\s*/i, "")
        .replace(/\s+/g, " ")
        .trim(),
    )
    .filter((label) => label.length >= 2);

  const out: string[] = [];
  for (const label of rawParts) {
    const prev = out[out.length - 1];
    if (prev && normalizeLabel(prev) === normalizeLabel(label)) continue;
    out.push(label);
  }
  return out;
}

function normalizeLabel(label: string): string {
  return label.replace(/\s/g, "").toLowerCase();
}

export function regionHintFromAddress(address?: string): string | undefined {
  if (!address?.trim()) return undefined;
  const parts = address.trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0]} ${parts[1]}`;
  return parts[0];
}
