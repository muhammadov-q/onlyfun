"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Room } from "./use-party";
import type { useI18n } from "@/i18n";

const BISHKEK_BOUNDS = {
  north: 42.94,
  south: 42.82,
  west: 74.46,
  east: 74.74,
};

function pointInPolygon(lat: number, lng: number, ring: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if ((yi > lat) !== (yj > lat) && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi)
      inside = !inside;
  }
  return inside;
}

// ---------------------------------------------------------------------------
// Room card
// ---------------------------------------------------------------------------
function RoomCard({
  room,
  onJoin,
  t,
}: {
  room: Room;
  onJoin: () => void;
  t: ReturnType<typeof useI18n>["t"];
}) {
  const full = room.people.length >= room.maxPeople;
  return (
    <button
      onClick={onJoin}
      disabled={full}
      className="w-full bg-white rounded-xl p-2.5 text-left border border-zinc-200/80 hover:border-zinc-300 hover:shadow-lg transition-all disabled:cursor-not-allowed shadow-md group relative overflow-hidden"
    >
      <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-xl" style={{ backgroundColor: room.color }} />
      <p className="text-black text-[11px] font-semibold leading-snug mb-1 line-clamp-2">{room.topic}</p>
      <div className="flex items-center justify-between">
        <div className="flex -space-x-1">
          {room.people.slice(0, 4).map((p) => (
            <div
              key={p.id}
              className="w-4 h-4 rounded-full border border-white flex items-center justify-center text-[7px] font-bold uppercase"
              style={{ backgroundColor: room.color + "30", color: room.color }}
            >
              {p.name[0]}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <div className={`w-1 h-1 rounded-full ${full ? "bg-zinc-300" : "bg-emerald-400"}`} />
          <span className="text-zinc-400 text-[9px]">
            {room.people.length}/{room.maxPeople}
          </span>
        </div>
      </div>
      <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center bg-black/[0.04]">
        <span className={`text-white text-[9px] px-2.5 py-1 rounded-full font-semibold shadow-sm ${full ? "bg-zinc-700" : "bg-black"}`}>
          {full ? t("room.full") : t("room.join")}
        </span>
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// CityMap
// ---------------------------------------------------------------------------
type Props = {
  rooms: Room[];
  onJoin: (id: string) => void;
  onDblClick: (lat: number, lng: number) => void;
  t: ReturnType<typeof useI18n>["t"];
  placing: boolean;
  setPlacing: (v: boolean) => void;
  showPanel: boolean;
  setShowPanel: (v: boolean | ((prev: boolean) => boolean)) => void;
};

export function CityMap({ rooms, onJoin, onDblClick, t, placing, setPlacing, showPanel, setShowPanel }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const onDblClickRef = useRef(onDblClick);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const placingRef = useRef(false);
  const [bishkekRing, setBishkekRing] = useState<[number, number][] | null>(null);
  const [outOfBounds, setOutOfBounds] = useState(false);
  // Portal target: the OverlayView's pane container
  const [overlayEl, setOverlayEl] = useState<HTMLDivElement | null>(null);
  const [showCards, setShowCards] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => { onDblClickRef.current = onDblClick; }, [onDblClick]);
  useEffect(() => { placingRef.current = placing; }, [placing]);
  useEffect(() => {
    if (!placing) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") { e.preventDefault(); setPlacing(false); } };
    window.addEventListener("keydown", h, { capture: true });
    return () => window.removeEventListener("keydown", h, { capture: true });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placing]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let mounted = true;

    (async () => {
      const { setOptions, importLibrary } = await import("@googlemaps/js-api-loader");
      if (!mounted || !containerRef.current) return;

      setOptions({ key: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY!, v: "weekly" });
      await importLibrary("maps");
      if (!mounted || !containerRef.current) return;

      const map = new google.maps.Map(containerRef.current, {
        center: { lat: 42.8746, lng: 74.5953 },
        zoom: 12,
        minZoom: 3,
        maxZoom: 18,
        gestureHandling: "greedy",
        disableDoubleClickZoom: true,
        zoomControl: false,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        clickableIcons: false,
        colorScheme: "DARK",
        styles: [
          { featureType: "transit", elementType: "all", stylers: [{ visibility: "off" }] },
        ],
      });

      google.maps.event.addListenerOnce(map, "idle", () => map.fitBounds(BISHKEK_BOUNDS));

      // Bishkek border
      fetch("https://nominatim.openstreetmap.org/search?q=Bishkek,Kyrgyzstan&polygon_geojson=1&format=json&limit=1")
        .then((r) => r.json())
        .then((data) => {
          if (!mounted || !data[0]?.geojson) return;
          const geojson = data[0].geojson as { type: string; coordinates: number[][][][] | number[][][] };

          // Pick the largest ring (most coordinates = main city polygon)
          let allRings: number[][][] = [];
          if (geojson.type === "Polygon") {
            allRings = geojson.coordinates as number[][][];
          } else {
            // MultiPolygon: flatten all outer rings
            allRings = (geojson.coordinates as number[][][][]).map((poly) => poly[0]);
          }
          const largestRing = allRings.reduce((best, ring) => ring.length > best.length ? ring : best, allRings[0]);
          setBishkekRing(largestRing as [number, number][]);

          // Only draw the largest polygon on the map
          const singlePolygon = { type: "Polygon", coordinates: [largestRing] };
          map.data.addGeoJson({ type: "FeatureCollection", features: [{ type: "Feature", geometry: singlePolygon, properties: {} }] });
          map.data.setStyle({ strokeColor: "#ef4444", strokeWeight: 2.5, strokeOpacity: 0.9, fillOpacity: 0 });
        })
        .catch(() => {});

      // OverlayView — positions updated via direct DOM in draw(), perfectly in sync with map
      const div = document.createElement("div");
      div.style.cssText = "position:absolute;top:0;left:0;width:0;height:0;overflow:visible;";

      const zoomRef = { current: map.getZoom() ?? 12 };

      const overlay = new google.maps.OverlayView();
      overlay.onAdd = function () {
        this.getPanes()!.overlayMouseTarget.appendChild(div);
        if (mounted) setOverlayEl(div);
      };
      overlay.draw = function () {
        const proj = this.getProjection();
        if (!proj) return;
        // Update every room element's position directly — no React re-render needed
        div.querySelectorAll<HTMLElement>("[data-lat]").forEach((el) => {
          const lat = parseFloat(el.dataset.lat!);
          const lng = parseFloat(el.dataset.lng!);
          const pt = proj.fromLatLngToDivPixel(new google.maps.LatLng(lat, lng));
          if (pt) {
            el.style.left = `${pt.x}px`;
            el.style.top = `${pt.y}px`;
          }
        });
        // Only re-render React when crossing the zoom threshold
        const z = map.getZoom() ?? 12;
        const wasCard = zoomRef.current >= 15;
        const isCard = z >= 15;
        zoomRef.current = z;
        if (wasCard !== isCard) setShowCards(isCard);
      };
      overlay.onRemove = function () { div.remove(); };
      overlay.setMap(map);

      mapRef.current = map;
    })();

    return () => { mounted = false; mapRef.current = null; };
  }, []);

  return (
    <div
      style={{ position: "relative", flex: 1, overflow: "hidden", cursor: placing ? "crosshair" : "default" }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />

      {/* Placement capture layer */}
      {placing && (
        <div
          style={{ position: "absolute", inset: 0, zIndex: 450, cursor: "crosshair" }}
          onClick={(e) => {
            const map = mapRef.current;
            const container = containerRef.current;
            if (!map || !container) return;
            const proj = map.getProjection();
            const bounds = map.getBounds();
            if (!proj || !bounds) return;
            const rect = container.getBoundingClientRect();
            const px = e.clientX - rect.left;
            const py = e.clientY - rect.top;
            const scale = Math.pow(2, map.getZoom() ?? 14);
            const nw = proj.fromLatLngToPoint(
              new google.maps.LatLng(bounds.getNorthEast().lat(), bounds.getSouthWest().lng())
            );
            if (!nw) return;
            const latLng = proj.fromPointToLatLng(new google.maps.Point(px / scale + nw.x, py / scale + nw.y));
            if (!latLng) return;
            const lat = latLng.lat(), lng = latLng.lng();
            if (bishkekRing && !pointInPolygon(lat, lng, bishkekRing)) {
              setOutOfBounds(true);
              setTimeout(() => setOutOfBounds(false), 2000);
              return;
            }
            setPlacing(false);
            onDblClickRef.current(lat, lng);
          }}
        />
      )}

      {outOfBounds && (
        <div style={{ position: "absolute", top: 16, left: "50%", transform: "translateX(-50%)", zIndex: 700, pointerEvents: "none" }}
          className="flex items-center gap-2 px-4 py-2.5 bg-red-500 text-white rounded-full shadow-xl text-sm font-medium animate-in">
          Place rooms inside Bishkek only
        </div>
      )}

      {placing && (
        <div style={{ position: "absolute", top: 16, left: "50%", transform: "translateX(-50%)", zIndex: 600, pointerEvents: "none" }}
          className="flex items-center gap-2 px-4 py-2.5 bg-black text-white rounded-full shadow-xl text-sm font-medium animate-in">
          <span>📍</span> Click to place your room · ESC to cancel
        </div>
      )}

      {/* Rooms panel — bottom sheet on mobile, side panel on desktop */}
      {showPanel && (
        <>
          <div className="fixed inset-0 bg-black/40 sm:hidden" style={{ zIndex: 599 }} onClick={() => setShowPanel(false)} />
          <div
            className="fixed sm:absolute bottom-0 sm:bottom-4 left-0 right-0 sm:left-auto sm:right-4 sm:w-[300px] max-h-[70vh] sm:max-h-[calc(100%-32px)] rounded-t-2xl sm:rounded-2xl bg-zinc-950 border border-white/10 shadow-2xl flex flex-col overflow-hidden"
            style={{ zIndex: 600 }}
          >
            {/* Drag handle mobile */}
            <div className="flex justify-center pt-3 pb-1 sm:hidden">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>

            {/* Header */}
            <div className="px-4 pt-3 pb-2 border-b border-white/10 shrink-0 flex items-center justify-between">
              <p className="text-white text-sm font-semibold">{rooms.length} rooms</p>
              <button onClick={() => setShowPanel(false)} className="text-white/40 hover:text-white transition-colors p-1">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            {/* Search */}
            <div className="px-3 py-2 border-b border-white/10 shrink-0">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search rooms…"
                  className="w-full bg-white/5 text-white text-xs pl-8 pr-3 py-2 rounded-lg border border-white/10 focus:outline-none focus:border-white/20 placeholder-white/25"
                />
                {search && (
                  <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-white/30 hover:text-white">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                )}
              </div>
            </div>

            {/* List */}
            <div className="overflow-y-auto flex-1" style={{ scrollbarWidth: "thin" }}>
              {rooms
                .filter((r) => !search || r.topic.toLowerCase().includes(search.toLowerCase()))
                .map((room) => {
                  const full = room.people.length >= room.maxPeople;
                  return (
                    <button key={room.id}
                      onClick={() => {
                      const map = mapRef.current;
                      if (map) {
                        const d = 0.0015;
                        map.fitBounds(
                          { north: room.lat + d, south: room.lat - d, east: room.lng + d, west: room.lng - d },
                          0
                        );
                      }
                      setShowPanel(false);
                      setHoveredId(room.id);
                    }}
                      className="w-full px-4 py-3 text-left active:bg-white/10 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0 flex items-start gap-3">
                      <div className="mt-1 shrink-0 w-2.5 h-2.5 rounded-full" style={{ backgroundColor: room.color }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-xs font-medium leading-snug truncate">{room.topic}</p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <div className={`w-1 h-1 rounded-full ${full ? "bg-zinc-500" : "bg-emerald-400"}`} />
                          <span className="text-white/40 text-[10px]">{room.people.length}/{room.maxPeople} people</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              {search && rooms.filter((r) => r.topic.toLowerCase().includes(search.toLowerCase())).length === 0 && (
                <p className="text-white/30 text-xs text-center py-8">No rooms match &ldquo;{search}&rdquo;</p>
              )}
            </div>
          </div>
        </>
      )}

      {/* Rooms via portal — filtered to Bishkek boundary */}
      {overlayEl && createPortal(
        <>
          {rooms.map((room) => {
            if (room.lat == null || room.lng == null) return null;
            // Hide rooms outside the Bishkek border
            if (bishkekRing && !pointInPolygon(room.lat, room.lng, bishkekRing)) return null;
            const isActive = hoveredId === room.id;
            const full = room.people.length >= room.maxPeople;
            return (
              <div
                key={room.id}
                data-lat={room.lat}
                data-lng={room.lng}
                style={{ position: "absolute", transform: "translate(-50%, -50%)", zIndex: isActive ? 20 : 10 }}
                onMouseEnter={() => setHoveredId(room.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                {showCards ? (
                  <div style={{ width: 160 }}>
                    <RoomCard room={room} onJoin={() => onJoin(room.id)} t={t} />
                  </div>
                ) : (
                  <>
                    {isActive && (
                      <div style={{ position: "absolute", bottom: 18, left: "50%", transform: "translateX(-50%)", width: 160, zIndex: 20 }}>
                        <RoomCard room={room} onJoin={() => onJoin(room.id)} t={t} />
                      </div>
                    )}
                    {/* Larger touch target wrapping the dot */}
                    <div
                      onClick={() => {
                        setHoveredId(room.id);
                        const map = mapRef.current;
                        if (!map) return;
                        const d = 0.0015;
                        map.fitBounds(
                          { north: room.lat + d, south: room.lat - d, east: room.lng + d, west: room.lng - d },
                          0
                        );
                      }}
                      style={{ width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", position: "relative" }}
                    >
                      {/* Heartbeat pulse rings */}
                      <div className="gps-pulse" style={{ "--pulse-color": room.color } as React.CSSProperties} />
                      <div className="gps-pulse gps-pulse-2" style={{ "--pulse-color": room.color } as React.CSSProperties} />
                      <div style={{
                        position: "relative", zIndex: 1,
                        width: 10, height: 10, borderRadius: "50%",
                        backgroundColor: room.color,
                        border: "2px solid rgba(255,255,255,0.8)",
                        boxShadow: isActive ? `0 0 0 4px ${room.color}50` : undefined,
                        transition: "box-shadow 0.15s",
                      }} />
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </>,
        overlayEl
      )}
    </div>
  );
}
