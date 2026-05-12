import type { ReactNode } from "react";

type PathFinderUserMessageProps = {
  children: ReactNode;
};

export function PathFinderUserMessage({ children }: PathFinderUserMessageProps) {
  return (
    <div className="mx-4 mt-3 flex justify-end">
      <div className="max-w-[85%] rounded-2xl rounded-tr-md bg-blue-500 px-3.5 py-2.5 text-[0.92rem] leading-relaxed text-white shadow-sm">
        {children}
      </div>
    </div>
  );
}
