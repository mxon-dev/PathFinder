export const PLACE_OPTIONS = [
  { id: "river", label: "강", emoji: "🌊" },
  { id: "park", label: "공원", emoji: "🌳" },
  { id: "mountain", label: "산", emoji: "⛰️" },
  { id: "urban", label: "도심", emoji: "🏙️" },
  { id: "lake", label: "호수", emoji: "🏖️" },
] as const;

export type PlaceId = (typeof PLACE_OPTIONS)[number]["id"];

type PathFinderPlaceTypeChipsProps = {
  value: PlaceId[];
  onToggle: (id: PlaceId) => void;
};

export function PathFinderPlaceTypeChips({
  value,
  onToggle,
}: PathFinderPlaceTypeChipsProps) {
  return (
    <div>
      <p className="text-xs font-medium text-neutral-400">
        장소 유형 (복수 선택 가능)
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {PLACE_OPTIONS.map((opt) => {
          const selected = value.includes(opt.id);
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onToggle(opt.id)}
              className={
                selected
                  ? "inline-flex items-center gap-1 rounded-full bg-blue-500 px-3 py-2 text-sm font-medium text-white shadow-sm"
                  : "inline-flex items-center gap-1 rounded-full border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-600 shadow-sm transition hover:border-neutral-300"
              }
            >
              <span aria-hidden>{opt.emoji}</span>
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
