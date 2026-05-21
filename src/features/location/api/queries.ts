import type {
  LocationSearchRequest,
  LocationSearchResponse,
} from "../model/types";
import LocationAPI from "./LocationAPI";

export const locationSearchMutationKey = ["location", "search-keyword"] as const;

export function createLocationSearchMutationOptions() {
  return {
    mutationKey: locationSearchMutationKey,
    mutationFn: async (
      input: LocationSearchRequest,
    ): Promise<LocationSearchResponse> => {
      const { data } = await LocationAPI.searchKeyword(input);
      return data;
    },
  };
}
