"use client";

import { useEffect, useRef, useState } from "react";
import { loadKakaoMapSdk } from "@/lib/kakao/kakao-map-loader";
import type { LatLng } from "@/lib/kakao/kakao-types";

export type KakaoMapMarker = {
  id: string;
  position: LatLng;
  title: string;
  tone?: "default" | "start" | "end";
};

type KakaoMapProps = {
  center: LatLng;
  level?: number;
  markers?: KakaoMapMarker[];
  path?: LatLng[];
  className?: string;
  interactive?: boolean;
  pathStrokeColor?: string;
  pathStrokeWeight?: number;
};

function createMarkerContent(marker: KakaoMapMarker, interactive: boolean) {
  const outer = document.createElement("div");
  const tone = marker.tone ?? "default";
  const fillColor =
    tone === "start" ? "#f87171" : tone === "end" ? "#0ea5e9" : "#2563eb";

  outer.title = marker.title;
  outer.style.width = "20px";
  outer.style.height = "20px";
  outer.style.borderRadius = "9999px";
  outer.style.background = fillColor;
  outer.style.border = "4px solid #fff";
  outer.style.boxShadow = "0 4px 10px rgba(15, 23, 42, 0.25)";
  outer.style.boxSizing = "border-box";
  outer.style.pointerEvents = interactive ? "auto" : "none";

  return outer;
}

export function KakaoMap({
  center,
  level = 5,
  markers = [],
  path = [],
  className,
  interactive = false,
  pathStrokeColor = "#0ea5e9",
  pathStrokeWeight = 5,
}: KakaoMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "failed">(
    "loading",
  );
  const [errorMessage, setErrorMessage] = useState("");
  const hasPositionClass = /\b(?:absolute|fixed|relative|sticky)\b/.test(
    className ?? "",
  );

  useEffect(() => {
    let map: any;
    let polyline: any | null = null;
    let renderedMarkers: any[] = [];
    let frameId: number | null = null;
    let secondFrameId: number | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let cancelled = false;

    async function renderMap() {
      if (!containerRef.current) return;

      setStatus("loading");
      setErrorMessage("");

      try {
        const kakao = await loadKakaoMapSdk();
        if (cancelled || !containerRef.current) return;

        const mapCenter = new kakao.maps.LatLng(center.lat, center.lng);
        map = new kakao.maps.Map(containerRef.current, {
          center: mapCenter,
          level,
        });
        map.setDraggable(interactive);
        map.setZoomable(interactive);

        const bounds = new kakao.maps.LatLngBounds();
        let boundsPointCount = 0;
        const routePath = path.map((point) => {
          const latLng = new kakao.maps.LatLng(point.lat, point.lng);
          bounds.extend(latLng);
          boundsPointCount += 1;
          return latLng;
        });

        renderedMarkers = markers.map((marker) => {
          const position = new kakao.maps.LatLng(
            marker.position.lat,
            marker.position.lng,
          );
          bounds.extend(position);
          boundsPointCount += 1;

          return new kakao.maps.CustomOverlay({
            map,
            position,
            content: createMarkerContent(marker, interactive),
            xAnchor: 0.5,
            yAnchor: 0.5,
          });
        });

        if (routePath.length >= 2) {
          polyline = new kakao.maps.Polyline({
            map,
            path: routePath,
            strokeWeight: pathStrokeWeight,
            strokeColor: pathStrokeColor,
            strokeOpacity: 0.95,
            strokeStyle: "solid",
          });
        }

        const fitMapToContent = () => {
          if (!map) return;
          map.relayout();
          if (boundsPointCount >= 2) {
            map.setBounds(bounds);
            return;
          }

          map.setCenter(mapCenter);
        };

        fitMapToContent();
        frameId = window.requestAnimationFrame(fitMapToContent);
        secondFrameId = window.requestAnimationFrame(() => {
          window.setTimeout(fitMapToContent, 120);
        });

        if (typeof ResizeObserver !== "undefined" && containerRef.current) {
          resizeObserver = new ResizeObserver(fitMapToContent);
          resizeObserver.observe(containerRef.current);
        }

        setStatus("ready");
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : "");
          setStatus("failed");
        }
      }
    }

    renderMap();

    return () => {
      cancelled = true;
      if (frameId !== null) window.cancelAnimationFrame(frameId);
      if (secondFrameId !== null) window.cancelAnimationFrame(secondFrameId);
      resizeObserver?.disconnect();
      renderedMarkers.forEach((marker) => marker.setMap(null));
      if (polyline) polyline.setMap(null);
      if (map) map = null;
    };
  }, [
    center.lat,
    center.lng,
    interactive,
    level,
    markers,
    path,
    pathStrokeColor,
    pathStrokeWeight,
  ]);

  return (
    <div
      className={`${hasPositionClass ? "" : "relative"} overflow-hidden bg-slate-100 ${className ?? ""}`}
    >
      <div ref={containerRef} className="h-full w-full" />
      {status === "loading" ? (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100 text-xs font-medium text-slate-500">
          지도 불러오는 중
        </div>
      ) : null}
      {status === "failed" ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-slate-100 px-4 text-center text-xs font-medium text-slate-500">
          <span>지도를 불러오지 못했어요.</span>
          {errorMessage ? (
            <span className="text-[11px] leading-4 text-slate-400">
              Kakao Developers의 Web 플랫폼 도메인을 확인해 주세요.
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
