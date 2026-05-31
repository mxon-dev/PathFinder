import type {
  KakaoLocalMeta,
  NormalizedKakaoPlace,
} from "@/lib/kakao/kakao-types";

export type LocationSearchRequest = {
  query: string;
};

export type LocationSearchResponse = {
  meta: KakaoLocalMeta;
  places: NormalizedKakaoPlace[];
};

export type KakaoRegion = {
  address_name?: string;
  region_1depth_name?: string;
  region_2depth_name?: string;
  region_3depth_name?: string;
};

export type CoordToRegionRequest = {
  lat: number;
  lng: number;
};

export type CoordToRegionResponse = {
  legalRegion?: KakaoRegion;
  adminRegion?: KakaoRegion;
  rawCount: number;
};
