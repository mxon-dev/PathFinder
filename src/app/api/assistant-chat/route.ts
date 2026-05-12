import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Content } from "@google/generative-ai";
import { NextResponse } from "next/server";
import type {
  AssistantChatMessageDTO,
  AssistantChatResponse,
} from "@/features/assistant-chat/model/types";

export const runtime = "nodejs";

const MAX_MESSAGES = 32;
const MAX_CONTENT = 6000;

const SYSTEM_INSTRUCTION = [
  "You are PathFinder (패스파인더), a concise Korean-language assistant for urban walking (산책) and light hiking.",
  "Help users choose duration, place types (river, park, mountain, downtown, lake), mood, and safety tips.",
  "Do not invent precise map coordinates or guarantee specific routes; suggest realistic next steps (e.g. check local parks, use map apps).",
  "Keep replies friendly and practical. Prefer under ~500 Korean characters unless the user asks for more detail.",
  "If the user writes in Korean, reply in Korean.",
].join(" ");

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
        error: "Invalid request: expected messages[] alternating user/assistant, ending with user.",
      },
      { status: 400 },
    );
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const primaryModel = modelName;
  const fallbackModel = (
    process.env.GEMINI_ASSISTANT_FALLBACK_MODEL ?? "gemini-2.0-flash"
  ).trim();

  const contents: Content[] = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const maxAttemptsPerModel = 3;
  const modelsToTry =
    fallbackModel && fallbackModel !== primaryModel
      ? [primaryModel, fallbackModel]
      : [primaryModel];

  let lastErr: unknown;

  for (const activeModel of modelsToTry) {
    const model = genAI.getGenerativeModel({
      model: activeModel,
      systemInstruction: SYSTEM_INSTRUCTION,
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
