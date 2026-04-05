"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, Check, Loader2 } from "lucide-react";

export function RefreshButton({ onRefresh }: { onRefresh: () => Promise<void> }) {
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleClick = useCallback(async () => {
    setState("loading");
    try {
      await onRefresh();
    } finally {
      setState("done");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setState("idle"), 1500);
    }
  }, [onRefresh]);

  return (
    <Button variant="outline" size="sm" onClick={handleClick} disabled={state === "loading"}>
      {state === "loading" ? (
        <>
          <Loader2 className="size-3.5 mr-1.5 animate-spin" />
          Refreshing...
        </>
      ) : state === "done" ? (
        <>
          <Check className="size-3.5 mr-1.5 text-emerald-400" />
          <span className="text-emerald-400">Done</span>
        </>
      ) : (
        <>
          <RefreshCw className="size-3.5 mr-1.5" />
          Refresh
        </>
      )}
    </Button>
  );
}
