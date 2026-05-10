"use client";

import axios from "axios";
import { useAIDocentAPI } from "../api/useAIDocentAPI";
import type { AIDocentResponse } from "../model/types";

const CLIENT_ERROR =
  "AI 도슨트 생성에 실패했습니다. 잠시 후 다시 시도해주세요.";

function formatDocentError(err: unknown): string {
  if (!axios.isAxiosError(err)) return CLIENT_ERROR;
  const data = err.response?.data as
    | { error?: string; detail?: string }
    | undefined;
  const detail = data?.detail?.trim();
  const apiErr = data?.error?.trim();
  if (detail) return `${CLIENT_ERROR} (${detail})`;
  if (apiErr) return `${CLIENT_ERROR} (${apiErr})`;
  if (err.code === "ERR_NETWORK") {
    return `${CLIENT_ERROR} (네트워크 오류 — 서버가 실행 중인지 확인하세요.)`;
  }
  return CLIENT_ERROR;
}

function SectionList({
  title,
  items,
  ordered,
}: {
  title: string;
  items: string[];
  ordered?: boolean;
}) {
  if (!items.length) return null;
  const List = ordered ? "ol" : "ul";
  return (
    <section className="mt-4">
      <h3 className="text-sm font-semibold text-neutral-800">{title}</h3>
      <List className="mt-1 list-inside text-sm text-neutral-700 marker:text-neutral-400">
        {items.map((item, i) => (
          <li key={`${i}-${item.slice(0, 32)}`} className="mt-0.5">
            {item}
          </li>
        ))}
      </List>
    </section>
  );
}

function ResultView({ data }: { data: AIDocentResponse }) {
  return (
    <article className="mt-4 rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold text-neutral-900">{data.title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-neutral-700">
        {data.summary}
      </p>
      <SectionList title="하이라이트" items={data.highlights} />
      <SectionList title="이런 분께 추천" items={data.recommendedFor} />
      <SectionList title="주의" items={data.cautionNotes} ordered />
      <section className="mt-4 border-t border-neutral-100 pt-4">
        <h3 className="text-sm font-semibold text-neutral-800">도슨트 멘트</h3>
        <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-neutral-700">
          {data.docentScript}
        </p>
      </section>
    </article>
  );
}

export function AIDocentPanel() {
  const mutation = useAIDocentAPI();

  const handleGenerate = () => {
    mutation.mutate({
      routeId: "demo-001",
      routeName: "한강 인근 산책로 (데모)",
      distanceKm: 2.4,
      estimatedMinutes: 35,
      difficulty: "easy",
      locationText: "서울, 한강 공원 인근 보행 코스 (샘플 데이터)",
      routeDescription: "포장 보행로가 이어진 평지 위주 구간.",
      keywords: ["한강", "평지", "보행"],
      userPreference: "healing",
    });
  };

  return (
    <section className="mt-8 max-w-2xl rounded-xl border border-neutral-200 bg-neutral-50/80 p-6">
      <h2 className="text-base font-semibold text-neutral-900">AI 도슨트 (데모)</h2>
      <p className="mt-1 text-sm text-neutral-600">
        서버에서 읽는 변수: <code className="rounded bg-neutral-200 px-1">.env.local</code>의{" "}
        <code className="rounded bg-neutral-200 px-1">GEMINI_API_KEY</code> (또는{" "}
        <code className="rounded bg-neutral-200 px-1">GOOGLE_API_KEY</code>).{" "}
        <code className="rounded bg-neutral-200 px-1">.env.example</code>만 고치면 키가 적용되지 않습니다. 변경 후 dev 서버를 재시작하세요. 클라이언트는{" "}
        <code className="rounded bg-neutral-200 px-1">/api/ai-docent</code>만 호출합니다.
      </p>
      <button
        type="button"
        onClick={handleGenerate}
        disabled={mutation.isPending}
        className="mt-4 inline-flex items-center justify-center rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {mutation.isPending ? "생성 중…" : "샘플 경로로 도슨트 생성"}
      </button>
      {mutation.isError ? (
        <p className="mt-3 text-sm text-red-700" role="alert">
          {formatDocentError(mutation.error)}
        </p>
      ) : null}
      {mutation.isSuccess && mutation.data ? (
        <ResultView data={mutation.data} />
      ) : null}
    </section>
  );
}
