"use client";

import { useEffect, useState, useCallback } from "react";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

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

function timeAgo(ts: number) {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchStats = useCallback(async () => {
    try {
      setError("");
      const res = await fetch("/api/admin/stats");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setStats(data);
    } catch {
      setError("Could not reach WS server");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  if (loading) {
    return <div className="p-8 text-muted-foreground text-sm">Loading stats...</div>;
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-3 text-destructive text-sm">
          {error}
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const activeUsers = stats.realUsers.filter((u) => u.connected);
  const usersInRooms = stats.realUsers.filter((u) => u.roomId);

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold">Dashboard</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Live server stats (auto-refresh 10s)
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchStats}>
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          Refresh
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <StatCard label="Real Users" value={activeUsers.length} />
        <StatCard label="In Rooms" value={usersInRooms.length} />
        <StatCard label="Real Rooms" value={stats.realRooms.length} />
        <StatCard label="Seed Rooms" value={stats.seedRoomCount} sub="simulated" />
      </div>

      <Separator className="mb-8" />

      {/* Active rooms */}
      <div className="mb-8">
        <h3 className="text-base font-medium mb-4">
          Active rooms
          {stats.realRooms.length === 0 && (
            <span className="text-muted-foreground font-normal text-sm ml-2">none right now</span>
          )}
        </h3>

        {stats.realRooms.length > 0 && (
          <div className="space-y-3">
            {stats.realRooms.map((room) => (
              <div
                key={room.id}
                className="bg-card border border-border rounded-lg p-4 flex items-start justify-between gap-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: room.color }}
                    />
                    <span className="font-medium text-sm truncate">{room.topic}</span>
                    <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">
                      {room.mode}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Host: {room.hostName} &middot; {room.people.map((p) => p.name).join(", ")}{" "}
                    &middot; {timeAgo(room.createdAt)}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground shrink-0">
                  {room.people.length}/{room.maxPeople}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Separator className="mb-8" />

      {/* Connected users */}
      <div>
        <h3 className="text-base font-medium mb-4">
          Connected users
          {activeUsers.length === 0 && (
            <span className="text-muted-foreground font-normal text-sm ml-2">none right now</span>
          )}
        </h3>

        {activeUsers.length > 0 && (
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground text-xs text-left">
                  <th className="px-4 py-2.5 font-medium">Name</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium">Room</th>
                </tr>
              </thead>
              <tbody>
                {activeUsers.map((user) => {
                  const room = user.roomId
                    ? stats.realRooms.find((r) => r.id === user.roomId)
                    : null;
                  return (
                    <tr key={user.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-2.5 font-medium">{user.name}</td>
                      <td className="px-4 py-2.5">
                        {user.roomId ? (
                          <span className="text-green-400 text-xs">in room</span>
                        ) : (
                          <span className="text-muted-foreground text-xs">browsing</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground text-xs truncate max-w-[200px]">
                        {room ? room.topic : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">
        {label}
        {sub && <span className="text-muted-foreground/50 ml-1">({sub})</span>}
      </p>
    </div>
  );
}
