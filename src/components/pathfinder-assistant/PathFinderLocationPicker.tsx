"use client";

import { type FormEvent, useEffect, useState } from "react";
import type { AssistantChatLocationContext } from "@/features/assistant-chat/model/types";
import { useLocationSearchAPI } from "@/features/location/api/useLocationSearchAPI";
import type { NormalizedKakaoPlace } from "@/lib/kakao/kakao-types";
import { IconClose, IconLocationPin, IconSearch, IconTypingSpinner } from "./icons";

type PathFinderLocationPickerProps = {
  isOpen: boolean;
  selectedLocation: AssistantChatLocationContext | null;
  onSelect: (location: AssistantChatLocationContext) => void;
  onUseCurrent: () => void;
  onClose: () => void;
};

function placeAddress(place: NormalizedKakaoPlace) {
  return place.roadAddressName || place.addressName;
}

export function PathFinderLocationPicker({
  isOpen,
  selectedLocation,
  onSelect,
  onUseCurrent,
  onClose,
}: PathFinderLocationPickerProps) {
  const [query, setQuery] = useState("");
  const [places, setPlaces] = useState<NormalizedKakaoPlace[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const {
    isPending: isSearching,
    mutateAsync: searchKeyword,
    reset: resetSearch,
  } = useLocationSearchAPI();

  useEffect(() => {
    if (isOpen) return;
    setQuery("");
    setPlaces([]);
    setHasSearched(false);
    setErrorMessage("");
    resetSearch();
  }, [isOpen, resetSearch]);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const searchPlaces = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();

    const keyword = query.trim();
    if (!keyword || isSearching) return;

    setErrorMessage("");
    setHasSearched(true);

    try {
      const data = await searchKeyword({ query: keyword });
      setPlaces(
        data.places.filter(
          (place) => Number.isFinite(place.lat) && Number.isFinite(place.lng),
        ),
      );
    } catch {
      setPlaces([]);
      setErrorMessage("장소 검색에 실패했어요. 잠시 후 다시 시도해 주세요.");
    }
  };

  const handleSelect = (place: NormalizedKakaoPlace) => {
    onSelect({
      mode: "selected",
      name: place.name,
      address: placeAddress(place),
      lat: place.lat,
      lng: place.lng,
      placeUrl: place.placeUrl,
    });
    onClose();
  };

  const handleUseCurrent = () => {
    onUseCurrent();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 px-0 sm:items-center sm:px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pathfinder-location-title"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="위치 선택 닫기"
        onClick={onClose}
      />
      <div className="relative w-full rounded-t-2xl bg-white shadow-2xl sm:max-w-md sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
          <div>
            <h2
              id="pathfinder-location-title"
              className="text-base font-semibold text-neutral-900"
            >
              위치 선택
            </h2>
            {selectedLocation ? (
              <p className="mt-0.5 max-w-[17rem] truncate text-xs text-neutral-500">
                현재 선택: {selectedLocation.name ?? selectedLocation.address}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900"
            aria-label="닫기"
          >
            <IconClose />
          </button>
        </div>

        <div className="px-4 py-3">
          <button
            type="button"
            onClick={handleUseCurrent}
            className="mb-3 flex w-full items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2.5 text-left text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
          >
            <IconLocationPin className="shrink-0" />
            현재 위치 기반 추천
          </button>

          <form onSubmit={searchPlaces} className="flex gap-2">
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="장소명을 입력하세요"
              className="min-h-11 min-w-0 flex-1 rounded-xl border border-neutral-200 bg-white px-3.5 text-sm text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              autoFocus
            />
            <button
              type="submit"
              disabled={!query.trim() || isSearching}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-neutral-900 text-white transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="장소 검색"
            >
              {isSearching ? (
                <IconTypingSpinner className="h-4 w-4" />
              ) : (
                <IconSearch />
              )}
            </button>
          </form>

          <div className="mt-3 max-h-[46vh] overflow-y-auto">
            {errorMessage ? (
              <p className="rounded-xl bg-red-50 px-3 py-3 text-sm text-red-700">
                {errorMessage}
              </p>
            ) : null}

            {!errorMessage &&
            hasSearched &&
            !isSearching &&
            places.length === 0 ? (
              <p className="rounded-xl bg-neutral-50 px-3 py-3 text-sm text-neutral-500">
                검색 결과가 없습니다.
              </p>
            ) : null}

            {places.length > 0 ? (
              <ul className="divide-y divide-neutral-100 overflow-hidden rounded-xl border border-neutral-100">
                {places.map((place) => (
                  <li key={place.id}>
                    <button
                      type="button"
                      onClick={() => handleSelect(place)}
                      className="flex w-full items-start gap-2.5 px-3 py-3 text-left transition hover:bg-neutral-50"
                    >
                      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-600">
                        <IconLocationPin className="h-4 w-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-neutral-900">
                          {place.name}
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-neutral-500">
                          {placeAddress(place) || place.categoryName}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
