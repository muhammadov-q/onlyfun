"use client";

export function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="relative">
        <div className="size-8 rounded-full border-2 border-muted" />
        <div className="absolute inset-0 size-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    </div>
  );
}
