type KakaoSdk = typeof window.kakao;

let kakaoMapLoadingPromise: Promise<KakaoSdk> | null = null;
const KAKAO_MAP_SCRIPT_SELECTOR = 'script[data-kakao-map-sdk="true"]';
const KAKAO_MAP_LOAD_TIMEOUT_MS = 12_000;

function buildKakaoDomainMismatchMessage(origin: string): string {
  return `카카오 지도 JavaScript 키에 "${origin}"을 Web 플랫폼 사이트 도메인으로 등록해 주세요.`;
}

function isKakaoDomainMismatchPayload(text: string): boolean {
  return (
    text.includes("domain mismatched") ||
    text.includes("AccessDeniedError")
  );
}

declare global {
  interface Window {
    kakao: any;
  }
}

export function loadKakaoMapSdk(): Promise<KakaoSdk> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Kakao Map SDK must be loaded in browser."));
  }

  if (window.kakao?.maps?.Map) {
    return Promise.resolve(window.kakao);
  }

  if (kakaoMapLoadingPromise) {
    return kakaoMapLoadingPromise;
  }

  const appKey = process.env.NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY;

  if (!appKey) {
    return Promise.reject(
      new Error("NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY is not defined."),
    );
  }

  kakaoMapLoadingPromise = new Promise((resolve, reject) => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const clearLoadTimeout = () => {
      if (!timeoutId) return;
      clearTimeout(timeoutId);
      timeoutId = null;
    };

    const rejectWithDomainHint = (detail?: string) => {
      clearLoadTimeout();
      kakaoMapLoadingPromise = null;
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
      const hint = origin
        ? buildKakaoDomainMismatchMessage(origin)
        : "Kakao Developers > 앱 > 플랫폼 > Web 사이트 도메인을 확인해 주세요.";
      reject(new Error(detail ? `${hint} (${detail})` : hint));
    };

    const resolveLoadedSdk = () => {
      clearLoadTimeout();

      if (!window.kakao?.maps?.load) {
        rejectWithDomainHint();
        return;
      }

      window.kakao.maps.load(() => {
        if (window.kakao?.maps?.Map) {
          resolve(window.kakao);
          return;
        }

        kakaoMapLoadingPromise = null;
        reject(new Error("Kakao Map SDK loaded without maps.Map."));
      });
    };

    const existingScript = document.querySelector<HTMLScriptElement>(
      KAKAO_MAP_SCRIPT_SELECTOR,
    );

    if (existingScript) {
      if (window.kakao?.maps?.load) {
        resolveLoadedSdk();
        return;
      }

      if (existingScript.dataset.kakaoMapSdkStatus === "loading") {
        existingScript.addEventListener("load", resolveLoadedSdk, { once: true });
        existingScript.addEventListener("error", () => rejectWithDomainHint(), {
          once: true,
        });
        timeoutId = setTimeout(rejectWithDomainHint, KAKAO_MAP_LOAD_TIMEOUT_MS);
        return;
      }

      existingScript.remove();
    }

    const script = document.createElement("script");
    script.dataset.kakaoMapSdk = "true";
    script.dataset.kakaoMapSdkStatus = "loading";
    script.async = true;
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${appKey}&autoload=false`;

    timeoutId = setTimeout(rejectWithDomainHint, KAKAO_MAP_LOAD_TIMEOUT_MS);

    script.onload = async () => {
      script.dataset.kakaoMapSdkStatus = "loaded";

      if (!window.kakao?.maps?.load) {
        try {
          const probe = await fetch(script.src);
          const body = await probe.text();
          if (isKakaoDomainMismatchPayload(body)) {
            rejectWithDomainHint("domain mismatched");
            return;
          }
        } catch {
          // ignore probe errors
        }
        rejectWithDomainHint();
        return;
      }

      resolveLoadedSdk();
    };

    script.onerror = () => {
      script.dataset.kakaoMapSdkStatus = "failed";
      rejectWithDomainHint("script error");
    };

    document.head.appendChild(script);
  });

  return kakaoMapLoadingPromise;
}
