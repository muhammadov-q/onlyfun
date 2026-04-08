"use client";

import { useRef, useState, useCallback } from "react";

interface DraggableSheetProps {
  onClose: () => void;
  children: React.ReactNode;
}

export function DraggableSheet({ onClose, children }: DraggableSheetProps) {
  const [dragY, setDragY] = useState(0);
  const dragStart = useRef<{ y: number; time: number } | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // Only allow drag from the top ~60px (handle + header area)
    const sheet = sheetRef.current;
    if (!sheet) return;
    const rect = sheet.getBoundingClientRect();
    const touchY = e.touches[0].clientY;
    if (touchY - rect.top > 60) return;
    dragStart.current = { y: e.touches[0].clientY, time: Date.now() };
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!dragStart.current) return;
    const dy = e.touches[0].clientY - dragStart.current.y;
    // Only allow dragging downward
    setDragY(Math.max(0, dy));
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!dragStart.current) return;
    const elapsed = Date.now() - dragStart.current.time;
    // Dismiss if dragged >100px down or fast swipe (>60px in <200ms)
    if (dragY > 100 || (dragY > 60 && elapsed < 200)) {
      onClose();
    }
    setDragY(0);
    dragStart.current = null;
  }, [dragY, onClose]);

  return (
    <div
      className="fixed inset-0 z-[500] flex items-end sm:hidden bg-black/70"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{ opacity: dragY > 0 ? Math.max(0.3, 1 - dragY / 300) : 1 }}
    >
      <div
        ref={sheetRef}
        className="w-full bg-black rounded-t-3xl border-t border-white/10 shadow-2xl slide-up max-h-[80dvh] flex flex-col pb-[72px]"
        style={{
          transform: dragY > 0 ? `translateY(${dragY}px)` : undefined,
          transition: dragY > 0 ? "none" : "transform 0.3s ease-out",
          marginBottom: "env(safe-area-inset-bottom, 0px)",
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>
        {children}
      </div>
    </div>
  );
}
