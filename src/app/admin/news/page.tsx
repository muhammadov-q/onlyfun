"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RefreshCw, Eye, EyeOff, Trash2, ExternalLink, Pencil, X, Check } from "lucide-react";

interface NewsRow {
  id: string;
  source: string;
  source_url: string;
  headline: string;
  headline_ru: string;
  line1: string;
  line1_ru: string;
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

export default function AdminNewsPage() {
  const [items, setItems] = useState<NewsRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<NewsRow>>({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchItems = useCallback(async () => {
    try {
      setError("");
      const res = await fetch("/api/admin/news");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setItems(data.items ?? []);
    } catch {
      setError("Failed to load news items");
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
    if (!confirm(`Delete ${selected.size} news item(s) permanently?`)) return;
    setDeleting(true);
    await fetch("/api/admin/news", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: Array.from(selected) }),
    });
    setItems((prev) => prev.filter((i) => !selected.has(i.id)));
    setSelected(new Set());
    setDeleting(false);
  }

  async function toggleVisibility(id: string, visible: boolean) {
    await fetch("/api/admin/news", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, visible }),
    });
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, visible } : i)));
  }

  async function deleteItem(id: string) {
    if (!confirm("Delete this news item permanently?")) return;
    await fetch("/api/admin/news", {
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

  function startEdit(item: NewsRow) {
    setEditingId(item.id);
    setEditForm({
      headline: item.headline,
      headline_ru: item.headline_ru,
      line1: item.line1,
      line1_ru: item.line1_ru,
      mode_suggestion: item.mode_suggestion,
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm({});
  }

  async function saveEdit() {
    if (!editingId) return;
    setSaving(true);
    await fetch("/api/admin/news", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editingId, ...editForm }),
    });
    setItems((prev) =>
      prev.map((i) =>
        i.id === editingId
          ? {
              ...i,
              headline: editForm.headline ?? i.headline,
              headline_ru: editForm.headline_ru ?? i.headline_ru,
              line1: editForm.line1 ?? i.line1,
              line1_ru: editForm.line1_ru ?? i.line1_ru,
              mode_suggestion: editForm.mode_suggestion ?? i.mode_suggestion,
            }
          : i
      )
    );
    setEditingId(null);
    setEditForm({});
    setSaving(false);
  }

  if (loading) {
    return <div className="p-8 text-muted-foreground text-sm">Loading news...</div>;
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold">News Feed</h2>
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
              <h3 className="text-lg font-semibold">Edit News Item</h3>
              <button onClick={cancelEdit} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Headline (EN)</label>
                <Input
                  value={editForm.headline ?? ""}
                  onChange={(e) => setEditForm((f) => ({ ...f, headline: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Headline (RU)</label>
                <Input
                  value={editForm.headline_ru ?? ""}
                  onChange={(e) => setEditForm((f) => ({ ...f, headline_ru: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Summary (EN)</label>
                <Input
                  value={editForm.line1 ?? ""}
                  onChange={(e) => setEditForm((f) => ({ ...f, line1: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Summary (RU)</label>
                <Input
                  value={editForm.line1_ru ?? ""}
                  onChange={(e) => setEditForm((f) => ({ ...f, line1_ru: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Mode Suggestion</label>
                <Input
                  value={editForm.mode_suggestion ?? ""}
                  onChange={(e) => setEditForm((f) => ({ ...f, mode_suggestion: e.target.value }))}
                />
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
          No news items in database
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
                <th className="px-4 py-3 font-medium">Headline</th>
                <th className="px-4 py-3 font-medium">Source</th>
                <th className="px-4 py-3 font-medium">Mode</th>
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
                    <div className="font-medium truncate max-w-[300px]">{item.headline}</div>
                    <div className="text-xs text-muted-foreground truncate max-w-[300px]">
                      {item.headline_ru}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <a
                      href={item.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                    >
                      {item.source}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded">
                      {item.mode_suggestion}
                    </span>
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
