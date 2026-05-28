export function parseDistanceKm(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.replaceAll(",", "").trim();
  if (!normalized) return undefined;

  const kmMatch = normalized.match(/([\d.]+)\s*(?:km|㎞|KM)/i);
  if (kmMatch) return Number(kmMatch[1]);

  const meterMatch = normalized.match(/([\d.]+)\s*m/i);
  if (meterMatch) return Number(meterMatch[1]) / 1000;

  const numberOnly = Number(normalized);
  return Number.isFinite(numberOnly) ? numberOnly : undefined;
}

export function parseDurationMin(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();
  if (!normalized) return undefined;

  const hourMatch = normalized.match(/(\d+(?:\.\d+)?)\s*시간/);
  const minMatch = normalized.match(/(\d+)\s*분/);

  const hours = hourMatch ? Number(hourMatch[1]) : 0;
  const minutes = minMatch ? Number(minMatch[1]) : 0;

  if (hours || minutes) {
    return Math.round(hours * 60 + minutes);
  }

  const numberOnly = Number(normalized);
  return Number.isFinite(numberOnly) ? numberOnly : undefined;
}
