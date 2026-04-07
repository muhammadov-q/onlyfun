"use client";

import { lazy, Suspense, useEffect, useState } from "react";
import type { Room } from "./use-party";
import type { useI18n } from "@/i18n";

const GoogleMap = lazy(() => import("./city-map").then((m) => ({ default: m.CityMap })));
const LeafletMap = lazy(() => import("./city-map-leaflet").then((m) => ({ default: m.CityMap })));

type Props = {
  rooms: Room[];
  onJoin: (id: string) => void;
  t: ReturnType<typeof useI18n>["t"];
  placing: boolean;
  setPlacing: (v: boolean) => void;
  onPlace: (lat: number, lng: number) => void;
  showPanel: boolean;
  setShowPanel: (v: boolean | ((prev: boolean) => boolean)) => void;
  onPreview?: (roomId: string) => void;
  previewingRoomId?: string | null;
};

function MapLoader() {
  return (
    <div style={{ position: "relative", flex: 1, overflow: "hidden", background: "#1a1a2e" }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            border: "3px solid rgba(255,255,255,0.1)",
            borderTopColor: "rgba(255,255,255,0.5)",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }}
        />
      </div>
    </div>
  );
}

export function CityMapProvider(props: Props) {
  const [provider, setProvider] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/config/map-provider")
      .then((r) => r.json())
      .then((d) => setProvider(d.provider || "google"))
      .catch(() => setProvider("google"));
  }, []);

  if (!provider) return <MapLoader />;

  return (
    <Suspense fallback={<MapLoader />}>
      {provider === "leaflet" ? <LeafletMap {...props} /> : <GoogleMap {...props} />}
    </Suspense>
  );
}
