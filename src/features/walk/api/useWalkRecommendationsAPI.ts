"use client";

import { useQuery } from "@tanstack/react-query";
import type { WalkRecommendationsParams } from "./WalkRecommendationsAPI";
import { walkRecommendationsQueryOptions } from "./queries";

export function useWalkRecommendations(params: WalkRecommendationsParams) {
  return useQuery({
    ...walkRecommendationsQueryOptions(params),
    staleTime: 60_000,
  });
}
