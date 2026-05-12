import { IconClock } from "./icons";

export const DURATION_OPTIONS = [
  { id: "15", label: "15분" },
  { id: "30", label: "30분" },
  { id: "45", label: "45분" },
  { id: "60", label: "1시간" },
  { id: "90", label: "1시간 30분" },
] as const;

export type DurationId = (typeof DURATION_OPTIONS)[number]["id"];

type PathFinderDurationChipsProps = {
  value: DurationId | null;
  onChange: (id: DurationId) => void;
};

export function PathFinderDurationChips({
  value,
  onChange,
}: PathFinderDurationChipsProps) {
  return (
    <div>
      <p className="text-xs font-medium text-neutral-400">
        소요 시간 (하나 선택)
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {DURATION_OPTIONS.map((opt) => {
          const selected = value === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onChange(opt.id)}
              className={
                selected
                  ? "inline-flex items-center gap-1.5 rounded-full bg-blue-500 px-3 py-2 text-sm font-medium text-white shadow-sm"
                  : "inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-600 shadow-sm transition hover:border-neutral-300"
              }
            >
              <IconClock
                className={selected ? "text-white" : "text-neutral-400"}
              />
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
