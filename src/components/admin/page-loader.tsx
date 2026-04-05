"use client";

import { Loader2 } from "lucide-react";

export function PageLoader({ text = "Loading..." }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
      <div className="relative">
        <div className="size-10 rounded-full border-2 border-muted" />
        <div className="absolute inset-0 size-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}
