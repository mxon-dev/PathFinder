import { IconChevronDown } from "./icons";

type PathFinderLocationRowProps = {
  onPress?: () => void;
};

const rowClass =
  "flex w-full items-center justify-between border-b border-neutral-100 bg-white px-4 py-2.5";

export function PathFinderLocationRow({ onPress }: PathFinderLocationRowProps) {
  const inner = (
    <>
      <span className="flex items-center gap-2 text-sm font-medium text-neutral-800">
        <span className="inline-block h-2 w-2 rounded-full bg-blue-500" aria-hidden />
        현재 위치 기반 추천
      </span>
      <IconChevronDown className="shrink-0 text-neutral-400" />
    </>
  );

  if (onPress) {
    return (
      <button
        type="button"
        onClick={onPress}
        className={`${rowClass} text-left transition hover:bg-neutral-50`}
      >
        {inner}
      </button>
    );
  }

  return <div className={rowClass}>{inner}</div>;
}
