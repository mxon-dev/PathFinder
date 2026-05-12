import { PathFinderAssistantScreen } from "@/components/pathfinder-assistant";

export function HomePage() {
  return (
    <main className="box-border flex h-dvh max-h-dvh min-h-0 flex-col overflow-hidden bg-neutral-200/60 px-4 py-4 md:px-8 md:py-6">
      <div className="mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col overflow-hidden rounded-[1.75rem] border border-neutral-200/80 bg-neutral-50 shadow-lg ring-1 ring-black/5">
        <PathFinderAssistantScreen />
      </div>
      {/* <div className="mx-auto w-full max-w-2xl">
        <AIDocentPanel />
      </div> */}
    </main>
  );
}
