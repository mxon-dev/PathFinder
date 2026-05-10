import type { AIDocentResponse } from "../model/types";

function stripJsonFence(text: string): string {
  const trimmed = text.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)```$/i.exec(trimmed);
  if (fence) return fence[1].trim();
  return trimmed;
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === "string")
  );
}

function normalizeStrings(value: unknown): string[] {
  if (!isStringArray(value)) return [];
  return value.map((s) => s.trim()).filter(Boolean);
}

export function parseDocentResponse(raw: string): AIDocentResponse {
  const cleaned = stripJsonFence(raw);
  const parsed: unknown = JSON.parse(cleaned);

  if (!parsed || typeof parsed !== "object") {
    throw new Error("Invalid docent payload shape");
  }

  const o = parsed as Record<string, unknown>;
  const title = typeof o.title === "string" ? o.title.trim() : "";
  const summary = typeof o.summary === "string" ? o.summary.trim() : "";
  const docentScript =
    typeof o.docentScript === "string" ? o.docentScript.trim() : "";

  return {
    title: title || "산책 안내",
    summary: summary || "제공된 경로 정보를 바탕으로 한 안내입니다.",
    highlights: normalizeStrings(o.highlights),
    recommendedFor: normalizeStrings(o.recommendedFor),
    cautionNotes: normalizeStrings(o.cautionNotes),
    docentScript:
      docentScript ||
      "제공된 산책로 데이터만으로 짧게 안내드립니다. 주변 시설·안전은 직접 확인해 주세요.",
  };
}
