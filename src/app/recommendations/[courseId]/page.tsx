import { notFound } from "next/navigation";
import { findMockRecommendedCourse } from "@/features/walk/model/mock-courses";
import { RecommendationCourseDetailPage } from "@/views/recommendations-detail/ui/RecommendationCourseDetailPage";

type PageProps = {
  params: Promise<{
    courseId: string;
  }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function buildBackHref(searchParams: Record<string, string | string[] | undefined>) {
  const query = new URLSearchParams();

  if (typeof searchParams.duration === "string") {
    query.set("duration", searchParams.duration);
  }
  if (typeof searchParams.places === "string") {
    query.set("places", searchParams.places);
  }

  const suffix = query.toString();
  return suffix ? `/recommendations?${suffix}` : "/recommendations";
}

export default async function Page({ params, searchParams }: PageProps) {
  const [{ courseId }, resolvedSearchParams] = await Promise.all([
    params,
    searchParams,
  ]);
  const course = findMockRecommendedCourse(courseId);

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
