"use client";

import { lazy, Suspense, useEffect, useState, useMemo } from "react";
import type { Room } from "./use-party";
import type { useI18n } from "@/i18n";

const GoogleMap = lazy(() => import("./city-map").then((m) => ({ default: m.CityMap })));
// const LeafletMap = lazy(() => import("./city-map-leaflet").then((m) => ({ default: m.CityMap })));
// const MapLibreMap = lazy(() => import("./city-map-maplibre").then((m) => ({ default: m.CityMap })));

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
    <div style={{ position: "relative", flex: 1, overflow: "hidden", background: "#000" }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span
          style={{ color: "rgba(255,255,255,0.4)", fontSize: 14, letterSpacing: "0.05em" }}
          className="animate-pulse"
        >
          thinking...
        </span>
      </div>
    </div>
  );
}

export function CityMapProvider(props: Props) {
  const provider = "google";
  const [dotColor, setDotColor] = useState<{ mode: string; color: string } | null>({
    mode: "random",
    color: "#6366f1",
  });

  // Hardcoded to Google Maps for now — skip map-provider fetch
  useEffect(() => {
    fetch("/api/config/dot-color")
      .then((r) => r.json())
      .then((d) => setDotColor(d))
      .catch(() => {});
  }, []);

  // Override room colors when uniform mode is active
  const rooms = useMemo(() => {
    if (!dotColor || dotColor.mode !== "uniform") return props.rooms;
    return props.rooms.map((r) => ({ ...r, color: dotColor.color }));
  }, [props.rooms, dotColor]);

  if (!provider) return <MapLoader />; // shouldn't happen now, but just in case

  const mapProps = { ...props, rooms };

  return (
    <Suspense fallback={<MapLoader />}>
      <GoogleMap {...mapProps} />
    </Suspense>
  );
}
