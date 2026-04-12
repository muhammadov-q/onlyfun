"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Trash2, MessageSquare, Pencil, Check, X } from "lucide-react";
import { RefreshButton } from "@/components/admin/refresh-button";
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

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminPodcastPage() {
  const [items, setItems] = useState<MessageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [editing, setEditing] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editMessage, setEditMessage] = useState("");
  const [saving, setSaving] = useState(false);

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
      setItems((prev) => prev.filter((i) => !selected.has(i.id)));
      setSelected(new Set());
    } catch {
      toast.error("Delete failed");
    } finally {
      setDeleting(false);
    }
  }

  async function deleteItem(id: number) {
    if (!confirm("Delete this message permanently?")) return;
    try {
      const res = await fetch("/api/admin/podcast", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error();
      toast.success("Message deleted");
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

  function startEdit(item: MessageRow) {
    setEditing(item.id);
    setEditName(item.name);
    setEditMessage(item.message);
  }

  function cancelEdit() {
    setEditing(null);
    setEditName("");
    setEditMessage("");
  }

  async function saveEdit() {
    if (!editing) return;
    const name = editName.trim();
    const message = editMessage.trim();
    if (!name || !message) {
      toast.error("Name and message cannot be empty");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/podcast", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editing, name, message }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (data.item) {
        setItems((prev) => prev.map((i) => (i.id === editing ? data.item : i)));
      }
      toast.success("Message updated");
      setEditing(null);
    } catch {
      toast.error("Update failed");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <PageLoader />;

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold">Podcast Messages</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {items.length} message{items.length !== 1 ? "s" : ""} &middot; Auto-deletes after 7 days
            {selected.size > 0 && ` · ${selected.size} selected`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <Button variant="destructive" size="sm" onClick={bulkDelete} disabled={deleting}>
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              Delete {selected.size}
            </Button>
          )}
          <RefreshButton onRefresh={fetchItems} />
        </div>
      </div>

      {items.length === 0 ? (
        <div className="text-muted-foreground text-sm py-12 text-center">
          <MessageSquare className="w-8 h-8 mx-auto mb-3 opacity-30" />
          No podcast messages yet. Messages from users will appear here.
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="border-b border-border text-muted-foreground text-xs text-left">
                <th className="px-4 py-3 font-medium">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    className="rounded border-border"
                  />
                </th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Message</th>
                <th className="px-4 py-3 font-medium">Posted</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item.id}
                  className={`border-b border-border last:border-0 hover:bg-accent/30 transition-colors ${
                    selected.has(item.id) ? "bg-accent/20" : ""
                  }`}
                >
                  <td className="px-4 py-3 align-top">
                    <input
                      type="checkbox"
                      checked={selected.has(item.id)}
                      onChange={() => toggleSelect(item.id)}
                      className="rounded border-border"
                    />
                  </td>
                  <td className="px-4 py-3 align-top">
                    {editing === item.id ? (
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value.slice(0, 30))}
                        className="w-full bg-background border border-border rounded-md px-2 py-1 text-sm outline-none focus:border-ring"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveEdit();
                          if (e.key === "Escape") cancelEdit();
                        }}
                      />
                    ) : (
                      <span className="font-medium">{item.name}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 align-top max-w-md">
                    {editing === item.id ? (
                      <div>
                        <textarea
                          value={editMessage}
                          onChange={(e) => setEditMessage(e.target.value.slice(0, 280))}
                          rows={3}
                          className="w-full bg-background border border-border rounded-md px-2 py-1 text-sm outline-none focus:border-ring resize-none"
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && e.metaKey) saveEdit();
                            if (e.key === "Escape") cancelEdit();
                          }}
                        />
                        <span className="text-[10px] text-muted-foreground/50">
                          {editMessage.length}/280
                        </span>
                      </div>
                    ) : (
                      <p
                        className={`text-muted-foreground cursor-pointer ${
                          expanded === item.id ? "" : "line-clamp-2"
                        }`}
                        onClick={() => setExpanded(expanded === item.id ? null : item.id)}
                        title="Click to expand"
                      >
                        {item.message}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 align-top whitespace-nowrap">
                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground">
                        {timeAgo(item.created_at)}
                      </span>
                      <span className="text-[10px] text-muted-foreground/50">
                        {formatDate(item.created_at)}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top text-right">
                    {editing === item.id ? (
                      <div className="flex items-center gap-1 justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={saveEdit}
                          disabled={saving}
                          className="h-7 w-7 p-0 text-emerald-400 hover:text-emerald-300"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={cancelEdit}
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => startEdit(item)}
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteItem(item.id)}
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
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
