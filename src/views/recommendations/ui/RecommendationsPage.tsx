"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { KakaoMap, type KakaoMapMarker } from "@/components/map/KakaoMap";
import { MOCK_RECOMMENDED_COURSES } from "@/features/walk/model/mock-courses";
import { RECOMMENDATION_FILTERS } from "@/features/walk/model/recommendation-filters";
import type {
  CourseCandidate,
  RecommendationFilterId,
  WalkCategory,
} from "@/features/walk/model/types";

const CATEGORY_META: Record<
  WalkCategory,
  {
    label: string;
    emoji: string;
    chipClass: string;
  }
> = {
  river: {
    label: "강변",
    emoji: "🌊",
    chipClass: "bg-sky-50 text-sky-600",
  },
  park: {
    label: "공원",
    emoji: "🌳",
    chipClass: "bg-emerald-50 text-emerald-700",
  },
  mountain: {
    label: "산",
    emoji: "⛰️",
    chipClass: "bg-lime-50 text-lime-700",
  },
  city: {
    label: "도심",
    emoji: "🏙️",
    chipClass: "bg-violet-50 text-violet-700",
  },
  lake: {
    label: "호수",
    emoji: "🏖️",
    chipClass: "bg-cyan-50 text-cyan-700",
  },
};

const PLACE_PARAM_TO_CATEGORY: Record<string, WalkCategory> = {
  river: "river",
  park: "park",
  mountain: "mountain",
  urban: "city",
  city: "city",
  lake: "lake",
};

function IconBack() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function IconFilter() {
  return (
    <svg
      width="25"
      height="25"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4 6h13" />
      <path d="M4 12h9" />
      <path d="M4 18h5" />
    </svg>
  );
}

function formatDuration(durationMin?: number) {
  if (!durationMin) return "-";
  if (durationMin < 60) return `${durationMin}분`;
  if (durationMin === 60) return "1시간";
  const hour = Math.floor(durationMin / 60);
  const minute = durationMin % 60;
  return minute ? `${hour}시간 ${minute}분` : `${hour}시간`;
}

function formatDistance(distanceKm?: number) {
  if (!distanceKm) return "-";
  return `${distanceKm.toFixed(1)}km`;
}

function getPrimaryCategory(course: CourseCandidate) {
  return course.category[0] ?? "city";
}

function filterCourses(
  courses: CourseCandidate[],
  activeFilter: RecommendationFilterId,
) {
  if (activeFilter === "all") return courses;
  if (activeFilter === "under30") {
    return courses.filter((course) => (course.durationMin ?? Infinity) <= 30);
  }
  if (activeFilter === "under60") {
    return courses.filter((course) => (course.durationMin ?? Infinity) <= 60);
  }
  return courses.filter((course) => course.category.includes(activeFilter));
}

function buildCourseDetailHref(
  courseId: string,
  params: Pick<RecommendationsPageProps, "duration" | "places">,
) {
  const query = new URLSearchParams();

  if (params.duration) query.set("duration", params.duration);
  if (params.places) query.set("places", params.places);

  const suffix = query.toString();
  return suffix
    ? `/recommendations/${courseId}?${suffix}`
    : `/recommendations/${courseId}`;
}

type RecommendationsPageProps = {
  duration?: string;
  places?: string;
  lat?: number;
  lng?: number;
  locationName?: string;
  freeText?: string;
};

function getInitialSummary(params: RecommendationsPageProps) {
  const duration = params.duration ?? "30";
  const requestedPlaces = params.places
    ?.split(",")
    .map((value) => PLACE_PARAM_TO_CATEGORY[value])
    .filter(Boolean) as WalkCategory[] | undefined;
  const category = requestedPlaces?.[0] ?? "park";
  const categoryMeta = CATEGORY_META[category];
  return {
    durationLabel: duration === "60" ? "1시간" : `${duration}분`,
    categoryLabel: `${categoryMeta.emoji} ${categoryMeta.label}`,
  };
}

function CourseMapPreview({ course }: { course: CourseCandidate }) {
  const routePath = useMemo(
    () => (course.path && course.path.length >= 2 ? course.path : []),
    [course.path],
  );
  const markers = useMemo(() => {
    const nextMarkers: KakaoMapMarker[] = [];
    const start = course.start;
    const end = course.end;

    if (typeof start?.lat === "number" && typeof start.lng === "number") {
      nextMarkers.push({
        id: `${course.id}-start`,
        position: { lat: start.lat, lng: start.lng },
        title: start.name ?? `${course.title} 출발`,
        tone: "start" as const,
      });
    }

    if (typeof end?.lat === "number" && typeof end.lng === "number") {
      nextMarkers.push({
        id: `${course.id}-end`,
        position: { lat: end.lat, lng: end.lng },
        title: end.name ?? `${course.title} 도착`,
        tone: "end" as const,
      });
    }

    if (nextMarkers.length === 0) {
      nextMarkers.push({
        id: `${course.id}-center`,
        position: course.center,
        title: course.title,
        tone: "default" as const,
      });
    }

    return nextMarkers;
  }, [course.center, course.end, course.id, course.start, course.title]);

  return (
    <KakaoMap
      center={course.center}
      markers={markers}
      path={routePath}
      level={5}
      interactive={false}
      className="pointer-events-none h-32 w-full"
    />
  );
}

function CourseCard({
  course,
  href,
}: {
  course: CourseCandidate;
  href: string;
}) {
  const primaryCategory = getPrimaryCategory(course);
  const meta = CATEGORY_META[primaryCategory];

  return (
    <Link
      href={href}
      className="block overflow-hidden rounded-2xl border border-neutral-100 bg-white shadow-[0_10px_24px_rgba(15,23,42,0.07)] transition active:scale-[0.99]"
      aria-label={`${course.title} 상세 보기`}
    >
      <article>
        <CourseMapPreview course={course} />
        <div className="px-4 py-4">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${meta.chipClass}`}
          >
            <span aria-hidden>{meta.emoji}</span>
            {meta.label}
          </span>
          <h2 className="mt-3 text-lg font-extrabold leading-tight text-slate-950">
            {course.title}
          </h2>
          <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
            {course.description}
          </p>
          <div className="mt-4 border-t border-slate-200 pt-3">
            <dl className="grid grid-cols-2 gap-2">
              <div>
                <dt className="text-[11px] font-bold text-slate-300">
                  소요 시간
                </dt>
                <dd className="mt-1 text-sm font-extrabold text-blue-500">
                  {formatDuration(course.durationMin)}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] font-bold text-slate-300">거리</dt>
                <dd className="mt-1 text-sm font-extrabold text-slate-950">
                  {formatDistance(course.distanceKm)}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </article>
    </Link>
  );
}

export function RecommendationsPage({
  duration,
  places,
}: RecommendationsPageProps) {
  const [activeFilter, setActiveFilter] = useState<RecommendationFilterId>("all");
  const summary = useMemo(
    () => getInitialSummary({ duration, places }),
    [duration, places],
  );
  const courses = useMemo(
    () => filterCourses(MOCK_RECOMMENDED_COURSES, activeFilter),
    [activeFilter],
  );

  return (
    <main className="fixed inset-0 box-border flex min-h-0 flex-col overflow-hidden overscroll-none bg-neutral-200/60 px-4 py-4 md:px-8 md:py-6">
      <section className="mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col overflow-hidden rounded-[1.75rem] border border-neutral-200/80 bg-white shadow-lg ring-1 ring-black/5">
        <header className="shrink-0 bg-white">
          <div className="flex h-14 items-center justify-between px-4">
            <Link
              href="/"
              className="flex h-10 w-10 items-center justify-center text-slate-900"
              aria-label="이전 화면"
            >
              <IconBack />
            </Link>
            <h1 className="text-xl font-extrabold tracking-normal text-slate-950">
              추천 코스
            </h1>
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center text-slate-500"
              aria-label="필터"
            >
              <IconFilter />
            </button>
          </div>
          <div className="border-y border-slate-200">
            <div className="flex gap-2 overflow-x-auto px-3 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {RECOMMENDATION_FILTERS.map((filter) => {
                const selected = activeFilter === filter.id;
                return (
                  <button
                    key={filter.id}
                    type="button"
                    onClick={() => setActiveFilter(filter.id)}
                    className={
                      selected
                        ? "h-9 shrink-0 rounded-full bg-blue-500 px-4 text-sm font-bold text-white shadow-sm"
                        : "h-9 shrink-0 rounded-full border border-slate-200 bg-white px-4 text-sm font-bold text-slate-500"
                    }
                  >
                    {filter.label}
                  </button>
                );
              })}
            </div>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-slate-50 px-4 py-4">
          <p className="text-base font-extrabold leading-6 text-slate-950">
            &apos;{summary.durationLabel} 산책 · {summary.categoryLabel} 코스&apos;에
            맞는 코스 {courses.length}개
          </p>
          <div className="mt-4 space-y-4 pb-6">
            {courses.length === 0 ? (
              <div className="rounded-2xl border border-neutral-100 bg-white px-4 py-8 text-center text-sm font-bold text-slate-400">
                조건에 맞는 코스를 찾지 못했어요.
              </div>
            ) : null}
            {courses.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                href={buildCourseDetailHref(course.id, { duration, places })}
              />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
