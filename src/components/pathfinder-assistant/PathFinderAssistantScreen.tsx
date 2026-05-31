"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAssistantChatAPI } from "@/features/assistant-chat/api/useAssistantChatAPI";
import { formatAssistantChatError } from "@/features/assistant-chat/lib/formatAssistantChatError";
import type { AssistantChatLocationContext } from "@/features/assistant-chat/model/types";
import LocationAPI from "@/features/location/api/LocationAPI";
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
import { PathFinderLocationPicker } from "./PathFinderLocationPicker";
import { PathFinderLocationRow } from "./PathFinderLocationRow";
import { PathFinderUserMessage } from "./PathFinderUserMessage";
import { IconTypingSpinner } from "./icons";
import { buildComposedMessage } from "./selectionSummary";

const BOT_GREETING =
  "안녕하세요! 오늘 어떤 산책을 즐기고 싶으신가요? 시간이나 장소를 선택하거나, 자유롭게 말씀해 주세요 😊";

const LOCATION_REQUIRED_MESSAGE =
  "현재 위치 기반으로 코스를 추천하려면 위치 권한이 필요해요. 브라우저에서 위치 권한을 허용하거나, 위치 선택에서 장소를 직접 골라 주세요.";

const COURSE_REQUEST_PATTERN =
  /추천|코스|산책|걷|걸|도보|경로|둘레길|공원|강|호수|산|도심|카페|문화|관광/;

type ChatLine = {
  id: number;
  role: "user" | "assistant";
  text: string;
  includeInRequest?: boolean;
};

function shouldUseLocationContext(
  text: string,
  duration: DurationId | null,
  places: PlaceId[],
) {
  return (
    duration !== null || places.length > 0 || COURSE_REQUEST_PATTERN.test(text)
  );
}

function shouldNavigateToRecommendations(
  duration: DurationId | null,
  places: PlaceId[],
) {
  return duration !== null || places.length > 0;
}

function getBrowserPosition() {
  return new Promise<GeolocationPosition>((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported."));
      return;
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 12000,
      maximumAge: 1000 * 60 * 3,
    });
  });
}

async function getRegionName(lat: number, lng: number) {
  const { data } = await LocationAPI.coordToRegion({ lat, lng });
  const region = data.adminRegion ?? data.legalRegion;
  return region?.address_name;
}

function buildRecommendationHref(params: {
  duration: DurationId | null;
  places: PlaceId[];
  text: string;
  location?: AssistantChatLocationContext;
}) {
  const query = new URLSearchParams();

  query.set("duration", params.duration ?? "30");

  if (params.places.length) {
    query.set("places", params.places.join(","));
  }
  if (params.text) {
    query.set("freeText", params.text);
  }
  if (params.location) {
    query.set("lat", String(params.location.lat));
    query.set("lng", String(params.location.lng));
    query.set(
      "locationName",
      params.location.name ?? params.location.address ?? "현재 위치",
    );
  }

  return `/recommendations?${query.toString()}`;
}

type PathFinderAssistantScreenProps = {
  /** `images/image3.png` 스타일 짧은 타이틀 */
  introTitle?: string;
};

export function PathFinderAssistantScreen({
  introTitle,
}: PathFinderAssistantScreenProps) {
  const router = useRouter();
  const [duration, setDuration] = useState<DurationId | null>(null);
  const [places, setPlaces] = useState<PlaceId[]>([]);
  const [composerText, setComposerText] = useState("");
  const [chatLines, setChatLines] = useState<ChatLine[]>([]);
  const [selectedLocation, setSelectedLocation] =
    useState<AssistantChatLocationContext | null>(null);
  const [isLocationPickerOpen, setIsLocationPickerOpen] = useState(false);
  const [isResolvingLocation, setIsResolvingLocation] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const messageIdRef = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const chatMutation = useAssistantChatAPI();
  const isSubmitting =
    isResolvingLocation || isNavigating || chatMutation.isPending;

  const composedMessage = useMemo(
    () => buildComposedMessage(duration, places, composerText),
    [duration, places, composerText],
  );

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [chatLines, isSubmitting]);

  const togglePlace = (id: PlaceId) => {
    setPlaces((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  };

  const appendAssistantNotice = (text: string) => {
    messageIdRef.current += 1;
    setChatLines((prev) => [
      ...prev,
      {
        id: messageIdRef.current,
        role: "assistant",
        text,
        includeInRequest: false,
      },
    ]);
  };

  const resolveCurrentLocation = async () => {
    const position = await getBrowserPosition();
    const lat = position.coords.latitude;
    const lng = position.coords.longitude;

    let regionName: string | undefined;
    try {
      regionName = await getRegionName(lat, lng);
    } catch {
      regionName = undefined;
    }

    const location: AssistantChatLocationContext = {
      mode: "current",
      name: regionName ?? "현재 위치",
      address: regionName,
      lat,
      lng,
    };

    return location;
  };

  const handleSend = async (text: string) => {
    const t = text.trim();
    if (!t || isSubmitting) return;

    let locationContext: AssistantChatLocationContext | undefined =
      selectedLocation ?? undefined;

    if (!locationContext && shouldUseLocationContext(t, duration, places)) {
      try {
        setIsResolvingLocation(true);
        locationContext = await resolveCurrentLocation();
      } catch {
        appendAssistantNotice(LOCATION_REQUIRED_MESSAGE);
        return;
      } finally {
        setIsResolvingLocation(false);
      }
    }

    messageIdRef.current += 1;
    const userLine: ChatLine = {
      id: messageIdRef.current,
      role: "user",
      text: t,
    };
    const requestThread = [
      ...chatLines.filter((m) => m.includeInRequest !== false),
      userLine,
    ];
    const placesSnapshot = [...places];
    const durationSnapshot = duration;
    const navigateAfterReply = shouldNavigateToRecommendations(
      durationSnapshot,
      placesSnapshot,
    );

    setChatLines((prev) => [...prev, userLine]);
    setDuration(null);
    setPlaces([]);
    setComposerText("");

    try {
      const data = await chatMutation.mutateAsync({
        messages: requestThread.map((m) => ({
          role: m.role,
          content: m.text,
        })),
        ...(locationContext ? { location: locationContext } : {}),
        ...(placesSnapshot.length > 0
          ? { selectionPlaces: placesSnapshot }
          : {}),
        ...(durationSnapshot ? { selectionDuration: durationSnapshot } : {}),
      });

      const replyRaw = typeof data?.reply === "string" ? data.reply.trim() : "";
      const replyText =
        replyRaw ||
        "모델이 빈 응답을 반환했습니다. 잠시 후 다시 시도해 주세요.";

      messageIdRef.current += 1;
      setChatLines((prev) => [
        ...prev,
        {
          id: messageIdRef.current,
          role: "assistant",
          text: replyText,
        },
      ]);

      if (navigateAfterReply) {
        setIsNavigating(true);
        router.push(
          buildRecommendationHref({
            duration: durationSnapshot,
            places: placesSnapshot,
            text: t,
            location: locationContext,
          }),
        );
      }
    } catch (err) {
      messageIdRef.current += 1;
      setChatLines((prev) => [
        ...prev,
        {
          id: messageIdRef.current,
          role: "assistant",
          text: formatAssistantChatError(err),
        },
      ]);
    }
  };

  const locationLabel = selectedLocation
    ? `선택 위치: ${selectedLocation.name ?? selectedLocation.address ?? "장소"}`
    : "현재 위치 기반 추천";
  const locationDetail = selectedLocation?.address
    ? selectedLocation.address
    : isResolvingLocation
      ? "현재 위치 확인 중..."
      : undefined;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-white">
      <PathFinderHeader />
      <PathFinderLocationRow
        label={locationLabel}
        detail={locationDetail}
        isSelected={Boolean(selectedLocation)}
        onSelectLocation={() => setIsLocationPickerOpen(true)}
        disabled={isSubmitting}
      />
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
        {isSubmitting ? (
          <PathFinderBotMessage>
            <span
              className="inline-flex items-center gap-2.5 text-neutral-500"
              role="status"
              aria-live="polite"
            >
              <IconTypingSpinner className="h-4 w-4 shrink-0 text-blue-500" />
              {isResolvingLocation
                ? "현재 위치 확인 중..."
                : chatMutation.isPending
                  ? "답변을 준비하는 중…"
                  : "추천 코스로 이동 중…"}
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
            isSending={isSubmitting}
          />
        </div>
      </div>
      <PathFinderLocationPicker
        isOpen={isLocationPickerOpen}
        selectedLocation={selectedLocation}
        onSelect={(location) => setSelectedLocation(location)}
        onUseCurrent={() => setSelectedLocation(null)}
        onClose={() => setIsLocationPickerOpen(false)}
      />
    </div>
  );
}
