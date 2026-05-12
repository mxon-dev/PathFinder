"use client";

import { useMemo, useRef, useState } from "react";
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
import { buildComposedMessage } from "./selectionSummary";

const BOT_GREETING =
  "안녕하세요! 오늘 어떤 산책을 즐기고 싶으신가요? 시간이나 장소를 선택하거나, 자유롭게 말씀해 주세요 😊";

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
  const [sentUserMessages, setSentUserMessages] = useState<
    { id: number; text: string }[]
  >([]);
  const messageIdRef = useRef(0);

  const composedMessage = useMemo(
    () => buildComposedMessage(duration, places, composerText),
    [duration, places, composerText],
  );

  const togglePlace = (id: PlaceId) => {
    setPlaces((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  };

  const handleSend = (text: string) => {
    const t = text.trim();
    if (!t) return;
    messageIdRef.current += 1;
    setSentUserMessages((prev) => [
      ...prev,
      { id: messageIdRef.current, text: t },
    ]);
    setDuration(null);
    setPlaces([]);
    setComposerText("");
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-white">
      <PathFinderHeader />
      <PathFinderLocationRow />
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-[#f4f5f7] pb-2 pt-0.5">
        <PathFinderIntroBanner title={introTitle} />
        <PathFinderBotMessage>{BOT_GREETING}</PathFinderBotMessage>
        {sentUserMessages.map((m) => (
          <PathFinderUserMessage key={m.id}>{m.text}</PathFinderUserMessage>
        ))}
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
          />
        </div>
      </div>
    </div>
  );
}
