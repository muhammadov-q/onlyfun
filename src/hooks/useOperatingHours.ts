"use client";

import { useState, useEffect, useRef } from "react";

interface OperatingHoursStatus {
  isRestricted: boolean;
  isOpenNow: boolean;
  startTime: string;
  endTime: string;
  opensInMs: number;
}

/**
 * Polls the server for operating-hours status.
 * When closed, ticks a local countdown every second based on server-provided opensInMs.
 * Re-fetches from server every 60s to stay in sync.
 */
export function useOperatingHours(enabled: boolean = true) {
  const [status, setStatus] = useState<OperatingHoursStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const fetchedAt = useRef(0);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    let mounted = true;

    async function check() {
      try {
        const res = await fetch("/api/operating-hours");
        if (!res.ok) return;
        const data: OperatingHoursStatus = await res.json();
        if (mounted) {
          fetchedAt.current = Date.now();
          setStatus(data);
        }
      } catch {
        // silently retry next interval
      } finally {
        if (mounted) setLoading(false);
      }
    }

    check();
    const interval = setInterval(check, 60_000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [enabled]);

  // Client-side countdown tick
  const [remainingMs, setRemainingMs] = useState(0);

  useEffect(() => {
    if (!status || status.isOpenNow || !status.isRestricted) {
      setRemainingMs(0);
      return;
    }

    // Initial value from server
    setRemainingMs(status.opensInMs);

    const tick = setInterval(() => {
      const elapsed = Date.now() - fetchedAt.current;
      const remaining = Math.max(0, status.opensInMs - elapsed);
      setRemainingMs(remaining);

      // When timer hits 0, refetch to confirm app is open
      if (remaining <= 0) {
        clearInterval(tick);
        // Trigger re-fetch
        fetch("/api/operating-hours")
          .then((r) => r.json())
          .then((data) => {
            fetchedAt.current = Date.now();
            setRemainingMs(data.opensInMs ?? 0);
            setStatus(data);
          })
          .catch(() => {});
      }
    }, 1000);

    return () => clearInterval(tick);
  }, [status]);

  return { status, loading, remainingMs };
}
