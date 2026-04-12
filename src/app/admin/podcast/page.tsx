"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { PageLoader } from "@/components/admin/page-loader";

interface MessageRow {
  id: number;
  name: string;
  message: string;
  created_at: string;
}

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function AdminPodcastPage() {
  const [items, setItems] = useState<MessageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [deleting, setDeleting] = useState(false);

  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/podcast");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setItems(data.items ?? []);
    } catch {
      toast.error("Failed to load messages");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const allSelected = items.length > 0 && selected.size === items.length;

  function toggleSelectAll() {
    setSelected(allSelected ? new Set() : new Set(items.map((i) => i.id)));
  }

  function toggleSelect(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function bulkDelete() {
    if (selected.size === 0) return;
    if (!confirm(`Delete ${selected.size} message(s) permanently?`)) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/admin/podcast", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selected) }),
      });
      if (!res.ok) throw new Error();
      toast.success(`Deleted ${selected.size} message(s)`);
      setSelected(new Set());
      fetchItems();
    } catch {
      toast.error("Delete failed");
    } finally {
      setDeleting(false);
    }
  }

  async function deleteSingle(id: number) {
    try {
      const res = await fetch("/api/admin/podcast", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error();
      toast.success("Deleted");
      setItems((prev) => prev.filter((i) => i.id !== id));
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } catch {
      toast.error("Delete failed");
    }
  }

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Podcast Messages</h1>
          <p className="text-sm text-white/50 mt-1">
            {items.length} message{items.length !== 1 ? "s" : ""} &middot; Auto-deletes after 7 days
          </p>
        </div>
        {selected.size > 0 && (
          <Button variant="destructive" size="sm" onClick={bulkDelete} disabled={deleting}>
            <Trash2 className="w-4 h-4 mr-1.5" />
            Delete {selected.size}
          </Button>
        )}
      </div>

      {/* Table */}
      {items.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-white/30 text-sm">No messages yet</p>
        </div>
      ) : (
        <div className="border border-white/10 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.02]">
                <th className="w-10 py-3 px-3">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    className="rounded border-white/20"
                  />
                </th>
                <th className="text-left py-3 px-3 text-white/40 font-medium">Name</th>
                <th className="text-left py-3 px-3 text-white/40 font-medium">Message</th>
                <th className="text-left py-3 px-3 text-white/40 font-medium w-24">Time</th>
                <th className="w-16 py-3 px-3" />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                >
                  <td className="py-3 px-3">
                    <input
                      type="checkbox"
                      checked={selected.has(item.id)}
                      onChange={() => toggleSelect(item.id)}
                      className="rounded border-white/20"
                    />
                  </td>
                  <td className="py-3 px-3">
                    <span className="text-white font-medium">{item.name}</span>
                  </td>
                  <td className="py-3 px-3">
                    <p className="text-white/60 truncate max-w-sm">{item.message}</p>
                  </td>
                  <td className="py-3 px-3">
                    <span className="text-white/30 text-xs">{timeAgo(item.created_at)}</span>
                  </td>
                  <td className="py-3 px-3">
                    <button
                      onClick={() => deleteSingle(item.id)}
                      className="p-1.5 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
