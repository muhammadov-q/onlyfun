"use client";

import { useEffect, useState, useCallback } from "react";
import { RefreshButton } from "@/components/admin/refresh-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  MessageSquare,
  Newspaper,
  Calendar,
  Activity,
  WifiOff,
  TrendingUp,
  Radio,
  Loader2,
} from "lucide-react";
import { PageLoader } from "@/components/admin/page-loader";

/* ─── Types ─── */

interface RoomData {
  id: string;
  topic: string;
  mode: string;
  hostName: string;
  people: { id: string; name: string }[];
  maxPeople: number;
  color: string;
  createdAt: number;
  lang: string;
}

interface UserData {
  id: string;
  name: string;
  roomId: string | null;
  connected: boolean;
}

interface Stats {
  realRooms: RoomData[];
  realUsers: UserData[];
  seedRoomCount: number;
  totalRooms: number;
  totalConnections: number;
}

interface NewsRow {
  id: string;
  visible: boolean;
  created_at: string;
}

interface EventRow {
  id: string;
  visible: boolean;
  title: string;
  date_text: string | null;
  venue: string | null;
  created_at: string;
}

/* ─── Helpers ─── */

function timeAgo(ts: number | string) {
  const time = typeof ts === "string" ? new Date(ts).getTime() : ts;
  const diff = Math.floor((Date.now() - time) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

/* ─── Main ─── */

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [news, setNews] = useState<NewsRow[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [wsStatus, setWsStatus] = useState<"ok" | "down">("ok");

  const fetchAll = useCallback(async () => {
    const results = await Promise.allSettled([
      fetch("/api/admin/stats").then((r) => (r.ok ? r.json() : Promise.reject())),
      fetch("/api/admin/news").then((r) => (r.ok ? r.json() : Promise.reject())),
      fetch("/api/admin/events").then((r) => (r.ok ? r.json() : Promise.reject())),
    ]);

    if (results[0].status === "fulfilled") {
      setStats(results[0].value);
      setWsStatus("ok");
      setError("");
    } else {
      setWsStatus("down");
      setError("WebSocket server unreachable");
    }

    if (results[1].status === "fulfilled") {
      setNews(results[1].value.items ?? []);
    }

    if (results[2].status === "fulfilled") {
      setEvents(results[2].value.items ?? []);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 15000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  if (loading) {
    return <PageLoader text="Loading dashboard..." />;
  }

  const activeUsers = stats?.realUsers.filter((u) => u.connected) ?? [];
  const usersInRooms = activeUsers.filter((u) => u.roomId);
  const browsing = activeUsers.filter((u) => !u.roomId);
  const roomOccupancy =
    stats && stats.realRooms.length > 0
      ? Math.round(
          (stats.realRooms.reduce((sum, r) => sum + r.people.length, 0) /
            stats.realRooms.reduce((sum, r) => sum + r.maxPeople, 0)) *
            100
        )
      : 0;
  const visibleNews = news.filter((n) => n.visible).length;
  const visibleEvents = events.filter((e) => e.visible).length;

  // Mode distribution
  const modeMap: Record<string, number> = {};
  stats?.realRooms.forEach((r) => {
    modeMap[r.mode] = (modeMap[r.mode] || 0) + 1;
  });
  const modes = Object.entries(modeMap).sort((a, b) => b[1] - a[1]);

  // Language distribution
  const langMap: Record<string, number> = {};
  stats?.realRooms.forEach((r) => {
    const l = r.lang?.toUpperCase() || "?";
    langMap[l] = (langMap[l] || 0) + 1;
  });
  const langs = Object.entries(langMap).sort((a, b) => b[1] - a[1]);

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Dashboard</h2>
          <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-2">
            Live overview
            <span className="flex items-center gap-1">
              {wsStatus === "ok" ? (
                <>
                  <span className="relative flex size-2">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
                  </span>
                  <span className="text-emerald-400 text-xs">Live</span>
                </>
              ) : (
                <>
                  <WifiOff className="size-3 text-red-400" />
                  <span className="text-red-400 text-xs">Disconnected</span>
                </>
              )}
            </span>
          </p>
        </div>
        <RefreshButton onRefresh={fetchAll} />
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Stat cards row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          label="Online Users"
          value={activeUsers.length}
          detail={`${usersInRooms.length} in rooms, ${browsing.length} browsing`}
          color="text-blue-400"
          bg="bg-blue-500/10"
        />
        <StatCard
          icon={MessageSquare}
          label="Active Rooms"
          value={stats?.realRooms.length ?? 0}
          detail={`${stats?.seedRoomCount ?? 0} seed rooms`}
          color="text-violet-400"
          bg="bg-violet-500/10"
        />
        <StatCard
          icon={Newspaper}
          label="News Items"
          value={news.length}
          detail={`${visibleNews} visible`}
          color="text-amber-400"
          bg="bg-amber-500/10"
        />
        <StatCard
          icon={Calendar}
          label="Events"
          value={events.length}
          detail={`${visibleEvents} visible`}
          color="text-emerald-400"
          bg="bg-emerald-500/10"
        />
      </div>

      {/* Second row: occupancy + breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Room occupancy */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="size-4 text-muted-foreground" />
              Room Occupancy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-3 mb-3">
              <span className="text-3xl font-bold">{roomOccupancy}%</span>
              <span className="text-xs text-muted-foreground mb-1">filled capacity</span>
            </div>
            <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-emerald-500 to-emerald-400"
                style={{ width: `${Math.max(roomOccupancy, 2)}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-muted-foreground mt-1.5">
              <span>
                {stats?.realRooms.reduce((sum, r) => sum + r.people.length, 0) ?? 0} people
              </span>
              <span>{stats?.realRooms.reduce((sum, r) => sum + r.maxPeople, 0) ?? 0} max</span>
            </div>
          </CardContent>
        </Card>

        {/* Mode distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Radio className="size-4 text-muted-foreground" />
              Room Modes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {modes.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">No active rooms</p>
            ) : (
              <div className="space-y-2.5">
                {modes.map(([mode, count]) => {
                  const pct =
                    stats && stats.realRooms.length > 0
                      ? Math.round((count / stats.realRooms.length) * 100)
                      : 0;
                  return (
                    <div key={mode}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm capitalize">{mode}</span>
                        <span className="text-xs text-muted-foreground">
                          {count} ({pct}%)
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-violet-500/70 transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Language distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="size-4 text-muted-foreground" />
              Languages
            </CardTitle>
          </CardHeader>
          <CardContent>
            {langs.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">No active rooms</p>
            ) : (
              <div className="space-y-2.5">
                {langs.map(([lang, count]) => {
                  const pct =
                    stats && stats.realRooms.length > 0
                      ? Math.round((count / stats.realRooms.length) * 100)
                      : 0;
                  return (
                    <div key={lang}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm">{lang}</span>
                        <span className="text-xs text-muted-foreground">
                          {count} ({pct}%)
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-amber-500/70 transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom row: live rooms + recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Live rooms */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Live Rooms</CardTitle>
              <Badge variant="outline" className="text-[11px] text-muted-foreground">
                {stats?.realRooms.length ?? 0} active
              </Badge>
            </div>
            <CardDescription>Currently active conversations</CardDescription>
          </CardHeader>
          <CardContent>
            {!stats?.realRooms.length ? (
              <div className="text-sm text-muted-foreground py-6 text-center">
                No rooms active right now
              </div>
            ) : (
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {stats.realRooms.map((room) => (
                  <div
                    key={room.id}
                    className="flex items-start gap-3 p-3 rounded-xl bg-muted/30 border border-border/30"
                  >
                    <div
                      className="size-3 rounded-full mt-1 shrink-0"
                      style={{ backgroundColor: room.color }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-medium truncate">{room.topic}</span>
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">
                          {room.mode}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground uppercase shrink-0">
                          {room.lang}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>
                          {room.people.length}/{room.maxPeople} people
                        </span>
                        <span>&middot;</span>
                        <span>{room.hostName}</span>
                        <span>&middot;</span>
                        <span>{timeAgo(room.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming events */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Upcoming Events</CardTitle>
              <Badge variant="outline" className="text-[11px] text-muted-foreground">
                {visibleEvents} visible
              </Badge>
            </div>
            <CardDescription>From the events feed</CardDescription>
          </CardHeader>
          <CardContent>
            {events.length === 0 ? (
              <div className="text-sm text-muted-foreground py-6 text-center">
                No events scraped yet
              </div>
            ) : (
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {events
                  .filter((e) => e.visible)
                  .slice(0, 8)
                  .map((event) => (
                    <div
                      key={event.id}
                      className="flex items-start gap-3 p-3 rounded-xl bg-muted/30 border border-border/30"
                    >
                      <div className="p-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 shrink-0 mt-0.5">
                        <Calendar className="size-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{event.title}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          {event.venue && (
                            <>
                              <span className="truncate max-w-[140px]">{event.venue}</span>
                              <span>&middot;</span>
                            </>
                          )}
                          <span className="truncate">{event.date_text || "No date"}</span>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* ─── Stat Card ─── */

function StatCard({
  icon: Icon,
  label,
  value,
  detail,
  color,
  bg,
}: {
  icon: typeof Users;
  label: string;
  value: number;
  detail: string;
  color: string;
  bg: string;
}) {
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-3xl font-bold mt-1">{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{detail}</p>
          </div>
          <div className={`p-2.5 rounded-xl ${bg}`}>
            <Icon className={`size-5 ${color}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
