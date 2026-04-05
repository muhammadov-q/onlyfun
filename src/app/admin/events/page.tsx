"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RefreshCw, Eye, EyeOff, Trash2, ExternalLink, Pencil, X, Check, Zap } from "lucide-react";

interface EventRow {
  id: string;
  source: string;
  source_url: string;
  title: string;
  price: string | null;
  date_text: string | null;
  venue: string | null;
  category: string | null;
  mode_suggestion: string;
  visible: boolean;
  created_at: string;
}

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function AdminEventsPage() {
  const [items, setItems] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<EventRow>>({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [scraping, setScraping] = useState(false);

  const fetchItems = useCallback(async () => {
    try {
      setError("");
      const res = await fetch("/api/admin/events");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setItems(data.items ?? []);
    } catch {
      setError("Failed to load events");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const allSelected = items.length > 0 && selected.size === items.length;

  function toggleSelectAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(items.map((i) => i.id)));
    }
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function bulkDelete() {
    if (selected.size === 0) return;
    if (!confirm(`Delete ${selected.size} event(s) permanently?`)) return;
    setDeleting(true);
    await fetch("/api/admin/events", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: Array.from(selected) }),
    });
    setItems((prev) => prev.filter((i) => !selected.has(i.id)));
    setSelected(new Set());
    setDeleting(false);
  }

  async function toggleVisibility(id: string, visible: boolean) {
    await fetch("/api/admin/events", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, visible }),
    });
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, visible } : i)));
  }

  async function deleteItem(id: string) {
    if (!confirm("Delete this event permanently?")) return;
    await fetch("/api/admin/events", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setItems((prev) => prev.filter((i) => i.id !== id));
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  function startEdit(item: EventRow) {
    setEditingId(item.id);
    setEditForm({
      title: item.title,
      venue: item.venue,
      date_text: item.date_text,
      price: item.price,
      category: item.category,
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm({});
  }

  async function saveEdit() {
    if (!editingId) return;
    setSaving(true);
    await fetch("/api/admin/events", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editingId, ...editForm }),
    });
    setItems((prev) =>
      prev.map((i) =>
        i.id === editingId
          ? {
              ...i,
              title: editForm.title ?? i.title,
              venue: editForm.venue ?? i.venue,
              date_text: editForm.date_text ?? i.date_text,
              price: editForm.price ?? i.price,
              category: editForm.category ?? i.category,
            }
          : i
      )
    );
    setEditingId(null);
    setEditForm({});
    setSaving(false);
  }

  if (loading) {
    return <div className="p-8 text-muted-foreground text-sm">Loading events...</div>;
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold">Events Feed</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {items.length} items &middot; {items.filter((i) => i.visible).length} visible
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
          <Button
            variant="outline"
            size="sm"
            disabled={scraping}
            onClick={async () => {
              setScraping(true);
              setError("");
              try {
                const res = await fetch("/api/admin/events", { method: "POST" });
                if (!res.ok) throw new Error();
                await fetchItems();
              } catch {
                setError("Scrape failed");
              } finally {
                setScraping(false);
              }
            }}
          >
            <Zap className="h-3.5 w-3.5 mr-1.5" />
            {scraping ? "Scraping..." : "Scrape Now"}
          </Button>
          <Button variant="outline" size="sm" onClick={fetchItems}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-3 text-destructive text-sm mb-6">
          {error}
        </div>
      )}

      {/* Edit modal */}
      {editingId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={cancelEdit}
        >
          <div
            className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md mx-4 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Edit Event</h3>
              <button onClick={cancelEdit} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Title</label>
                <Input
                  value={editForm.title ?? ""}
                  onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Venue</label>
                <Input
                  value={editForm.venue ?? ""}
                  onChange={(e) => setEditForm((f) => ({ ...f, venue: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Date</label>
                <Input
                  value={editForm.date_text ?? ""}
                  onChange={(e) => setEditForm((f) => ({ ...f, date_text: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Price</label>
                  <Input
                    value={editForm.price ?? ""}
                    onChange={(e) => setEditForm((f) => ({ ...f, price: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Category</label>
                  <Input
                    value={editForm.category ?? ""}
                    onChange={(e) => setEditForm((f) => ({ ...f, category: e.target.value }))}
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <Button variant="outline" size="sm" onClick={cancelEdit}>
                Cancel
              </Button>
              <Button size="sm" onClick={saveEdit} disabled={saving}>
                <Check className="h-3.5 w-3.5 mr-1.5" />
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <div className="text-muted-foreground text-sm py-12 text-center">
          No events in database yet. Events will appear after the first scrape.
        </div>
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
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
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Venue</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Price</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item.id}
                  className={`border-b border-border last:border-0 hover:bg-accent/30 transition-colors ${
                    !item.visible ? "opacity-50" : ""
                  } ${selected.has(item.id) ? "bg-accent/20" : ""}`}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(item.id)}
                      onChange={() => toggleSelect(item.id)}
                      className="rounded border-border"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block w-2 h-2 rounded-full ${
                        item.visible ? "bg-green-500" : "bg-muted-foreground"
                      }`}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium truncate max-w-[200px]">{item.title}</div>
                    <a
                      href={item.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mt-0.5"
                    >
                      iticket
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs truncate max-w-[140px]">
                    {item.venue || "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs truncate max-w-[160px]">
                    {item.date_text || "—"}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {item.price ? (
                      <span className="text-green-400">{item.price}</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {item.category ? (
                      <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded">
                        {item.category}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {timeAgo(item.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => startEdit(item)}
                        title="Edit"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => toggleVisibility(item.id, !item.visible)}
                        title={item.visible ? "Hide" : "Show"}
                      >
                        {item.visible ? (
                          <EyeOff className="h-3.5 w-3.5" />
                        ) : (
                          <Eye className="h-3.5 w-3.5" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                        onClick={() => deleteItem(item.id)}
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
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
