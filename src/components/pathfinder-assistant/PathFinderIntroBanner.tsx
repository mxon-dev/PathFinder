type PathFinderIntroBannerProps = {
  title?: string;
  description?: string;
};

const DEFAULT_TITLE = "오늘의 완벽한 산책, 찾아드릴게요 🚶";
const DEFAULT_DESCRIPTION =
  "시간, 장소, 분위기를 알려주시면 딱 맞는 경로를 추천해 드려요";

export function PathFinderIntroBanner({
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
}: PathFinderIntroBannerProps) {
  return (
    <div className="mx-4 mt-3 rounded-2xl bg-blue-500 px-4 py-4 text-white shadow-sm">
      <p className="text-[0.95rem] font-bold leading-snug">{title}</p>
      <p className="mt-1.5 text-sm font-normal leading-relaxed text-white/90">
        {description}
      </p>
    </div>
  );
}
