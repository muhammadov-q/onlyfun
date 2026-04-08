"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Room } from "./use-party";
import type { useI18n } from "@/i18n";
import { ROOM_MODES_MAP } from "@/config/roomModes";

// Free dark vector tile style from OpenFreeMap (no API key needed)
const DARK_STYLE = "https://tiles.openfreemap.org/styles/dark";

function pointInPolygon(lat: number, lng: number, ring: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function highlightMatch(text: string, query: string) {
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <span className="text-white bg-white/20 rounded-sm px-0.5">
        {text.slice(idx, idx + query.length)}
      </span>
      {text.slice(idx + query.length)}
    </>
  );
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
  const mode = room.mode ? ROOM_MODES_MAP[room.mode] : null;
  return (
    <div
      className="w-full text-left relative"
      style={{
        background: "#fff",
        borderRadius: "18px 18px 18px 4px",
        boxShadow: `4px 4px 0 ${room.color}30`,
        padding: 10,
        borderLeft: `3px solid ${room.color}`,
      }}
    >
      <div className="flex items-center justify-between mb-1.5">
        {mode ? (
          <div
            className="flex items-center gap-1 px-1.5 py-[2px] rounded-full"
            style={{ backgroundColor: room.color + "12" }}
          >
            <span className="text-[10px] leading-none">{mode.emoji}</span>
            <span className="text-[9px] font-semibold" style={{ color: room.color }}>
              {mode.label}
            </span>
          </div>
        ) : (
          <div />
        )}
        <div className="flex items-center gap-1">
          <div className={`w-1.5 h-1.5 rounded-full ${full ? "bg-zinc-300" : "bg-emerald-400"}`} />
          <span className="text-zinc-400 text-[9px] font-mono tabular-nums">
            {room.people.length}/{room.maxPeople}
          </span>
        </div>
      </div>

      <p className="text-zinc-900 text-[12px] font-bold leading-snug mb-2 line-clamp-2">
        {room.topic}
      </p>

      <div className="flex flex-wrap gap-1 mb-2.5">
        {room.people.slice(0, 4).map((p) => (
          <span
            key={p.id}
            className="text-[8px] font-semibold px-1.5 py-[1px] rounded-full"
            style={{ backgroundColor: room.color + "14", color: room.color }}
          >
            {p.name}
          </span>
        ))}
        {room.people.length > 4 && (
          <span className="text-[8px] font-medium text-zinc-400 px-1.5 py-[1px]">
            +{room.people.length - 4}
          </span>
        )}
      </div>

      <div className="flex gap-1.5">
        {onPreview && !full && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPreview();
            }}
            className="flex items-center justify-center gap-1 h-7 px-2.5 text-[10px] font-semibold transition-all active:scale-95"
            style={{
              touchAction: "manipulation",
              borderRadius: "10px 10px 10px 3px",
              backgroundColor: isPreviewing ? room.color + "15" : "#f4f4f5",
              color: isPreviewing ? room.color : "#71717a",
              border: isPreviewing ? `1px solid ${room.color}40` : "1px solid transparent",
            }}
          >
            {isPreviewing ? (
              <>
                <span style={{ fontSize: 10 }}>{"\u{1F442}"}</span>
                {t("room.listening")}
              </>
            ) : (
              <>
                <span style={{ fontSize: 10 }}>{"\u{1F575}\uFE0F"}</span>
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
          className="flex-1 h-7 text-[10px] font-bold transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            touchAction: "manipulation",
            borderRadius: "10px 10px 10px 3px",
            backgroundColor: full ? "#e4e4e7" : room.color,
            color: full ? "#a1a1aa" : "#fff",
          }}
        >
          {full ? t("room.full") : t("room.join")}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CityMap — MapLibre GL JS
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
  const overlayRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const placingRef = useRef(placing);
  const bishkekRingRef = useRef<[number, number][] | null>(null);
  const onPlaceRef = useRef(onPlace);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [bishkekRing, setBishkekRing] = useState<[number, number][] | null>(null);
  const [outOfBounds, setOutOfBounds] = useState(false);
  const [overlayReady, setOverlayReady] = useState(false);
  const [showCards, setShowCards] = useState(false);
  const [search, setSearch] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const [searchFocused, setSearchFocused] = useState(false);

  useEffect(() => {
    placingRef.current = placing;
    if (placing) setHoveredId(null);
  }, [placing]);
  useEffect(() => {
    onPlaceRef.current = onPlace;
  }, [onPlace]);
  useEffect(() => {
    bishkekRingRef.current = bishkekRing;
  }, [bishkekRing]);

  // Escape cancels placing
  useEffect(() => {
    if (!placing) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPlacing(false);
    };
    window.addEventListener("keydown", h, { capture: true });
    return () => window.removeEventListener("keydown", h, { capture: true });
  }, [placing, setPlacing]);

  // Reposition overlay elements — called on every render frame by MapLibre
  const reposition = useCallback(() => {
    const map = mapRef.current;
    const div = overlayRef.current;
    if (!map || !div) return;

    div.querySelectorAll<HTMLElement>("[data-lat]").forEach((el) => {
      const lat = parseFloat(el.dataset.lat!);
      const lng = parseFloat(el.dataset.lng!);
      const pt = map.project([lng, lat]); // MapLibre uses [lng, lat]
      el.style.transform = `translate(${pt.x}px, ${pt.y}px)`;
    });

    const z = map.getZoom();
    const isCard = z >= 15;
    setShowCards((prev) => {
      if (prev !== isCard) {
        if (!isCard) setHoveredId(null);
        return isCard;
      }
      return prev;
    });
  }, []);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let mounted = true;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: DARK_STYLE,
      center: [74.5953, 42.8746], // MapLibre uses [lng, lat]
      zoom: 12,
      minZoom: 10, // Don't allow zooming out beyond city level
      maxZoom: 18,
      doubleClickZoom: false,
      attributionControl: false,
    });

    // Custom style tweaks — brighten the dark base and add personality
    map.once("load", () => {
      // Brighten water
      if (map.getLayer("water")) {
        map.setPaintProperty("water", "fill-color", "#1a2744");
      }
      // Brighten land/background
      if (map.getLayer("background")) {
        map.setPaintProperty("background", "background-color", "#1c1c28");
      }
      // Brighten roads
      for (const layer of map.getStyle().layers || []) {
        const id = layer.id;
        // Road fills — make them lighter
        if (
          id.includes("road") ||
          id.includes("street") ||
          id.includes("highway") ||
          id.includes("trunk") ||
          id.includes("motorway")
        ) {
          if (layer.type === "line") {
            try {
              map.setPaintProperty(id, "line-color", "#3a3a50");
            } catch {}
          }
        }
        // Building fills
        if (id.includes("building")) {
          if (layer.type === "fill") {
            try {
              map.setPaintProperty(id, "fill-color", "#262638");
            } catch {}
          }
        }
        // Park/green areas — subtle teal tint
        if (
          id.includes("park") ||
          id.includes("green") ||
          id.includes("grass") ||
          id.includes("garden")
        ) {
          if (layer.type === "fill") {
            try {
              map.setPaintProperty(id, "fill-color", "#1a2e2a");
            } catch {}
          }
        }
        // Labels — make them brighter and more readable
        if (layer.type === "symbol") {
          try {
            map.setPaintProperty(id, "text-color", "#b0b0c8");
          } catch {}
          try {
            map.setPaintProperty(id, "text-halo-color", "#0e0e18");
          } catch {}
          try {
            map.setPaintProperty(id, "text-halo-width", 1.5);
          } catch {}
        }
      }

      // Add building/POI name labels from the vector tile source
      const style = map.getStyle();
      const styleSources = style.sources || {};
      // Find the first vector source in the style
      const vectorSourceId = Object.keys(styleSources).find(
        (k) => (styleSources[k] as { type: string }).type === "vector"
      );

      if (vectorSourceId) {
        // House/building numbers — visible when zoomed in
        map.addLayer({
          id: "housenumber-labels",
          type: "symbol",
          source: vectorSourceId,
          "source-layer": "housenumber",
          minzoom: 17,
          layout: {
            "text-field": ["get", "housenumber"],
            "text-size": 9,
            "text-anchor": "center",
            "text-allow-overlap": false,
            "text-ignore-placement": false,
          },
          paint: {
            "text-color": "#8888a8",
            "text-halo-color": "#12121e",
            "text-halo-width": 1,
          },
        });

        // POI labels — shops, restaurants, landmarks, buildings with names
        map.addLayer({
          id: "poi-labels",
          type: "symbol",
          source: vectorSourceId,
          "source-layer": "poi",
          minzoom: 15,
          layout: {
            "text-field": ["coalesce", ["get", "name:en"], ["get", "name"]],
            "text-size": ["interpolate", ["linear"], ["zoom"], 15, 10, 18, 13],
            "text-anchor": "top",
            "text-offset": [0, 0.5],
            "text-max-width": 8,
            "text-allow-overlap": false,
            "text-optional": true,
          },
          paint: {
            "text-color": "#c8c8e0",
            "text-halo-color": "#12121e",
            "text-halo-width": 1.2,
            "text-opacity": ["interpolate", ["linear"], ["zoom"], 15, 0.7, 17, 1],
          },
        });

        // Water body names (rivers, lakes)
        map.addLayer({
          id: "water-name-labels",
          type: "symbol",
          source: vectorSourceId,
          "source-layer": "water_name",
          minzoom: 12,
          layout: {
            "text-field": ["coalesce", ["get", "name:en"], ["get", "name"]],
            "text-size": ["interpolate", ["linear"], ["zoom"], 12, 10, 16, 14],
            "text-font": ["Open Sans Italic"],
            "text-max-width": 10,
            "text-allow-overlap": false,
          },
          paint: {
            "text-color": "#5588aa",
            "text-halo-color": "#0e1a28",
            "text-halo-width": 1,
          },
        });

        // Road/street names
        map.addLayer({
          id: "road-name-labels",
          type: "symbol",
          source: vectorSourceId,
          "source-layer": "transportation_name",
          minzoom: 14,
          layout: {
            "text-field": ["coalesce", ["get", "name:en"], ["get", "name"]],
            "text-size": ["interpolate", ["linear"], ["zoom"], 14, 9, 18, 12],
            "symbol-placement": "line",
            "text-rotation-alignment": "map",
            "text-max-angle": 30,
            "text-allow-overlap": false,
          },
          paint: {
            "text-color": "#7878a0",
            "text-halo-color": "#12121e",
            "text-halo-width": 1.2,
          },
        });

        // Mountain peaks (relevant for Bishkek area near mountains)
        map.addLayer({
          id: "mountain-peak-labels",
          type: "symbol",
          source: vectorSourceId,
          "source-layer": "mountain_peak",
          minzoom: 12,
          layout: {
            "text-field": [
              "concat",
              ["coalesce", ["get", "name:en"], ["get", "name"]],
              ["case", ["has", "ele"], ["concat", "\n", ["get", "ele"], "m"], ""],
            ],
            "text-size": 10,
            "text-anchor": "top",
            "text-offset": [0, 0.3],
            "text-allow-overlap": false,
          },
          paint: {
            "text-color": "#aa9988",
            "text-halo-color": "#12121e",
            "text-halo-width": 1,
          },
        });
      }
    });

    // Fit to Bishkek bounds on load
    map.once("load", () => {
      map.fitBounds(
        [
          [74.46, 42.82],
          [74.74, 42.94],
        ], // [sw, ne] as [lng, lat]
        { padding: window.innerWidth < 640 ? 20 : 40, duration: 0 }
      );
    });

    // Bishkek border GeoJSON
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

        let allRings: number[][][] = [];
        if (geojson.type === "Polygon") {
          allRings = geojson.coordinates as number[][][];
        } else {
          allRings = (geojson.coordinates as number[][][][]).map((poly) => poly[0]);
        }
        const largestRing = allRings.reduce(
          (best, ring) => (ring.length > best.length ? ring : best),
          allRings[0]
        );
        setBishkekRing(largestRing as [number, number][]);

        // Add border layer after map style loads
        const addBorder = () => {
          if (map.getSource("bishkek-border")) return;
          map.addSource("bishkek-border", {
            type: "geojson",
            data: {
              type: "Feature",
              geometry: { type: "Polygon", coordinates: [largestRing] },
              properties: {},
            },
          });
          map.addLayer({
            id: "bishkek-border-line",
            type: "line",
            source: "bishkek-border",
            paint: {
              "line-color": "#ef4444",
              "line-width": 2.5,
              "line-opacity": 0.9,
            },
          });
        };

        if (map.isStyleLoaded()) addBorder();
        else map.once("load", addBorder);
      })
      .catch(() => {});

    // Overlay positioning — fires on every render frame, perfectly in sync
    map.on("render", () => {
      if (!mounted) return;
      reposition();
    });

    map.on("click", () => setHoveredId(null));

    mapRef.current = map;
    if (mounted) setOverlayReady(true);

    return () => {
      mounted = false;
      map.remove();
      mapRef.current = null;
    };
  }, [reposition]);

  // Re-position when rooms change
  useEffect(() => {
    reposition();
  }, [rooms, reposition]);

  const fitToRoom = (lat: number, lng: number) => {
    const map = mapRef.current;
    if (!map) return;
    const d = 0.0015;
    map.fitBounds(
      [
        [lng - d, lat - d],
        [lng + d, lat + d],
      ],
      { duration: 300 }
    );
  };

  return (
    <div
      style={{ position: "relative", flex: 1, overflow: "hidden" }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div
        ref={containerRef}
        style={{ position: "absolute", inset: 0, background: "#1a1a2e", zIndex: 0 }}
      />

      {/* Room markers overlay — must sit above MapLibre's canvas */}
      <div
        ref={overlayRef}
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          zIndex: 1,
          overflow: "hidden",
        }}
      />

      {/* ── Placing mode ── */}
      {placing && (
        <>
          <div
            style={{
              position: "absolute",
              top: 16,
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 800,
              pointerEvents: "none",
              whiteSpace: "nowrap",
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-black/90 text-white rounded-full shadow-xl text-sm font-medium border border-white/15"
          >
            <span>{t("map.placingInstruction")}</span>
          </div>

          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -100%)",
              zIndex: 800,
              pointerEvents: "none",
            }}
          >
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
            <svg width="36" height="44" viewBox="0 0 36 44" fill="none">
              <path
                d="M18 0C8.06 0 0 8.06 0 18c0 13.5 18 26 18 26s18-12.5 18-26C36 8.06 27.94 0 18 0z"
                fill="white"
              />
              <circle cx="18" cy="18" r="7" fill="black" />
            </svg>
          </div>

          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              zIndex: 800,
              bottom: 0,
              display: "flex",
              gap: 12,
              padding: "12px 20px",
              paddingBottom: "max(20px, env(safe-area-inset-bottom, 0px) + 12px)",
              background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%)",
            }}
          >
            <button
              onClick={() => setPlacing(false)}
              style={{ touchAction: "manipulation" }}
              className="flex-1 py-3.5 rounded-2xl text-sm font-medium bg-white/10 text-white border border-white/15 active:bg-white/20"
            >
              {t("map.cancel")}
            </button>
            <button
              onClick={() => {
                const map = mapRef.current;
                if (!map) return;
                const center = map.getCenter();
                const lat = center.lat,
                  lng = center.lng;
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
              {t("map.placeHere")}
            </button>
          </div>

          {outOfBounds && (
            <div
              style={{
                position: "absolute",
                top: 64,
                left: "50%",
                transform: "translateX(-50%)",
                zIndex: 900,
                pointerEvents: "none",
                whiteSpace: "nowrap",
              }}
              className="px-4 py-2 bg-red-500 text-white rounded-full shadow-xl text-sm font-medium"
            >
              {t("map.outsideBishkek")}
            </div>
          )}
        </>
      )}

      {/* Rooms panel */}
      {showPanel && (
        <>
          <div
            className="fixed inset-0 bg-black/40 sm:hidden"
            style={{ zIndex: 599 }}
            onClick={() => {
              setShowPanel(false);
              setSearch("");
            }}
          />
          <div
            className={`fixed sm:absolute left-0 right-0 sm:left-auto sm:right-4 sm:w-[300px] sm:max-h-[calc(100%-32px)] sm:bottom-4 bg-zinc-950 border border-white/10 shadow-2xl flex flex-col overflow-hidden transition-all duration-300 ease-out pb-[72px] sm:pb-0 ${
              searchFocused
                ? "top-0 bottom-0 rounded-none sm:rounded-2xl"
                : "bottom-0 max-h-[70vh] rounded-t-2xl sm:rounded-2xl"
            }`}
            style={{ zIndex: 600 }}
          >
            <div className="flex justify-center pt-3 pb-1 sm:hidden">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>

            <div className="px-4 pt-3 pb-2 border-b border-white/10 shrink-0 flex items-center justify-between">
              <p className="text-white text-sm font-semibold">
                {rooms.length} {t("room.count")}
              </p>
              <button
                onClick={() => {
                  setShowPanel(false);
                  setSearch("");
                }}
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

            <div className="overflow-y-auto flex-1" style={{ scrollbarWidth: "thin" }}>
              {rooms
                .filter((r) => !search || r.topic.toLowerCase().includes(search.toLowerCase()))
                .map((room) => {
                  const full = room.people.length >= room.maxPeople;
                  return (
                    <button
                      key={room.id}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        searchRef.current?.blur();
                        fitToRoom(room.lat, room.lng);
                        setSearch("");
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
                        {room.mode && ROOM_MODES_MAP[room.mode] && (
                          <span className="text-white/30 text-[9px]">
                            {ROOM_MODES_MAP[room.mode].emoji} {ROOM_MODES_MAP[room.mode].label}
                          </span>
                        )}
                        <p className="text-white text-xs font-medium leading-snug truncate">
                          {search ? highlightMatch(room.topic, search) : room.topic}
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

      {/* Rooms via portal */}
      {overlayReady &&
        overlayRef.current &&
        createPortal(
          <>
            {rooms.map((room, roomIdx) => {
              if (room.lat == null || room.lng == null) return null;
              if (bishkekRing && !pointInPolygon(room.lat, room.lng, bishkekRing)) return null;
              const isActive = hoveredId === room.id;
              const isPreviewing = previewingRoomId === room.id;
              return (
                <div
                  key={room.id}
                  data-lat={room.lat}
                  data-lng={room.lng}
                  {...(roomIdx === 0 ? { "data-tour": "room-card" } : {})}
                  style={{ position: "absolute", left: 0, top: 0, willChange: "transform" }}
                >
                  <div
                    style={{
                      transform: showCards ? "translate(-8px, -100%)" : "translate(-50%, -50%)",
                      zIndex: isActive ? 20 : 10,
                      pointerEvents: "auto",
                      position: "relative",
                    }}
                    onMouseEnter={() => setHoveredId(room.id)}
                    onMouseLeave={() => setHoveredId(null)}
                  >
                    {showCards ? (
                      <div style={{ width: 170 }}>
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
                              bottom: 10,
                              left: "50%",
                              transform: "translateX(-8px)",
                              width: 170,
                              paddingBottom: 6,
                              zIndex: 20,
                              pointerEvents: "none",
                            }}
                          >
                            <div style={{ pointerEvents: "auto" }}>
                              <RoomCard
                                room={room}
                                onJoin={() => onJoin(room.id)}
                                onPreview={() => onPreview?.(room.id)}
                                isPreviewing={previewingRoomId === room.id}
                                t={t}
                              />
                            </div>
                          </div>
                        )}
                        <div
                          onClick={() => {
                            setHoveredId(room.id);
                            fitToRoom(room.lat, room.lng);
                          }}
                          style={{
                            width: 28,
                            height: 28,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                            position: "relative",
                            pointerEvents: "auto",
                          }}
                        >
                          <div
                            className="gps-pulse"
                            style={{ "--pulse-color": room.color } as React.CSSProperties}
                          />
                          <div
                            className="gps-pulse gps-pulse-2"
                            style={{ "--pulse-color": room.color } as React.CSSProperties}
                          />
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
                </div>
              );
            })}
          </>,
          overlayRef.current
        )}
    </div>
  );
}
