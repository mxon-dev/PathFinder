import { NextRequest, NextResponse } from "next/server";
import {
  coordToRegion,
  KakaoLocalApiError,
} from "@/lib/kakao/kakao-local-client";

export const runtime = "nodejs";

function kakaoFailureLog(error: unknown) {
  if (error instanceof KakaoLocalApiError) {
    console.error("[kakao/coord-to-region]", {
      status: error.status,
      endpoint: error.endpoint,
    });
    return;
  }

  console.error("[kakao/coord-to-region]", {
    endpoint: "/geo/coord2regioncode.json",
  });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json(
      { message: "lat, lng are required." },
      { status: 400 },
    );
  }

  try {
    const data = await coordToRegion({ lat, lng });
    const legalRegion = data.documents.find((item) => item.region_type === "B");
    const adminRegion = data.documents.find((item) => item.region_type === "H");

    return NextResponse.json({
      legalRegion,
      adminRegion,
      rawCount: data.documents.length,
    });
  } catch (error) {
    kakaoFailureLog(error);
    return NextResponse.json(
      { message: "Failed to convert coordinate to region." },
      { status: 502 },
    );
  }
}
