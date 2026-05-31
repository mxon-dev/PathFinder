"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useMemo } from "react";
import { KakaoMap } from "@/components/map/KakaoMap";
import { IconClock } from "@/components/pathfinder-assistant/icons";
import type { CourseCandidate } from "@/features/walk/model/types";
import { buildCourseMapMarkers } from "@/lib/walk/build-course-map-markers";

type RecommendationCourseDetailPageProps = {
  course: CourseCandidate;
  backHref: string;
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

function IconDistance() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4 17c4-8 12-2 16-10" />
      <path d="m14 7 4-1 1 4" />
      <path d="m5 18 3 1" />
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

function CourseDetailMap({ course }: { course: CourseCandidate }) {
  const routePath = useMemo(
    () => (course.path && course.path.length >= 2 ? course.path : []),
    [course.path],
  );
  const markers = useMemo(
    () => buildCourseMapMarkers(course),
    [course],
  );

  return (
    <KakaoMap
      key={course.id}
      instanceId={course.id}
      center={course.center}
      markers={markers}
      path={routePath}
      level={4}
      interactive
      className="absolute inset-0 h-full w-full"
      pathStrokeColor="#0ea5e9"
      pathStrokeWeight={6}
    />
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-h-20 flex-col items-center justify-center rounded-lg bg-slate-100 px-3 text-center">
      <span className="text-slate-700">{icon}</span>
      <strong className="mt-2 text-xl font-extrabold leading-none text-slate-950">
        {value}
      </strong>
      <span className="mt-1.5 text-xs font-bold text-slate-300">{label}</span>
    </div>
  );
}

export function RecommendationCourseDetailPage({
  course,
  backHref,
}: RecommendationCourseDetailPageProps) {
  return (
    <main className="box-border flex h-dvh max-h-dvh min-h-0 flex-col overflow-hidden bg-neutral-200/60 px-4 py-4 md:px-8 md:py-6">
      <section className="mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col overflow-hidden rounded-[1.75rem] border border-neutral-200/80 bg-white shadow-lg ring-1 ring-black/5">
        <header className="z-10 flex h-16 shrink-0 items-center gap-2 bg-white px-4">
          <Link
            href={backHref}
            className="flex h-10 w-10 shrink-0 items-center justify-center text-slate-900"
            aria-label="추천 코스 목록으로 이동"
          >
            <IconBack />
          </Link>
          <h1 className="min-w-0 truncate text-xl font-extrabold tracking-normal text-slate-950">
            {course.title}
          </h1>
        </header>

        <div className="relative min-h-0 flex-1 overflow-hidden bg-slate-100">
          <CourseDetailMap course={course} />
          <section className="absolute inset-x-0 bottom-0 z-10 max-h-[56%] overflow-y-auto overscroll-contain rounded-t-[2rem] bg-white px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-8 shadow-[0_-10px_30px_rgba(15,23,42,0.08)]">
            <div className="absolute left-1/2 top-3 h-1 w-12 -translate-x-1/2 rounded-full bg-slate-200" />
            <h2 className="text-2xl font-extrabold leading-tight text-slate-950">
              {course.title}
            </h2>
            <dl className="mt-4 grid grid-cols-2 gap-3">
              <StatCard
                icon={<IconClock className="h-5 w-5" />}
                label="소요시간"
                value={formatDuration(course.durationMin)}
              />
              <StatCard
                icon={<IconDistance />}
                label="거리"
                value={formatDistance(course.distanceKm)}
              />
            </dl>
            <p className="mt-4 text-base font-medium leading-7 text-slate-500">
              {course.description}
            </p>
          </section>
        </div>
      </section>
    </main>
  );
}
