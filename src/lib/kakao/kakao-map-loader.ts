type KakaoSdk = typeof window.kakao;

let kakaoMapLoadingPromise: Promise<KakaoSdk> | null = null;
const KAKAO_MAP_SCRIPT_SELECTOR = 'script[data-kakao-map-sdk="true"]';
const KAKAO_MAP_LOAD_TIMEOUT_MS = 8000;

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

    const rejectWithDomainHint = () => {
      clearLoadTimeout();
      kakaoMapLoadingPromise = null;
      reject(
        new Error(
          "Kakao Map SDK could not be loaded. Register this page origin as a Web platform domain in Kakao Developers.",
        ),
      );
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
        existingScript.addEventListener("error", rejectWithDomainHint, {
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
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${appKey}&libraries=services&autoload=false`;

    timeoutId = setTimeout(rejectWithDomainHint, KAKAO_MAP_LOAD_TIMEOUT_MS);

    script.onload = () => {
      script.dataset.kakaoMapSdkStatus = "loaded";
      resolveLoadedSdk();
    };

    script.onerror = () => {
      script.dataset.kakaoMapSdkStatus = "failed";
      rejectWithDomainHint();
    };

    document.head.appendChild(script);
  });

  return kakaoMapLoadingPromise;
}
