import { api } from "@/shared/api/api";
import type {
  CoordToRegionRequest,
  CoordToRegionResponse,
  LocationSearchRequest,
  LocationSearchResponse,
} from "../model/types";

class LocationAPI {
  searchKeyword(params: LocationSearchRequest) {
    return api.get<LocationSearchResponse>("/api/kakao/search-keyword", {
      params,
    });
  }

  coordToRegion(params: CoordToRegionRequest) {
    return api.get<CoordToRegionResponse>("/api/kakao/coord-to-region", {
      params,
    });
  }
}

export default new LocationAPI();
