import { IconLocationPin } from "./icons";

type PathFinderLocationRowProps = {
  label?: string;
  detail?: string;
  isSelected?: boolean;
  onSelectLocation: () => void;
  disabled?: boolean;
};

const rowClass =
  "flex w-full items-center justify-between gap-3 border-b border-neutral-100 bg-white px-4 py-2.5";

export function PathFinderLocationRow({
  label = "현재 위치 기반 추천",
  detail,
  isSelected = false,
  onSelectLocation,
  disabled = false,
}: PathFinderLocationRowProps) {
  return (
    <div className={rowClass}>
      <div className="flex min-w-0 items-center gap-2.5">
        <span
          className={
            isSelected
              ? "flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"
              : "flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600"
          }
          aria-hidden
        >
          <IconLocationPin className="h-4 w-4" />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium text-neutral-800">
            {label}
          </span>
          {detail ? (
            <span className="block truncate text-xs text-neutral-500">{detail}</span>
          ) : null}
        </span>
      </div>
      <button
        type="button"
        onClick={onSelectLocation}
        disabled={disabled}
        className="shrink-0 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-45"
      >
        위치 선택
      </button>
    </div>
  );
}
