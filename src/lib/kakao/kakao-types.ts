export type LatLng = {
  lat: number;
  lng: number;
};

export type KakaoRegionDocument = {
  region_type: "B" | "H";
  code: string;
  address_name: string;
  region_1depth_name: string;
  region_2depth_name: string;
  region_3depth_name: string;
  region_4depth_name: string;
  x: number;
  y: number;
};

export type KakaoPlaceDocument = {
  id: string;
  place_name: string;
  category_name: string;
  category_group_code: string;
  category_group_name: string;
  phone: string;
  address_name: string;
  road_address_name: string;
  x: string;
  y: string;
  place_url: string;
  distance: string;
};

export type KakaoLocalMeta = {
  total_count: number;
  pageable_count: number;
  is_end: boolean;
  same_name?: {
    region: string[];
    keyword: string;
    selected_region: string;
  };
};

export type KakaoLocalResponse<T> = {
  meta: KakaoLocalMeta;
  documents: T[];
};

export type NormalizedKakaoPlace = {
  id: string;
  name: string;
  categoryName: string;
  categoryGroupCode: string;
  addressName: string;
  roadAddressName: string;
  lat: number;
  lng: number;
  placeUrl: string;
  distanceM?: number;
  source: "kakao_local";
};
