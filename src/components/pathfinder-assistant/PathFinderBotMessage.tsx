import type { ReactNode } from "react";
import { BotAvatar } from "./icons";

type PathFinderBotMessageProps = {
  children: ReactNode;
};

export function PathFinderBotMessage({ children }: PathFinderBotMessageProps) {
  return (
    <div className="mx-4 mt-4 flex gap-2.5">
      <BotAvatar />
      <div className="min-w-0 flex-1 rounded-2xl rounded-tl-md bg-white px-3.5 py-3 text-[0.92rem] leading-relaxed text-neutral-900 shadow-sm ring-1 ring-neutral-100">
        {children}
      </div>
    </div>
  );
}
