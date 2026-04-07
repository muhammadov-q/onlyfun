"use client";

import { useState, useEffect } from "react";

interface SiteStatus {
  underConstruction: boolean;
  launchCountdown: boolean;
  launchDate: string | null;
}

export function useSiteStatus() {
  const [status, setStatus] = useState<SiteStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/site-status")
      .then((r) => r.json())
      .then((data: SiteStatus) => setStatus(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { status, loading };
}
