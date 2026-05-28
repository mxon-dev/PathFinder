const PUBLIC_DATA_ERROR_HINTS: Record<string, string> = {
  "30":
    "이 openapi에 등록되지 않은 키입니다. data.go.kr에서 '전국길관광정보표준데이터' openapi 활용신청·승인 여부와 활용기간 시작일을 확인하세요. 승인 직후에는 최대 1시간 동기화 지연이 있을 수 있습니다.",
  "31": "활용기간이 만료된 인증키입니다. 포털에서 기간을 확인하세요.",
  "32": "등록되지 않은 IP에서 호출했습니다.",
};

export function formatPublicDataError(
  code: string | undefined,
  msg: string | undefined,
): string {
  const hint = code ? PUBLIC_DATA_ERROR_HINTS[code] : undefined;
  const base = `Public Data API error: ${code ?? "?"} ${msg ?? ""}`.trim();
  return hint ? `${base} — ${hint}` : base;
}
