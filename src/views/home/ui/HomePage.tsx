import { AIDocentPanel } from "@/features/ai-docent/ui/AIDocentPanel";

export function HomePage() {
  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
        PathFinder
      </h1>
      <p className="mt-2 text-neutral-600">Next.js dev server is running.</p>
      <AIDocentPanel />
    </main>
  );
}
