import type { WalkRecommendationsParams } from "./WalkRecommendationsAPI";
import WalkRecommendationsAPI from "./WalkRecommendationsAPI";

export const walkRecommendationsQueryKey = ["walk-recommendations"] as const;

export function walkRecommendationsQueryOptions(params: WalkRecommendationsParams) {
  return {
    queryKey: [...walkRecommendationsQueryKey, params] as const,
    queryFn: async () => {
      const { data } = await WalkRecommendationsAPI.list(params);
      return data;
    },
  };
}
