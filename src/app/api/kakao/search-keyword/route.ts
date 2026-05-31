import { NextRequest, NextResponse } from "next/server";
import { searchKeyword, KakaoLocalApiError } from "@/lib/kakao/kakao-local-client";
import { kakaoErrorToHttpResponse } from "@/lib/kakao/kakao-route-errors";
import type {
  KakaoPlaceDocument,
  NormalizedKakaoPlace,
} from "@/lib/kakao/kakao-types";

export const runtime = "nodejs";

function normalizePlace(document: KakaoPlaceDocument): NormalizedKakaoPlace {
  return {
    id: document.id,
    name: document.place_name,
    categoryName: document.category_name,
    categoryGroupCode: document.category_group_code,
    addressName: document.address_name,
    roadAddressName: document.road_address_name,
    lat: Number(document.y),
    lng: Number(document.x),
    placeUrl: document.place_url,
    distanceM: document.distance ? Number(document.distance) : undefined,
    source: "kakao_local",
  };
}

function parseOptionalNumber(value: string | null) {
  if (!value) return { ok: true as const, value: undefined };
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return { ok: false as const };
  return { ok: true as const, value: parsed };
}

function kakaoFailureLog(error: unknown, query: string) {
  if (error instanceof KakaoLocalApiError) {
    console.error("[kakao/search-keyword]", {
      status: error.status,
      endpoint: error.endpoint,
      query,
      kakaoCode: error.kakaoCode,
      kakaoMessage: error.kakaoMessage,
    });
    return;
  }

  console.error("[kakao/search-keyword]", {
    endpoint: "/search/keyword.json",
    query,
  });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query")?.trim();
  const latParam = parseOptionalNumber(searchParams.get("lat"));
  const lngParam = parseOptionalNumber(searchParams.get("lng"));
  const radiusParam = parseOptionalNumber(searchParams.get("radius"));

  if (!query) {
    return NextResponse.json(
      { message: "query is required." },
      { status: 400 },
    );
  }

  if (!latParam.ok || !lngParam.ok || !radiusParam.ok) {
    return NextResponse.json(
      { message: "lat, lng, and radius must be numbers when provided." },
      { status: 400 },
    );
  }

  const lat = latParam.value;
  const lng = lngParam.value;
  const radius = radiusParam.value;

  if ((lat === undefined) !== (lng === undefined)) {
    return NextResponse.json(
      { message: "lat and lng must be provided together." },
      { status: 400 },
    );
  }

  if (radius !== undefined && (radius < 0 || radius > 20000)) {
    return NextResponse.json(
      { message: "radius must be between 0 and 20000." },
      { status: 400 },
    );
  }

  try {
    const data = await searchKeyword({
      query,
      lat,
      lng,
      radius,
      sort: lat !== undefined && lng !== undefined ? "distance" : "accuracy",
      size: 10,
    });

    return NextResponse.json({
      meta: data.meta,
      places: data.documents.map(normalizePlace),
    });
  } catch (error) {
    kakaoFailureLog(error, query);
    const { status, body } = kakaoErrorToHttpResponse(error);
    return NextResponse.json(body, { status });
  }
}
