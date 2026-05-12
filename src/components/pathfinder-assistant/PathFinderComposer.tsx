"use client";

import { IconChipDismiss, IconClock, IconSend } from "./icons";
import { DURATION_OPTIONS, type DurationId } from "./PathFinderDurationChips";
import { PLACE_OPTIONS, type PlaceId } from "./PathFinderPlaceTypeChips";

type PathFinderComposerProps = {
  value: string;
  onChange: (value: string) => void;
  /** 선택 + 입력을 합친 전송 문장 (trim 후 비어 있으면 전송 불가) */
  composedMessage: string;
  durationId: DurationId | null;
  placeIds: PlaceId[];
  onClearDuration: () => void;
  onRemovePlace: (id: PlaceId) => void;
  onSend?: (text: string) => void | Promise<void>;
  /** Gemini 응답 대기 중 입력·전송 비활성화 */
  isSending?: boolean;
  placeholder?: string;
};

export function PathFinderComposer({
  value,
  onChange,
  composedMessage,
  durationId,
  placeIds,
  onClearDuration,
  onRemovePlace,
  onSend,
  isSending = false,
  placeholder = "원하는 코스를 자유롭게 입력하세요",
}: PathFinderComposerProps) {
  const canSend = composedMessage.trim().length > 0 && !isSending;
  const hasEmbedded = durationId !== null || placeIds.length > 0;

  const submit = () => {
    const t = composedMessage.trim();
    if (!t || isSending) return;
    void onSend?.(t);
  };

  return (
    <div className="px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2">
      <div className="rounded-2xl bg-white p-2">
        {hasEmbedded ? (
          <div className="flex flex-wrap gap-2">
            {durationId ? (
              <div
                key="duration"
                className="relative inline-flex min-h-[2.75rem] min-w-[4.5rem] items-center gap-1.5 rounded-xl bg-neutral-200/95 pl-2.5 pr-8 pt-1.5 pb-1.5 text-sm font-medium text-neutral-800"
              >
                <button
                  type="button"
                  onClick={onClearDuration}
                  disabled={isSending}
                  className="absolute right-0.5 top-0.5 flex h-6 w-6 items-center justify-center rounded-full text-neutral-600 transition hover:bg-neutral-300/90 hover:text-neutral-900 disabled:pointer-events-none disabled:opacity-40"
                  aria-label="소요 시간 선택 해제"
                >
                  <IconChipDismiss />
                </button>
                <IconClock className="shrink-0 text-neutral-500" />
                {DURATION_OPTIONS.find((o) => o.id === durationId)?.label}
              </div>
            ) : null}
            {placeIds.map((pid) => {
              const p = PLACE_OPTIONS.find((o) => o.id === pid);
              if (!p) return null;
              return (
                <div
                  key={pid}
                  className="relative inline-flex min-h-[2.75rem] items-center gap-1 rounded-xl bg-neutral-200/95 pl-2.5 pr-8 pt-1.5 pb-1.5 text-sm font-medium text-neutral-800"
                >
                  <button
                    type="button"
                    onClick={() => onRemovePlace(pid)}
                    disabled={isSending}
                    className="absolute right-0.5 top-0.5 flex h-6 w-6 items-center justify-center rounded-full text-neutral-600 transition hover:bg-neutral-300/90 hover:text-neutral-900 disabled:pointer-events-none disabled:opacity-40"
                    aria-label={`${p.label} 선택 해제`}
                  >
                    <IconChipDismiss />
                  </button>
                  <span aria-hidden>{p.emoji}</span>
                  {p.label}
                </div>
              );
            })}
          </div>
        ) : null}
        <div
          className={
            hasEmbedded
              ? "mt-1 flex items-center gap-2 border-t border-neutral-200/90 pt-2"
              : "flex items-center gap-2"
          }
        >
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.nativeEvent.isComposing) submit();
            }}
            disabled={isSending}
            placeholder={placeholder}
            className="min-h-11 min-w-0 flex-1 rounded-xl border border-neutral-200 bg-white px-3.5 text-sm text-neutral-900 shadow-sm outline-none placeholder:text-neutral-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-neutral-50 disabled:text-neutral-500"
            aria-label={placeholder}
          />
          <button
            type="button"
            onClick={submit}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-500 text-white shadow-sm transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
            disabled={!canSend}
            aria-label="보내기"
          >
            <IconSend className="ml-0.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
