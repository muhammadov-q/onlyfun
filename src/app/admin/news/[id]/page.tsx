"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Loader2,
  Check,
  AlertCircle,
  ExternalLink,
  Eye,
  EyeOff,
  Trash2,
} from "lucide-react";

interface NewsItem {
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

type Msg = { type: "success" | "error"; text: string };

export default function EditNewsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [item, setItem] = useState<NewsItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<Msg | null>(null);

  const [headline, setHeadline] = useState("");
  const [headlineRu, setHeadlineRu] = useState("");
  const [line1, setLine1] = useState("");
  const [line1Ru, setLine1Ru] = useState("");
  const [modeSuggestion, setModeSuggestion] = useState("");
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    fetch(`/api/admin/news/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then((data) => {
        const it = data.item as NewsItem;
        setItem(it);
        setHeadline(it.headline);
        setHeadlineRu(it.headline_ru);
        setLine1(it.line1);
        setLine1Ru(it.line1_ru);
        setModeSuggestion(it.mode_suggestion);
        setVisible(it.visible);
      })
      .catch(() => setMessage({ type: "error", text: "News item not found" }))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/news", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          headline,
          headline_ru: headlineRu,
          line1,
          line1_ru: line1Ru,
          mode_suggestion: modeSuggestion,
          visible,
        }),
      });
      if (!res.ok) throw new Error();
      setMessage({ type: "success", text: "Changes saved successfully" });
    } catch {
      setMessage({ type: "error", text: "Failed to save changes" });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this news item permanently?")) return;
    try {
      const res = await fetch("/api/admin/news", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error();
      router.push("/admin/news");
    } catch {
      setMessage({ type: "error", text: "Failed to delete news item" });
    }
  }

  async function handleToggleVisibility() {
    const prev = visible;
    const newVal = !prev;
    setVisible(newVal);
    try {
      const res = await fetch("/api/admin/news", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, visible: newVal }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setVisible(prev);
      setMessage({ type: "error", text: "Failed to update visibility" });
    }
  }

  if (loading) {
    return (
      <div className="p-4 md:p-8 flex items-center justify-center min-h-[400px]">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="p-4 md:p-8">
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm mb-4">
          News item not found
        </div>
        <Button variant="outline" onClick={() => router.push("/admin/news")}>
          <ArrowLeft className="size-4 mr-1.5" />
          Back to News
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8">
      {/* Back + title */}
      <div className="flex items-center gap-3 mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/admin/news")}
          className="h-8 w-8 p-0"
        >
          <ArrowLeft className="size-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-semibold truncate">Edit News Item</h2>
          <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-2">
            <a
              href={item.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors inline-flex items-center gap-1"
            >
              {item.source}
              <ExternalLink className="size-3" />
            </a>
            <span>&middot;</span>
            <span>{new Date(item.created_at).toLocaleString()}</span>
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={handleToggleVisibility}>
            {visible ? (
              <>
                <EyeOff className="size-3.5 mr-1.5" />
                Hide
              </>
            ) : (
              <>
                <Eye className="size-3.5 mr-1.5" />
                Show
              </>
            )}
          </Button>
          <Button variant="destructive" size="sm" onClick={handleDelete}>
            <Trash2 className="size-3.5 mr-1.5" />
            Delete
          </Button>
        </div>
      </div>

      {/* Status */}
      <div className="flex items-center gap-2 mb-6">
        {visible ? (
          <Badge variant="outline" className="text-emerald-400 border-emerald-500/30">
            Visible
          </Badge>
        ) : (
          <Badge variant="outline" className="text-muted-foreground">
            Hidden
          </Badge>
        )}
        <Badge variant="secondary">{item.mode_suggestion}</Badge>
      </div>

      {/* Alert */}
      {message && (
        <div
          className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm mb-6 ${
            message.type === "success"
              ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
              : "bg-red-500/10 border border-red-500/20 text-red-400"
          }`}
        >
          {message.type === "success" ? (
            <Check className="size-4 shrink-0" />
          ) : (
            <AlertCircle className="size-4 shrink-0" />
          )}
          {message.text}
        </div>
      )}

      {/* Form */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>English</CardTitle>
            <CardDescription>Headline and summary in English</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="headline">Headline</Label>
              <Input id="headline" value={headline} onChange={(e) => setHeadline(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="line1">Summary</Label>
              <Input id="line1" value={line1} onChange={(e) => setLine1(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Russian</CardTitle>
            <CardDescription>Headline and summary in Russian</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="headlineRu">Headline</Label>
              <Input
                id="headlineRu"
                value={headlineRu}
                onChange={(e) => setHeadlineRu(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="line1Ru">Summary</Label>
              <Input id="line1Ru" value={line1Ru} onChange={(e) => setLine1Ru(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Settings</CardTitle>
            <CardDescription>Controls how this item appears in the feed</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-w-xs">
              <Label htmlFor="modeSuggestion">Mode Suggestion</Label>
              <Input
                id="modeSuggestion"
                value={modeSuggestion}
                onChange={(e) => setModeSuggestion(e.target.value)}
                placeholder="debate, advice, deep, confessions..."
              />
              <p className="text-xs text-muted-foreground">
                Suggested room mode when this item is used as a topic
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Save */}
      <div className="flex justify-end mt-6 gap-3">
        <Button variant="outline" onClick={() => router.push("/admin/news")}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="size-4 mr-2 animate-spin" />}
          {saving ? "Saving..." : "Save changes"}
        </Button>
      </div>
    </div>
  );
}
