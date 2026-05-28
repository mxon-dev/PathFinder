import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Content } from "@google/generative-ai";
import { NextResponse } from "next/server";
import type {
  AssistantChatLocationContext,
  AssistantChatMessageDTO,
  AssistantChatResponse,
  AssistantDurationSelection,
  AssistantPlaceSelection,
} from "@/features/assistant-chat/model/types";
import { buildPublicDataAugmentationBlock } from "@/lib/public-data/build-public-data-augmentation";
import { buildWalkCoursesAugmentationBlock } from "@/lib/walk-courses/build-walk-courses-augmentation";

export const runtime = "nodejs";

const MAX_MESSAGES = 32;
const MAX_CONTENT = 6000;

const SYSTEM_INSTRUCTION = [
  "You are PathFinder (패스파인더), a concise Korean-language assistant for urban walking (산책) and light hiking.",
  "Help users choose duration, place types (river, park, mountain, downtown, lake), mood, and safety tips.",
  "Do not invent precise map coordinates or guarantee specific routes.",
  "Keep replies friendly and practical. Prefer under ~500 Korean characters unless the user asks for more detail.",
  "Reply in Korean.",
].join(" ");

const AUGMENTED_INSTRUCTION = [
  "아래 [산책 코스 데이터] 또는 [공공데이터 참고 텍스트] 블록이 함께 주어집니다.",
  "사용자의 산책 요청에 답할 때는 반드시 그 목록에 있는 항목(이름·주소·거리 등)을 2~4개 골라 근거로 인용하세요.",
  "목록에 없는 새 장소를 지어내지 마세요. 거리·위치는 목록의 값만 사용하고, 추정·과장을 피하세요.",
  "‘지도 앱에서 검색해 보세요’ 같은 일반 안내로 끝내지 말고, 목록 항목 이름을 명시적으로 제시하세요.",
  "응답 형식: ① 한 줄 추천 요약 → ② 후보 2~4개를 짧은 불릿으로 → ③ 마지막에 ‘실제 시설·운영시간은 직접 확인’ 한 줄.",
  "목록이 비어 있거나 안내문만 있으면, 데이터 부족을 짧게 알리고 사용자에게 위치·취향을 더 묻는 질문 한 줄로 마무리하세요.",
].join("\n");

function errorMessage(err: unknown): string | undefined {
  if (err instanceof Error && err.message.trim()) {
    return err.message.trim().slice(0, 600);
  }
  return undefined;
}

function parseMessages(body: unknown): AssistantChatMessageDTO[] | null {
  if (!body || typeof body !== "object") return null;
  const raw = (body as Record<string, unknown>).messages;
  if (!Array.isArray(raw) || raw.length === 0) return null;
  if (raw.length > MAX_MESSAGES) return null;
  if (raw.length % 2 === 0) return null;

  const out: AssistantChatMessageDTO[] = [];
  for (let i = 0; i < raw.length; i++) {
    const m = raw[i];
    if (!m || typeof m !== "object") return null;
    const rec = m as Record<string, unknown>;
    const role = rec.role;
    const content = rec.content;
    if (role !== "user" && role !== "assistant") return null;
    const expected = i % 2 === 0 ? "user" : "assistant";
    if (role !== expected) return null;
    if (typeof content !== "string" || !content.trim()) return null;
    const trimmed = content.trim().slice(0, MAX_CONTENT);
    out.push({ role, content: trimmed });
  }
  return out;
}

function parseLocation(
  body: unknown,
): AssistantChatLocationContext | undefined | null {
  if (!body || typeof body !== "object") return undefined;
  const raw = (body as Record<string, unknown>).location;
  if (raw === undefined) return undefined;
  if (!raw || typeof raw !== "object") return null;

  const rec = raw as Record<string, unknown>;
  const mode = rec.mode;
  const lat = rec.lat;
  const lng = rec.lng;

  if (mode !== "current" && mode !== "selected") return null;
  if (typeof lat !== "number" || typeof lng !== "number") return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const location: AssistantChatLocationContext = {
    mode,
    lat,
    lng,
  };

  if (typeof rec.name === "string" && rec.name.trim()) {
    location.name = rec.name.trim().slice(0, 120);
  }
  if (typeof rec.address === "string" && rec.address.trim()) {
    location.address = rec.address.trim().slice(0, 200);
  }
  if (typeof rec.placeUrl === "string" && rec.placeUrl.trim()) {
    location.placeUrl = rec.placeUrl.trim().slice(0, 300);
  }

  return location;
}

const ALLOWED_PLACE_IDS = new Set<string>([
  "river",
  "park",
  "mountain",
  "urban",
  "lake",
]);

const ALLOWED_DURATION_IDS = new Set<string>(["15", "30", "45", "60", "90"]);

function parseSelectionPlaces(
  body: unknown,
): AssistantPlaceSelection[] | undefined {
  if (!body || typeof body !== "object") return undefined;
  const raw = (body as Record<string, unknown>).selectionPlaces;
  if (!Array.isArray(raw)) return undefined;
  const out = raw.filter(
    (x): x is AssistantPlaceSelection =>
      typeof x === "string" && ALLOWED_PLACE_IDS.has(x),
  );
  return out.length ? Array.from(new Set(out)) : undefined;
}

function parseSelectionDuration(
  body: unknown,
): AssistantDurationSelection | undefined {
  if (!body || typeof body !== "object") return undefined;
  const raw = (body as Record<string, unknown>).selectionDuration;
  if (typeof raw !== "string") return undefined;
  return ALLOWED_DURATION_IDS.has(raw)
    ? (raw as AssistantDurationSelection)
    : undefined;
}

function buildLocationPrompt(location?: AssistantChatLocationContext) {
  if (!location) return "";
  const label =
    location.name ??
    location.address ??
    (location.mode === "current" ? "사용자의 현재 위치" : "사용자가 선택한 위치");
  const address = location.address ? `주소: ${location.address}` : "";
  const source =
    location.mode === "current"
      ? "브라우저 현재 위치 기반"
      : "사용자가 카카오 장소 검색으로 선택한 위치";

  return [
    "[위치 컨텍스트]",
    `추천 기준: ${label}`,
    `출처: ${source}`,
    address,
    `좌표: lat=${location.lat}, lng=${location.lng}`,
    "이 위치를 산책 코스 추천의 기준점으로 삼되, 정확한 경로 좌표를 임의로 만들지 마세요.",
  ]
    .filter(Boolean)
    .join("\n");
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
          "Set GEMINI_API_KEY or GOOGLE_API_KEY in .env.local, then restart the dev server.",
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

  const messages = parseMessages(json);
  if (!messages) {
    return NextResponse.json(
      {
        error:
          "Invalid request: expected messages[] alternating user/assistant, ending with user.",
      },
      { status: 400 },
    );
  }

  const location = parseLocation(json);
  if (location === null) {
    return NextResponse.json(
      { error: "Invalid request: location must include mode, lat, and lng." },
      { status: 400 },
    );
  }

  const lastUserText =
    messages[messages.length - 1]?.role === "user"
      ? messages[messages.length - 1].content
      : "";
  const selectionPlaces = parseSelectionPlaces(json);
  const selectionDuration = parseSelectionDuration(json);

  const referencePoint = location
    ? {
        lat: location.lat,
        lng: location.lng,
        label: location.name ?? location.address ?? "사용자 위치",
      }
    : undefined;

  const [walkCoursesAugmentation, publicAugmentation] = await Promise.all([
    buildWalkCoursesAugmentationBlock({
      selectionPlaces,
      selectionDuration,
      referencePoint,
    }),
    process.env.PUBLIC_DATA_SERVICE_KEY?.trim()
      ? buildPublicDataAugmentationBlock(lastUserText, selectionPlaces)
      : Promise.resolve(""),
  ]);

  const augmentationParts = [
    walkCoursesAugmentation,
    publicAugmentation,
  ].filter((p) => p && p.trim().length > 0);
  const combinedAugmentation = augmentationParts.join("\n\n");

  if (process.env.NODE_ENV !== "production") {
    console.log(
      "[assistant-chat] selectionPlaces=%o duration=%s location=%o augLen=%d",
      selectionPlaces,
      selectionDuration ?? "(none)",
      location ? { lat: location.lat, lng: location.lng } : "(none)",
      combinedAugmentation.length,
    );
  }

  const effectiveSystemInstruction = combinedAugmentation
    ? `${SYSTEM_INSTRUCTION}\n\n${AUGMENTED_INSTRUCTION}\n\n---\n${combinedAugmentation}`
    : SYSTEM_INSTRUCTION;

  const genAI = new GoogleGenerativeAI(apiKey);
  const primaryModel = modelName;
  const fallbackModel = (
    process.env.GEMINI_ASSISTANT_FALLBACK_MODEL ?? "gemini-2.0-flash"
  ).trim();

  const contents: Content[] = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const locationPrompt = buildLocationPrompt(location);
  if (locationPrompt) {
    const userText = messages[messages.length - 1].content;
    contents[contents.length - 1] = {
      role: "user",
      parts: [{ text: `${locationPrompt}\n\n[사용자 요청]\n${userText}` }],
    };
  }

  const maxAttemptsPerModel = 3;
  const modelsToTry =
    fallbackModel && fallbackModel !== primaryModel
      ? [primaryModel, fallbackModel]
      : [primaryModel];

  let lastErr: unknown;

  for (const activeModel of modelsToTry) {
    const model = genAI.getGenerativeModel({
      model: activeModel,
      systemInstruction: effectiveSystemInstruction,
    });

    for (let attempt = 1; attempt <= maxAttemptsPerModel; attempt++) {
      try {
        const result = await model.generateContent({ contents });
        const response = result.response;

        let text: string;
        try {
          text = response.text().trim();
        } catch (textErr) {
          console.error("[assistant-chat] response.text()", textErr);
          return NextResponse.json(
            {
              error: "Model response could not be read.",
              detail: errorMessage(textErr),
            },
            { status: 502 },
          );
        }

        if (!text) {
          lastErr = new Error("Empty model response.");
          break;
        }

        return NextResponse.json({ reply: text } satisfies AssistantChatResponse);
      } catch (e) {
        lastErr = e;
        const detail = errorMessage(e) ?? "";
        const retryable =
          attempt < maxAttemptsPerModel &&
          (detail.includes("503") ||
            detail.includes("429") ||
            detail.toLowerCase().includes("unavailable") ||
            detail.toLowerCase().includes("resource exhausted") ||
            detail.toLowerCase().includes("high demand"));
        if (retryable) {
          const delayMs = 700 * 2 ** (attempt - 1);
          await new Promise((r) => setTimeout(r, delayMs));
          continue;
        }
        console.error(`[assistant-chat] model=${activeModel}`, e);
        break;
      }
    }
  }

  console.error("[assistant-chat] all models and retries exhausted", lastErr);
  return NextResponse.json(
    {
      error: "Gemini request failed.",
      detail: errorMessage(lastErr),
    },
    { status: 502 },
  );
}
