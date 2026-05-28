import type { LatLng } from "../public-data-types";

export function isValidKoreaCoordinate(position: LatLng | undefined): boolean {
  if (!position) return false;

  const { lat, lng } = position;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;

  return lat >= 33 && lat <= 39 && lng >= 124 && lng <= 132;
}

export function parseCoordinate(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim().replace(/,/g, "");
  if (!normalized) return undefined;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}
