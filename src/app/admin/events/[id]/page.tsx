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

interface EventItem {
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

type Msg = { type: "success" | "error"; text: string };

export default function EditEventPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [item, setItem] = useState<EventItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<Msg | null>(null);

  const [title, setTitle] = useState("");
  const [venue, setVenue] = useState("");
  const [dateText, setDateText] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    fetch(`/api/admin/events/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then((data) => {
        const it = data.item as EventItem;
        setItem(it);
        setTitle(it.title);
        setVenue(it.venue ?? "");
        setDateText(it.date_text ?? "");
        setPrice(it.price ?? "");
        setCategory(it.category ?? "");
        setVisible(it.visible);
      })
      .catch(() => setMessage({ type: "error", text: "Event not found" }))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/events", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          title,
          venue,
          date_text: dateText,
          price,
          category,
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
    if (!confirm("Delete this event permanently?")) return;
    try {
      const res = await fetch("/api/admin/events", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error();
      router.push("/admin/events");
    } catch {
      setMessage({ type: "error", text: "Failed to delete event" });
    }
  }

  async function handleToggleVisibility() {
    const prev = visible;
    const newVal = !prev;
    setVisible(newVal);
    try {
      const res = await fetch("/api/admin/events", {
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
          Event not found
        </div>
        <Button variant="outline" onClick={() => router.push("/admin/events")}>
          <ArrowLeft className="size-4 mr-1.5" />
          Back to Events
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
          onClick={() => router.push("/admin/events")}
          className="h-8 w-8 p-0"
        >
          <ArrowLeft className="size-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-semibold truncate">Edit Event</h2>
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
        {item.category && <Badge variant="secondary">{item.category}</Badge>}
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
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Event Details</CardTitle>
            <CardDescription>Core information about this event</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="venue">Venue</Label>
                <Input
                  id="venue"
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  placeholder="Venue name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dateText">Date</Label>
                <Input
                  id="dateText"
                  value={dateText}
                  onChange={(e) => setDateText(e.target.value)}
                  placeholder="e.g. Sat 12.04.2026 20:00"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="price">Price</Label>
                <Input
                  id="price"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="e.g. from 2000 KGS"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="e.g. concert, sports, theater"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Save */}
      <div className="flex justify-end mt-6 gap-3">
        <Button variant="outline" onClick={() => router.push("/admin/events")}>
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
