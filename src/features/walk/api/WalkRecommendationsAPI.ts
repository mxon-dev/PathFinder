import axios from "axios";
import type { WalkRecommendationsResponse } from "@/features/walk/model/types";

export type WalkRecommendationsParams = {
  duration?: string;
  places?: string;
  lat?: number;
  lng?: number;
  locationName?: string;
  freeText?: string;
};

class WalkRecommendationsAPI {
  list(params: WalkRecommendationsParams) {
    return axios.get<WalkRecommendationsResponse>("/api/walk-recommendations", {
      params,
    });
  }
}

export default new WalkRecommendationsAPI();
