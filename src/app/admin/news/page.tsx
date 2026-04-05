"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Trash2, ExternalLink, Pencil, Zap } from "lucide-react";
import { RefreshButton } from "@/components/admin/refresh-button";
import { PageLoader } from "@/components/admin/page-loader";

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
  const router = useRouter();
  const [items, setItems] = useState<NewsRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [scraping, setScraping] = useState(false);

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

  if (loading) {
    return <PageLoader text="Loading news..." />;
  }

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
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
          <Button
            variant="outline"
            size="sm"
            disabled={scraping}
            onClick={async () => {
              setScraping(true);
              setError("");
              try {
                const res = await fetch("/api/admin/news", { method: "POST" });
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
          <RefreshButton onRefresh={fetchItems} />
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-3 text-destructive text-sm mb-6">
          {error}
        </div>
      )}

      {items.length === 0 ? (
        <div className="text-muted-foreground text-sm py-12 text-center">
          No news items in database
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
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
                  onClick={() => router.push(`/admin/news/${item.id}`)}
                  className={`border-b border-border last:border-0 hover:bg-accent/30 transition-colors cursor-pointer ${
                    !item.visible ? "opacity-50" : ""
                  } ${selected.has(item.id) ? "bg-accent/20" : ""}`}
                >
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
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
                      onClick={(e) => e.stopPropagation()}
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
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => router.push(`/admin/news/${item.id}`)}
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
