import { IconUserOutline } from "./icons";

export function PathFinderHeader() {
  return (
    <header className="flex items-center justify-between px-4 pt-4 pb-1">
      <h1 className="text-[1.05rem] font-bold tracking-tight text-neutral-900">
        PathFinder
      </h1>
      <button
        type="button"
        className="flex h-10 w-10 items-center justify-center rounded-full text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-900"
        aria-label="프로필"
      >
        <IconUserOutline />
      </button>
    </header>
  );
}
