import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { buildDocentPrompt } from "@/features/ai-docent/lib/buildDocentPrompt";
import { parseDocentResponse } from "@/features/ai-docent/lib/parseDocentResponse";
import type {
  AIDocentRequest,
  AIDocentResponse,
} from "@/features/ai-docent/model/types";

export const runtime = "nodejs";

const DIFFICULTIES = new Set(["easy", "normal", "hard"]);
const PREFERENCES = new Set([
  "healing",
  "exercise",
  "history",
  "nature",
  "family",
]);

function parseRequest(body: unknown): AIDocentRequest | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;

  if (typeof b.routeId !== "string" || !b.routeId.trim()) return null;
  if (typeof b.routeName !== "string" || !b.routeName.trim()) return null;

  const out: AIDocentRequest = {
    routeId: b.routeId.trim(),
    routeName: b.routeName.trim(),
  };

  if (typeof b.distanceKm === "number" && Number.isFinite(b.distanceKm)) {
    out.distanceKm = b.distanceKm;
  }
  if (
    typeof b.estimatedMinutes === "number" &&
    Number.isFinite(b.estimatedMinutes)
  ) {
    out.estimatedMinutes = b.estimatedMinutes;
  }

  if (typeof b.difficulty === "string") {
    const d = b.difficulty;
    if (DIFFICULTIES.has(d)) {
      out.difficulty = d as AIDocentRequest["difficulty"];
    }
  }

  if (typeof b.locationText === "string" && b.locationText.trim()) {
    out.locationText = b.locationText.trim();
  }
  if (typeof b.routeDescription === "string" && b.routeDescription.trim()) {
    out.routeDescription = b.routeDescription.trim();
  }

  if (Array.isArray(b.keywords)) {
    const kw = b.keywords.filter(
      (k): k is string => typeof k === "string" && k.trim().length > 0,
    );
    if (kw.length) out.keywords = kw;
  }

  if (typeof b.userPreference === "string") {
    const p = b.userPreference;
    if (PREFERENCES.has(p)) {
      out.userPreference =
        p as NonNullable<AIDocentRequest["userPreference"]>;
    }
  }

  return out;
}

function errorMessage(err: unknown): string | undefined {
  if (err instanceof Error && err.message.trim()) {
    return err.message.trim().slice(0, 600);
  }
  return undefined;
}

export async function POST(req: Request) {
  const apiKey = (
    process.env.GEMINI_API_KEY ??
    process.env.GOOGLE_API_KEY ??
    ""
  ).trim();
  const modelName = (process.env.GEMINI_MODEL ?? "gemini-2.5-flash").trim();

  if (!apiKey) {
    return NextResponse.json(
      {
        error: "Server is not configured with GEMINI_API_KEY.",
        detail:
          "Set GEMINI_API_KEY or GOOGLE_API_KEY in .env.local, then restart `pnpm dev`.",
      },
      { status: 503 },
    );
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const input = parseRequest(json);
  if (!input) {
    return NextResponse.json(
      { error: "Invalid request: routeId and routeName are required." },
      { status: 400 },
    );
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      responseMimeType: "application/json",
    },
  });

  const prompt = buildDocentPrompt(input);

  try {
    const result = await model.generateContent(prompt);
    const response = result.response;

    let text: string;
    try {
      text = response.text().trim();
    } catch (textErr) {
      console.error("[ai-docent] response.text()", textErr);
      return NextResponse.json(
        {
          error: "Model response could not be read.",
          detail: errorMessage(textErr),
        },
        { status: 502 },
      );
    }

    if (!text) {
      const noCandidates = !response.candidates?.length;
      return NextResponse.json(
        {
          error: "Empty model response.",
          detail: noCandidates
            ? `No candidates from model "${modelName}". Wrong model id, blocked prompt, or quota — check terminal logs.`
            : undefined,
        },
        { status: 502 },
      );
    }

    let normalized: AIDocentResponse;
    try {
      normalized = parseDocentResponse(text);
    } catch {
      return NextResponse.json(
        {
          error: "Model returned invalid JSON.",
          detail: text.slice(0, 200),
        },
        { status: 502 },
      );
    }

    return NextResponse.json(normalized);
  } catch (e) {
    console.error("[ai-docent]", e);
    return NextResponse.json(
      {
        error: "Gemini request failed.",
        detail: errorMessage(e),
      },
      { status: 502 },
    );
  }
}
