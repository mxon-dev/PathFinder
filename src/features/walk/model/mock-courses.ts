import type { CourseCandidate } from "./types";

export const MOCK_RECOMMENDED_COURSES: CourseCandidate[] = [
  {
    id: "mock-hangang-riverside",
    title: "한강 둔치 산책로",
    category: ["river", "park"],
    source: "public_trail",
    center: { lat: 37.5267, lng: 126.9337 },
    start: { name: "여의나루역 인근", lat: 37.5272, lng: 126.9327 },
    end: { name: "한강공원 산책 구간", lat: 37.5284, lng: 126.944 },
    path: [
      { lat: 37.5272, lng: 126.9327 },
      { lat: 37.5278, lng: 126.9362 },
      { lat: 37.5281, lng: 126.9398 },
      { lat: 37.5284, lng: 126.944 },
    ],
    distanceKm: 2.1,
    durationMin: 30,
    description:
      "탁 트인 한강을 따라 걷는 평탄한 산책코스. 노을 시간대에 특히 추천.",
  },
  {
    id: "mock-seoul-forest-loop",
    title: "서울숲 순환 코스",
    category: ["park"],
    source: "public_park",
    center: { lat: 37.5444, lng: 127.0374 },
    start: { name: "서울숲 입구", lat: 37.5444, lng: 127.0374 },
    end: { name: "서울숲 순환 지점", lat: 37.5465, lng: 127.0417 },
    path: [
      { lat: 37.5444, lng: 127.0374 },
      { lat: 37.5462, lng: 127.0379 },
      { lat: 37.547, lng: 127.0402 },
      { lat: 37.5465, lng: 127.0417 },
      { lat: 37.5447, lng: 127.0411 },
      { lat: 37.5438, lng: 127.0392 },
      { lat: 37.5444, lng: 127.0374 },
    ],
    distanceKm: 3.2,
    durationMin: 45,
    description:
      "울창한 나무 그늘 아래 걷는 숲속 순환 코스. 조용하고 공기가 맑아요.",
  },
  {
    id: "mock-cheonggye-stream",
    title: "청계천 물길 코스",
    category: ["river", "city"],
    source: "public_trail",
    center: { lat: 37.5691, lng: 126.9787 },
    start: { name: "청계광장", lat: 37.5691, lng: 126.9787 },
    end: { name: "수표교 인근", lat: 37.568, lng: 126.9892 },
    path: [
      { lat: 37.5691, lng: 126.9787 },
      { lat: 37.5688, lng: 126.9818 },
      { lat: 37.5686, lng: 126.9845 },
      { lat: 37.5682, lng: 126.987 },
      { lat: 37.568, lng: 126.9892 },
    ],
    distanceKm: 1.8,
    durationMin: 25,
    description:
      "도심 속 물길을 따라 짧게 걷기 좋은 코스. 퇴근 후 가볍게 걷기 좋아요.",
  },
  {
    id: "mock-namsan-foothill",
    title: "남산 자락길 코스",
    category: ["mountain", "city"],
    source: "forest_trail",
    center: { lat: 37.5509, lng: 126.9909 },
    start: { name: "남산 자락길 입구", lat: 37.5517, lng: 126.9885 },
    end: { name: "남산 숲길 전망 지점", lat: 37.5488, lng: 126.9947 },
    path: [
      { lat: 37.5517, lng: 126.9885 },
      { lat: 37.5509, lng: 126.9909 },
      { lat: 37.5502, lng: 126.9928 },
      { lat: 37.5488, lng: 126.9947 },
    ],
    distanceKm: 4.3,
    durationMin: 60,
    description:
      "완만한 오르막과 숲길이 섞인 코스. 가벼운 운동감을 원할 때 잘 맞아요.",
  },
];

export function findMockRecommendedCourse(courseId: string) {
  return MOCK_RECOMMENDED_COURSES.find((course) => course.id === courseId);
}
