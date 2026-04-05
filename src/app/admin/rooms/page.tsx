"use client";

import { useEffect, useState, useCallback } from "react";
import { Separator } from "@/components/ui/separator";
import { RefreshButton } from "@/components/admin/refresh-button";
import { PageLoader } from "@/components/admin/page-loader";

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

function timeAgo(ts: number) {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

export default function AdminRoomsPage() {
  const [rooms, setRooms] = useState<RoomData[]>([]);
  const [seedCount, setSeedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchRooms = useCallback(async () => {
    try {
      setError("");
      const res = await fetch("/api/admin/stats");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setRooms(data.realRooms);
      setSeedCount(data.seedRoomCount);
    } catch {
      setError("Could not reach WS server");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRooms();
    const interval = setInterval(fetchRooms, 10000);
    return () => clearInterval(interval);
  }, [fetchRooms]);

  if (loading) {
    return <PageLoader text="Loading rooms..." />;
  }

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold">Rooms</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {rooms.length} real rooms &middot; {seedCount} seed rooms &middot; auto-refresh 10s
          </p>
        </div>
        <RefreshButton onRefresh={fetchRooms} />
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-3 text-destructive text-sm mb-6">
          {error}
        </div>
      )}

      {rooms.length === 0 ? (
        <div className="text-muted-foreground text-sm py-12 text-center">
          No real rooms active right now
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="border-b border-border text-muted-foreground text-xs text-left">
                <th className="px-4 py-3 font-medium w-8"></th>
                <th className="px-4 py-3 font-medium">Topic</th>
                <th className="px-4 py-3 font-medium">Mode</th>
                <th className="px-4 py-3 font-medium">Host</th>
                <th className="px-4 py-3 font-medium">People</th>
                <th className="px-4 py-3 font-medium">Capacity</th>
                <th className="px-4 py-3 font-medium">Language</th>
                <th className="px-4 py-3 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {rooms.map((room) => (
                <tr
                  key={room.id}
                  className="border-b border-border last:border-0 hover:bg-accent/30 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: room.color }}
                    />
                  </td>
                  <td className="px-4 py-3 font-medium">{room.topic}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded">
                      {room.mode}
                    </span>
                  </td>
                  <td className="px-4 py-3">{room.hostName}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {room.people.map((p) => p.name).join(", ")}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        room.people.length >= room.maxPeople
                          ? "text-destructive"
                          : "text-muted-foreground"
                      }
                    >
                      {room.people.length}/{room.maxPeople}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground uppercase text-xs">{room.lang}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {timeAgo(room.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Separator className="my-8" />

      <div className="text-xs text-muted-foreground">
        Seed rooms ({seedCount}) are simulated and not shown here. Only user-created rooms appear
        above.
      </div>
    </div>
  );
}
