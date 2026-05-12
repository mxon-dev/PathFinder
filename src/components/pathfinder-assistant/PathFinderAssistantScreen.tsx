"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAssistantChatAPI } from "@/features/assistant-chat/api/useAssistantChatAPI";
import { formatAssistantChatError } from "@/features/assistant-chat/lib/formatAssistantChatError";
import {
  type DurationId,
  PathFinderDurationChips,
} from "./PathFinderDurationChips";
import {
  type PlaceId,
  PathFinderPlaceTypeChips,
} from "./PathFinderPlaceTypeChips";
import { PathFinderBotMessage } from "./PathFinderBotMessage";
import { PathFinderComposer } from "./PathFinderComposer";
import { PathFinderHeader } from "./PathFinderHeader";
import { PathFinderIntroBanner } from "./PathFinderIntroBanner";
import { PathFinderLocationRow } from "./PathFinderLocationRow";
import { PathFinderUserMessage } from "./PathFinderUserMessage";
import { IconTypingSpinner } from "./icons";
import { buildComposedMessage } from "./selectionSummary";

const BOT_GREETING =
  "안녕하세요! 오늘 어떤 산책을 즐기고 싶으신가요? 시간이나 장소를 선택하거나, 자유롭게 말씀해 주세요 😊";

type ChatLine = {
  id: number;
  role: "user" | "assistant";
  text: string;
};

type PathFinderAssistantScreenProps = {
  /** `images/image3.png` 스타일 짧은 타이틀 */
  introTitle?: string;
};

export function PathFinderAssistantScreen({
  introTitle,
}: PathFinderAssistantScreenProps) {
  const [duration, setDuration] = useState<DurationId | null>(null);
  const [places, setPlaces] = useState<PlaceId[]>([]);
  const [composerText, setComposerText] = useState("");
  const [chatLines, setChatLines] = useState<ChatLine[]>([]);
  const messageIdRef = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const chatMutation = useAssistantChatAPI();

  const composedMessage = useMemo(
    () => buildComposedMessage(duration, places, composerText),
    [duration, places, composerText],
  );

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [chatLines, chatMutation.isPending]);

  const togglePlace = (id: PlaceId) => {
    setPlaces((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  };

  const handleSend = async (text: string) => {
    const t = text.trim();
    if (!t || chatMutation.isPending) return;

    messageIdRef.current += 1;
    const userLine: ChatLine = {
      id: messageIdRef.current,
      role: "user",
      text: t,
    };
    const thread = [...chatLines, userLine];
    setChatLines(thread);
    setDuration(null);
    setPlaces([]);
    setComposerText("");

    try {
      const data = await chatMutation.mutateAsync({
        messages: thread.map((m) => ({ role: m.role, content: m.text })),
      });
      const replyRaw = typeof data?.reply === "string" ? data.reply.trim() : "";
      const replyText =
        replyRaw ||
        "모델이 빈 응답을 반환했습니다. 잠시 후 다시 시도해 주세요.";

      messageIdRef.current += 1;
      const assistantLine: ChatLine = {
        id: messageIdRef.current,
        role: "assistant",
        text: replyText,
      };
      setChatLines([...thread, assistantLine]);
    } catch (err) {
      messageIdRef.current += 1;
      const assistantLine: ChatLine = {
        id: messageIdRef.current,
        role: "assistant",
        text: formatAssistantChatError(err),
      };
      setChatLines([...thread, assistantLine]);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-white">
      <PathFinderHeader />
      <PathFinderLocationRow />
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-[#f4f5f7] pb-2 pt-0.5"
      >
        <PathFinderIntroBanner title={introTitle} />
        <PathFinderBotMessage>{BOT_GREETING}</PathFinderBotMessage>
        {chatLines.map((m) =>
          m.role === "user" ? (
            <PathFinderUserMessage key={`u-${m.id}`}>{m.text}</PathFinderUserMessage>
          ) : (
            <PathFinderBotMessage key={`a-${m.id}`}>{m.text}</PathFinderBotMessage>
          ),
        )}
        {chatMutation.isPending ? (
          <PathFinderBotMessage>
            <span
              className="inline-flex items-center gap-2.5 text-neutral-500"
              role="status"
              aria-live="polite"
            >
              <IconTypingSpinner className="h-4 w-4 shrink-0 text-blue-500" />
              답변을 준비하는 중…
            </span>
          </PathFinderBotMessage>
        ) : null}
      </div>
      <div className="z-10 shrink-0 border-t border-neutral-200/90 bg-white">
        <div className="max-h-[min(34vh,220px)] overflow-y-auto px-3 pb-3 pt-3">
          <PathFinderDurationChips value={duration} onChange={setDuration} />
          <div className="mt-4">
            <PathFinderPlaceTypeChips value={places} onToggle={togglePlace} />
          </div>
        </div>
        <div className="border-t border-neutral-200 bg-white">
          <PathFinderComposer
            value={composerText}
            onChange={setComposerText}
            composedMessage={composedMessage}
            durationId={duration}
            placeIds={places}
            onClearDuration={() => setDuration(null)}
            onRemovePlace={(id) =>
              setPlaces((prev) => prev.filter((p) => p !== id))
            }
            onSend={handleSend}
            isSending={chatMutation.isPending}
          />
        </div>
      </div>
    </div>
  );
}
