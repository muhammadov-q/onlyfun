"use client";

import { useEffect, useState } from "react";

export function TaskbarClock() {
  const [time, setTime] = useState("");
  const [date, setDate] = useState("");

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
      setDate(now.toLocaleDateString([], { month: "short", day: "numeric" }));
    };
    update();
    const id = setInterval(update, 10000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex flex-col items-end leading-tight px-2">
      <span className="text-white text-xs font-semibold tabular-nums">{time}</span>
      <span className="text-white/50 text-[10px]">{date}</span>
    </div>
  );
}
