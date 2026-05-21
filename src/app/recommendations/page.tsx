import { RecommendationsPage } from "@/views/recommendations/ui/RecommendationsPage";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Page({ searchParams }: PageProps) {
  const params = await searchParams;
  const lat = typeof params.lat === "string" ? Number(params.lat) : undefined;
  const lng = typeof params.lng === "string" ? Number(params.lng) : undefined;

  return (
    <RecommendationsPage
      duration={typeof params.duration === "string" ? params.duration : undefined}
      places={typeof params.places === "string" ? params.places : undefined}
      lat={Number.isFinite(lat) ? lat : undefined}
      lng={Number.isFinite(lng) ? lng : undefined}
      locationName={
        typeof params.locationName === "string" ? params.locationName : undefined
      }
      freeText={typeof params.freeText === "string" ? params.freeText : undefined}
    />
  );
}
