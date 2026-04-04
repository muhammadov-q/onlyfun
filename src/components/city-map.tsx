"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Room } from "./use-party";
import type { useI18n } from "@/i18n";

// Evaluated at module level so Next.js statically inlines the value at build time
const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY!;

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
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

// ---------------------------------------------------------------------------
// Room card
// ---------------------------------------------------------------------------
function RoomCard({
  room,
  onJoin,
  onPreview,
  isPreviewing,
  t,
}: {
  room: Room;
  onJoin: () => void;
  onPreview?: () => void;
  isPreviewing?: boolean;
  t: ReturnType<typeof useI18n>["t"];
}) {
  const full = room.people.length >= room.maxPeople;
  return (
    <div
      className="w-full rounded-2xl text-left relative"
      style={{
        background: "#fff",
        border: "1px solid rgba(0,0,0,0.08)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.15), 0 1px 3px rgba(0,0,0,0.08)",
        padding: 10,
      }}
    >
      {/* Color accent bar */}
      <div
        className="absolute top-0 left-3 right-3 h-[2px] rounded-b-full"
        style={{ backgroundColor: room.color }}
      />

      {/* Topic */}
      <p className="text-zinc-900 text-[11px] font-semibold leading-snug mb-2 mt-0.5 line-clamp-2">
        {room.topic}
      </p>

      {/* People + count row */}
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex -space-x-1.5">
          {room.people.slice(0, 5).map((p) => (
            <div
              key={p.id}
              className="w-5 h-5 rounded-full flex items-center justify-center text-[7px] font-bold uppercase"
              style={{
                backgroundColor: room.color + "20",
                color: room.color,
                border: "1.5px solid #fff",
              }}
            >
              {p.name[0]}
            </div>
          ))}
          {room.people.length > 5 && (
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center text-[7px] font-medium text-zinc-400"
              style={{ backgroundColor: "#f4f4f5", border: "1.5px solid #fff" }}
            >
              +{room.people.length - 5}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-zinc-50">
          <div className={`w-1.5 h-1.5 rounded-full ${full ? "bg-zinc-300" : "bg-emerald-400"}`} />
          <span className="text-zinc-400 text-[9px] font-mono tabular-nums">
            {room.people.length}/{room.maxPeople}
          </span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-1.5">
        {onPreview && !full && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPreview();
            }}
            className="flex items-center justify-center gap-1 h-8 px-3 rounded-xl text-[10px] font-semibold transition-all active:scale-95"
            style={{
              touchAction: "manipulation",
              backgroundColor: isPreviewing ? room.color + "12" : "#f4f4f5",
              color: isPreviewing ? room.color : "#71717a",
              border: isPreviewing ? `1px solid ${room.color}35` : "1px solid transparent",
            }}
          >
            {isPreviewing ? (
              <>
                <span style={{ fontSize: 11 }}>👂</span>
                {t("room.listening")}
              </>
            ) : (
              <>
                <span style={{ fontSize: 11 }}>🕵️</span>
                {t("room.listen")}
              </>
            )}
          </button>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onJoin();
          }}
          disabled={full}
          className="flex-1 h-8 rounded-xl text-[10px] font-semibold transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            touchAction: "manipulation",
            backgroundColor: full ? "#e4e4e7" : "#000",
            color: full ? "#a1a1aa" : "#fff",
          }}
        >
          {full ? t("room.full") : t("room.join")}
        </button>
      </div>

      {/* Tail — attached to card bottom */}
      <div
        style={{
          position: "absolute",
          bottom: -6,
          left: "50%",
          transform: "translateX(-50%)",
          width: 12,
          height: 6,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: 10,
            height: 10,
            backgroundColor: "#fff",
            border: "1px solid rgba(0,0,0,0.08)",
            transform: "rotate(45deg)",
            position: "absolute",
            top: -6,
            left: "50%",
            marginLeft: -5,
            boxShadow: "2px 2px 4px rgba(0,0,0,0.06)",
          }}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CityMap
// ---------------------------------------------------------------------------
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

export function CityMap({
  rooms,
  onJoin,
  t,
  placing,
  setPlacing,
  onPlace,
  showPanel,
  setShowPanel,
  onPreview,
  previewingRoomId,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const placingRef = useRef(placing);
  const bishkekRingRef = useRef<[number, number][] | null>(null);
  const onPlaceRef = useRef(onPlace);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [bishkekRing, setBishkekRing] = useState<[number, number][] | null>(null);
  const [outOfBounds, setOutOfBounds] = useState(false);

  useEffect(() => {
    placingRef.current = placing;
  }, [placing]);
  useEffect(() => {
    onPlaceRef.current = onPlace;
  }, [onPlace]);
  useEffect(() => {
    bishkekRingRef.current = bishkekRing;
  }, [bishkekRing]);

  // Escape key cancels placing mode
  useEffect(() => {
    if (!placing) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPlacing(false);
    };
    window.addEventListener("keydown", h, { capture: true });
    return () => window.removeEventListener("keydown", h, { capture: true });
  }, [placing, setPlacing]);
  // Portal target: the OverlayView's pane container
  const [overlayEl, setOverlayEl] = useState<HTMLDivElement | null>(null);
  const [showCards, setShowCards] = useState(false);
  const [search, setSearch] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const [searchFocused, setSearchFocused] = useState(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let mounted = true;

    const loadMaps = (): Promise<void> => {
      if (window.google?.maps?.Map) return Promise.resolve();
      const existing = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]');
      if (existing)
        return new Promise((resolve) => {
          existing.addEventListener("load", () => resolve(), { once: true });
        });
      return new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_KEY}&v=weekly&libraries=maps`;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = reject;
        document.head.appendChild(script);
      });
    };

    (async () => {
      await loadMaps();
      if (!mounted || !containerRef.current) return;

      const map = new google.maps.Map(containerRef.current, {
        center: { lat: 42.8746, lng: 74.5953 },
        zoom: 12,
        minZoom: 3,
        maxZoom: 18,
        gestureHandling: "greedy",
        disableDoubleClickZoom: true,
        disableDefaultUI: true,
        clickableIcons: false,
        colorScheme: "DARK",
        styles: [{ featureType: "transit", elementType: "all", stylers: [{ visibility: "off" }] }],
      });

      google.maps.event.addListenerOnce(map, "idle", () => map.fitBounds(BISHKEK_BOUNDS));

      // Bishkek border
      fetch(
        "https://nominatim.openstreetmap.org/search?q=Bishkek,Kyrgyzstan&polygon_geojson=1&format=json&limit=1"
      )
        .then((r) => r.json())
        .then((data) => {
          if (!mounted || !data[0]?.geojson) return;
          const geojson = data[0].geojson as {
            type: string;
            coordinates: number[][][][] | number[][][];
          };

          // Pick the largest ring (most coordinates = main city polygon)
          let allRings: number[][][] = [];
          if (geojson.type === "Polygon") {
            allRings = geojson.coordinates as number[][][];
          } else {
            // MultiPolygon: flatten all outer rings
            allRings = (geojson.coordinates as number[][][][]).map((poly) => poly[0]);
          }
          const largestRing = allRings.reduce(
            (best, ring) => (ring.length > best.length ? ring : best),
            allRings[0]
          );
          setBishkekRing(largestRing as [number, number][]);

          // Only draw the largest polygon on the map
          const singlePolygon = { type: "Polygon", coordinates: [largestRing] };
          map.data.addGeoJson({
            type: "FeatureCollection",
            features: [{ type: "Feature", geometry: singlePolygon, properties: {} }],
          });
          map.data.setStyle({
            strokeColor: "#ef4444",
            strokeWeight: 2.5,
            strokeOpacity: 0.9,
            fillOpacity: 0,
          });
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
      overlay.onRemove = function () {
        div.remove();
      };
      overlay.setMap(map);

      mapRef.current = map;
    })();

    return () => {
      mounted = false;
      mapRef.current = null;
    };
  }, []);

  return (
    <div
      style={{ position: "relative", flex: 1, overflow: "hidden" }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />

      {/* ── Placing mode: fixed center pin, user drags the map ── */}
      {placing && (
        <>
          {/* Instruction banner */}
          <div
            style={{
              position: "absolute",
              top: 16,
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 600,
              pointerEvents: "none",
              whiteSpace: "nowrap",
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-black/90 text-white rounded-full shadow-xl text-sm font-medium border border-white/15"
          >
            <span>Move the map to position the pin</span>
          </div>

          {/* Fixed center pin — stays still, map moves under it */}
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -100%)",
              zIndex: 600,
              pointerEvents: "none",
            }}
          >
            {/* Pin shadow */}
            <div
              style={{
                position: "absolute",
                bottom: -4,
                left: "50%",
                transform: "translateX(-50%)",
                width: 12,
                height: 4,
                borderRadius: "50%",
                background: "rgba(0,0,0,0.25)",
                filter: "blur(2px)",
              }}
            />
            {/* Pin icon */}
            <svg width="36" height="44" viewBox="0 0 36 44" fill="none">
              <path
                d="M18 0C8.06 0 0 8.06 0 18c0 13.5 18 26 18 26s18-12.5 18-26C36 8.06 27.94 0 18 0z"
                fill="white"
              />
              <circle cx="18" cy="18" r="7" fill="black" />
            </svg>
          </div>

          {/* Bottom actions — thumb-reachable */}
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              zIndex: 600,
              bottom: 0,
              display: "flex",
              gap: 12,
              padding: "12px 20px",
              paddingBottom: "max(16px, env(safe-area-inset-bottom, 0px) + 12px)",
              background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%)",
            }}
          >
            <button
              onClick={() => setPlacing(false)}
              style={{ touchAction: "manipulation" }}
              className="flex-1 py-3.5 rounded-2xl text-sm font-medium bg-white/10 text-white border border-white/15 active:bg-white/20 backdrop-blur-sm"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                const map = mapRef.current;
                if (!map) return;
                const center = map.getCenter();
                if (!center) return;
                const lat = center.lat(),
                  lng = center.lng();
                const ring = bishkekRingRef.current;
                if (ring && !pointInPolygon(lat, lng, ring)) {
                  setOutOfBounds(true);
                  setTimeout(() => setOutOfBounds(false), 2000);
                  return;
                }
                setPlacing(false);
                onPlaceRef.current(lat, lng);
              }}
              style={{ touchAction: "manipulation" }}
              className="flex-1 py-3.5 rounded-2xl text-sm font-semibold bg-white text-black active:bg-zinc-100"
            >
              Place here
            </button>
          </div>

          {/* Out-of-bounds toast */}
          {outOfBounds && (
            <div
              style={{
                position: "absolute",
                top: 64,
                left: "50%",
                transform: "translateX(-50%)",
                zIndex: 700,
                pointerEvents: "none",
                whiteSpace: "nowrap",
              }}
              className="px-4 py-2 bg-red-500 text-white rounded-full shadow-xl text-sm font-medium"
            >
              Move the pin inside Bishkek
            </div>
          )}
        </>
      )}

      {/* Rooms panel — bottom sheet on mobile, side panel on desktop */}
      {showPanel && (
        <>
          <div
            className="fixed inset-0 bg-black/40 sm:hidden"
            style={{ zIndex: 599 }}
            onClick={() => setShowPanel(false)}
          />
          <div
            className={`fixed sm:absolute left-0 right-0 sm:left-auto sm:right-4 sm:w-[300px] sm:max-h-[calc(100%-32px)] sm:bottom-4 bg-zinc-950 border border-white/10 shadow-2xl flex flex-col overflow-hidden ${
              searchFocused ? "inset-0 rounded-none" : "bottom-0 max-h-[70vh] rounded-t-2xl sm:rounded-2xl"
            }`}
            style={{ zIndex: 600 }}
          >
            {/* Drag handle mobile */}
            <div className="flex justify-center pt-3 pb-1 sm:hidden">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>

            {/* Header */}
            <div className="px-4 pt-3 pb-2 border-b border-white/10 shrink-0 flex items-center justify-between">
              <p className="text-white text-sm font-semibold">{rooms.length} rooms</p>
              <button
                onClick={() => setShowPanel(false)}
                className="text-white/40 hover:text-white transition-colors p-1"
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Search */}
            <div className="px-3 py-2 border-b border-white/10 shrink-0">
              <div className="relative">
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30"
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  ref={searchRef}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setSearchFocused(false)}
                  placeholder={t("room.searchPlaceholder")}
                  className="w-full bg-white/5 text-white text-base sm:text-xs pl-8 pr-3 py-2 rounded-lg border border-white/10 focus:outline-none focus:border-white/20 placeholder-white/25"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-white/30 hover:text-white"
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    >
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
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
                    <button
                      key={room.id}
                      onTouchStart={() => searchRef.current?.blur()}
                      onClick={() => {
                        const map = mapRef.current;
                        if (map) {
                          const d = 0.0015;
                          map.fitBounds(
                            {
                              north: room.lat + d,
                              south: room.lat - d,
                              east: room.lng + d,
                              west: room.lng - d,
                            },
                            0
                          );
                        }
                        setShowPanel(false);
                        setHoveredId(room.id);
                      }}
                      className="w-full px-4 py-3 text-left active:bg-white/10 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0 flex items-start gap-3"
                    >
                      <div
                        className="mt-1 shrink-0 w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: room.color }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-xs font-medium leading-snug truncate">
                          {room.topic}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <div
                            className={`w-1 h-1 rounded-full ${full ? "bg-zinc-500" : "bg-emerald-400"}`}
                          />
                          <span className="text-white/40 text-[10px]">
                            {room.people.length}/{room.maxPeople}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              {search &&
                rooms.filter((r) => r.topic.toLowerCase().includes(search.toLowerCase())).length ===
                  0 && (
                  <p className="text-white/30 text-xs text-center py-8">
                    {t("room.noMatch")} &ldquo;{search}&rdquo;
                  </p>
                )}
            </div>
          </div>
        </>
      )}

      {/* Rooms via portal — filtered to Bishkek boundary */}
      {overlayEl &&
        createPortal(
          <>
            {rooms.map((room) => {
              if (room.lat == null || room.lng == null) return null;
              // Hide rooms outside the Bishkek border
              if (bishkekRing && !pointInPolygon(room.lat, room.lng, bishkekRing)) return null;
              const isActive = hoveredId === room.id;
              const isPreviewing = previewingRoomId === room.id;
              const full = room.people.length >= room.maxPeople;
              return (
                <div
                  key={room.id}
                  data-lat={room.lat}
                  data-lng={room.lng}
                  style={{
                    position: "absolute",
                    transform: showCards ? "translate(-50%, -100%)" : "translate(-50%, -50%)",
                    zIndex: isActive ? 20 : 10,
                  }}
                  onMouseEnter={() => setHoveredId(room.id)}
                  onMouseLeave={() => setHoveredId(null)}
                >
                  {showCards ? (
                    <div style={{ width: 170, paddingBottom: 6 }}>
                      <RoomCard
                        room={room}
                        onJoin={() => onJoin(room.id)}
                        onPreview={() => onPreview?.(room.id)}
                        isPreviewing={previewingRoomId === room.id}
                        t={t}
                      />
                    </div>
                  ) : (
                    <>
                      {isActive && (
                        <div
                          style={{
                            position: "absolute",
                            bottom: 18,
                            left: "50%",
                            transform: "translateX(-50%)",
                            width: 170,
                            zIndex: 20,
                          }}
                        >
                          <RoomCard
                            room={room}
                            onJoin={() => onJoin(room.id)}
                            onPreview={() => onPreview?.(room.id)}
                            isPreviewing={previewingRoomId === room.id}
                            t={t}
                          />
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
                            {
                              north: room.lat + d,
                              south: room.lat - d,
                              east: room.lng + d,
                              west: room.lng - d,
                            },
                            0
                          );
                        }}
                        style={{
                          width: 28,
                          height: 28,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                          position: "relative",
                        }}
                      >
                        {/* Heartbeat pulse rings */}
                        <div
                          className="gps-pulse"
                          style={{ "--pulse-color": room.color } as React.CSSProperties}
                        />
                        <div
                          className="gps-pulse gps-pulse-2"
                          style={{ "--pulse-color": room.color } as React.CSSProperties}
                        />
                        {/* Preview listening ring */}
                        {isPreviewing && (
                          <div
                            style={{
                              position: "absolute",
                              top: "50%",
                              left: "50%",
                              width: 28,
                              height: 28,
                              borderRadius: "50%",
                              transform: "translate(-50%, -50%)",
                              border: `2px solid ${room.color}`,
                              animation: "preview-ring 1.2s ease-in-out infinite",
                              zIndex: 2,
                            }}
                          />
                        )}
                        <div
                          style={{
                            position: "relative",
                            zIndex: 1,
                            width: 10,
                            height: 10,
                            borderRadius: "50%",
                            backgroundColor: room.color,
                            border: `2px solid ${isPreviewing ? "#fff" : "rgba(255,255,255,0.8)"}`,
                            boxShadow: isPreviewing
                              ? `0 0 8px ${room.color}, 0 0 16px ${room.color}60`
                              : isActive
                                ? `0 0 0 4px ${room.color}50`
                                : undefined,
                            transition: "box-shadow 0.15s, border-color 0.15s",
                          }}
                        />
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
