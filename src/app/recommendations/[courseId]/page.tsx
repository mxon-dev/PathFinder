import { notFound } from "next/navigation";
import { RecommendationCourseDetailPage } from "@/views/recommendations-detail/ui/RecommendationCourseDetailPage";
import { findRecommendedCourseById } from "@/lib/walk/build-walk-recommendations";

type PageProps = {
  params: Promise<{
    courseId: string;
  }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function parseNumber(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function buildBackHref(searchParams: Record<string, string | string[] | undefined>) {
  const query = new URLSearchParams();

  if (typeof searchParams.duration === "string") {
    query.set("duration", searchParams.duration);
  }
  if (typeof searchParams.places === "string") {
    query.set("places", searchParams.places);
  }
  if (typeof searchParams.lat === "string") {
    query.set("lat", searchParams.lat);
  }
  if (typeof searchParams.lng === "string") {
    query.set("lng", searchParams.lng);
  }
  if (typeof searchParams.locationName === "string") {
    query.set("locationName", searchParams.locationName);
  }
  if (typeof searchParams.freeText === "string") {
    query.set("freeText", searchParams.freeText);
  }

  const suffix = query.toString();
  return suffix ? `/recommendations?${suffix}` : "/recommendations";
}

export default async function Page({ params, searchParams }: PageProps) {
  const [{ courseId }, resolvedSearchParams] = await Promise.all([
    params,
    searchParams,
  ]);

  const course = await findRecommendedCourseById(courseId, {
    duration:
      typeof resolvedSearchParams.duration === "string"
        ? resolvedSearchParams.duration
        : undefined,
    places:
      typeof resolvedSearchParams.places === "string"
        ? resolvedSearchParams.places
        : undefined,
    lat: parseNumber(
      typeof resolvedSearchParams.lat === "string"
        ? resolvedSearchParams.lat
        : undefined,
    ),
    lng: parseNumber(
      typeof resolvedSearchParams.lng === "string"
        ? resolvedSearchParams.lng
        : undefined,
    ),
    locationName:
      typeof resolvedSearchParams.locationName === "string"
        ? resolvedSearchParams.locationName
        : undefined,
    freeText:
      typeof resolvedSearchParams.freeText === "string"
        ? resolvedSearchParams.freeText
        : undefined,
  });

  if (!course) {
    notFound();
  }

  return (
    <RecommendationCourseDetailPage
      course={course}
      backHref={buildBackHref(resolvedSearchParams)}
    />
  );
}
