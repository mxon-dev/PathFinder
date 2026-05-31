import { NextResponse } from "next/server";
import type { WalkRecommendationsResponse } from "@/features/walk/model/types";
import { buildWalkRecommendations } from "@/lib/walk/build-walk-recommendations";

export const runtime = "nodejs";

function parseNumber(value: string | null): number | undefined {
  if (!value) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const duration = url.searchParams.get("duration") ?? undefined;
  const places = url.searchParams.get("places") ?? undefined;
  const lat = parseNumber(url.searchParams.get("lat"));
  const lng = parseNumber(url.searchParams.get("lng"));
  const locationName = url.searchParams.get("locationName") ?? undefined;
  const freeText = url.searchParams.get("freeText") ?? undefined;

  try {
    const result = await buildWalkRecommendations({
      duration,
      places,
      lat,
      lng,
      locationName: locationName ?? freeText,
    });
    return NextResponse.json(result satisfies WalkRecommendationsResponse);
  } catch (e) {
    console.error("[walk-recommendations]", e);
    return NextResponse.json(
      { error: "Failed to load walk recommendations." },
      { status: 500 },
    );
  }
}
