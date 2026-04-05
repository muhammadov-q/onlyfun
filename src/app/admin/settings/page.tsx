"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageLoader } from "@/components/admin/page-loader";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  User,
  Lock,
  Key,
  Bot,
  Check,
  AlertCircle,
  Eye,
  EyeOff,
  Trash2,
  Loader2,
  Shield,
  Zap,
  Sparkles,
  CircleDot,
} from "lucide-react";

type Msg = { type: "success" | "error"; text: string };

const TABS = [
  { id: "profile", label: "Profile", icon: User, desc: "Account details" },
  { id: "security", label: "Security", icon: Shield, desc: "Password" },
  { id: "api-keys", label: "API Keys", icon: Key, desc: "Integrations" },
  { id: "ai", label: "AI", icon: Sparkles, desc: "Model & features" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>("profile");

  return (
    <div className="p-6 md:p-8">
      <div className="mb-6">
        <h2 className="text-xl font-semibold">Settings</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your account, security, and integrations
        </p>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 mb-8 border-b border-border/50">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors relative -mb-px ${
                isActive
                  ? "text-foreground border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="size-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === "profile" && <ProfileSection />}
      {activeTab === "security" && <PasswordSection />}
      {activeTab === "api-keys" && <ApiKeysSection />}
      {activeTab === "ai" && <AISettingsSection />}
    </div>
  );
}

/* ─── Alert ─── */

function Alert({ msg }: { msg: Msg | null }) {
  if (!msg) return null;
  return (
    <div
      className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm ${
        msg.type === "success"
          ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
          : "bg-red-500/10 border border-red-500/20 text-red-400"
      }`}
    >
      {msg.type === "success" ? (
        <Check className="size-4 shrink-0" />
      ) : (
        <AlertCircle className="size-4 shrink-0" />
      )}
      {msg.text}
    </div>
  );
}

/* ─── Section header helper ─── */

function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-6">
      <h3 className="text-xl font-semibold tracking-tight">{title}</h3>
      <p className="text-sm text-muted-foreground mt-1">{description}</p>
    </div>
  );
}

/* ─── Profile ─── */

function ProfileSection() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<Msg | null>(null);

  useEffect(() => {
    fetch("/api/admin/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.user) {
          setName(data.user.name);
          setEmail(data.user.email);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    if (!name.trim() || !email.trim()) {
      setMessage({ type: "error", text: "Name and email are required" });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/auth/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({
          type: "error",
          text: data.error || "Failed to update profile",
        });
        return;
      }
      setMessage({
        type: "success",
        text: "Profile updated. Reload the page to see sidebar changes.",
      });
    } catch {
      setMessage({ type: "error", text: "Something went wrong" });
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingSkeleton />;

  return (
    <div>
      <SectionHeader title="Profile" description="Manage your admin account details" />

      <Card>
        <CardHeader>
          <CardTitle>Personal information</CardTitle>
          <CardDescription>
            This is displayed in the admin sidebar and used for notifications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <Alert msg={message} />
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="profileName">Display name</Label>
                <Input
                  id="profileName"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profileEmail">Email address</Label>
                <Input
                  id="profileEmail"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                  required
                />
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="size-4 mr-2 animate-spin" />}
                {saving ? "Saving..." : "Save changes"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

/* ─── Password ─── */

function PasswordSection() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<Msg | null>(null);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    if (newPassword !== confirmPassword) {
      setMessage({ type: "error", text: "New passwords do not match" });
      return;
    }
    if (newPassword.length < 6) {
      setMessage({
        type: "error",
        text: "New password must be at least 6 characters",
      });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/auth/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({
          type: "error",
          text: data.error || "Failed to update password",
        });
        return;
      }
      setMessage({ type: "success", text: "Password updated successfully" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setMessage({ type: "error", text: "Something went wrong" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <SectionHeader title="Security" description="Manage your password and account security" />

      <Card>
        <CardHeader>
          <CardTitle>Change password</CardTitle>
          <CardDescription>Minimum 6 characters. Use a strong, unique password.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <Alert msg={message} />
            <div className="space-y-2 max-w-md">
              <Label htmlFor="currentPassword">Current password</Label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  type={showCurrent ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showCurrent ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="newPassword">New password</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showNew ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showNew ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm new password</Label>
                <Input
                  id="confirmPassword"
                  type={showNew ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="size-4 mr-2 animate-spin" />}
                {loading ? "Updating..." : "Update password"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

/* ─── API Keys ─── */

interface KeyState {
  masked: string;
  isSet: boolean;
}

const API_KEY_CONFIG = [
  {
    key: "gemini_api_key",
    label: "Gemini API Key",
    description: "Powers AI features like ice-breakers and topic suggestions",
    icon: Sparkles,
  },
  {
    key: "google_maps_key",
    label: "Google Maps Key",
    description: "Used for map embeds and location services",
    icon: CircleDot,
  },
] as const;

function ApiKeysSection() {
  const [keys, setKeys] = useState<Record<string, KeyState>>({});
  const [loading, setLoading] = useState(true);

  const fetchKeys = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/settings");
      if (!res.ok) return;
      const data = await res.json();
      setKeys(data.settings);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  if (loading) return <LoadingSkeleton />;

  return (
    <div>
      <SectionHeader
        title="API Keys"
        description="Manage third-party API keys. All keys are encrypted at rest."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {API_KEY_CONFIG.map((cfg) => (
          <ApiKeyCard
            key={cfg.key}
            label={cfg.label}
            description={cfg.description}
            icon={cfg.icon}
            settingKey={cfg.key}
            current={keys[cfg.key]}
            onSaved={fetchKeys}
          />
        ))}
      </div>
    </div>
  );
}

function ApiKeyCard({
  label,
  description,
  icon: Icon,
  settingKey,
  current,
  onSaved,
}: {
  label: string;
  description: string;
  icon: typeof Sparkles;
  settingKey: string;
  current?: KeyState;
  onSaved: () => void;
}) {
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [message, setMessage] = useState<Msg | null>(null);

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: settingKey, value }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.error || "Failed to save" });
        return;
      }
      setMessage({ type: "success", text: "Key saved" });
      setValue("");
      onSaved();
    } catch {
      setMessage({ type: "error", text: "Something went wrong" });
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove() {
    setRemoving(true);
    setMessage(null);
    try {
      await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: settingKey, value: "" }),
      });
      setMessage({ type: "success", text: "Key removed" });
      setValue("");
      onSaved();
    } catch {
      setMessage({ type: "error", text: "Something went wrong" });
    } finally {
      setRemoving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div
              className={`p-2 rounded-xl shrink-0 ${current?.isSet ? "bg-emerald-500/10 text-emerald-400" : "bg-muted text-muted-foreground"}`}
            >
              <Icon className="size-4" />
            </div>
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-sm font-semibold">{label}</CardTitle>
                {current?.isSet ? (
                  <Badge
                    variant="outline"
                    className="text-emerald-400 border-emerald-500/30 text-[11px] px-1.5 py-0"
                  >
                    Active
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="text-muted-foreground text-[11px] px-1.5 py-0"
                  >
                    Not set
                  </Badge>
                )}
              </div>
              <CardDescription className="text-xs leading-relaxed">{description}</CardDescription>
            </div>
          </div>
          {current?.isSet && (
            <button
              type="button"
              onClick={handleRemove}
              disabled={removing}
              className="shrink-0 p-1.5 rounded-xl text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
              title="Remove key"
            >
              <Trash2 className="size-3.5" />
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <Alert msg={message} />
          {current?.isSet && (
            <div className="font-mono text-xs text-muted-foreground bg-muted/30 rounded-xl px-3 py-2 border border-border/30">
              {current.masked}
            </div>
          )}
          <div className="flex gap-2">
            <Input
              type="password"
              placeholder={current?.isSet ? "Enter new key to replace" : "Paste API key"}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="flex-1"
            />
            <Button disabled={saving || !value.trim()} onClick={handleSave}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : "Save"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── AI Settings ─── */

const AI_MODELS = [
  {
    value: "gemini-2.5-flash",
    label: "Gemini 2.5 Flash",
    description: "Fast & affordable",
    icon: Zap,
  },
  {
    value: "gemini-2.5-pro",
    label: "Gemini 2.5 Pro",
    description: "Higher quality, higher cost",
    icon: Sparkles,
  },
  {
    value: "gemini-2.0-flash",
    label: "Gemini 2.0 Flash",
    description: "Legacy model",
    icon: Bot,
  },
];

function AISettingsSection() {
  const [enabled, setEnabled] = useState(false);
  const [model, setModel] = useState("gemini-2.5-flash");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<Msg | null>(null);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data.settings?.ai_enabled) {
          setEnabled(data.settings.ai_enabled.value === "true");
        }
        if (data.settings?.ai_model?.value) {
          setModel(data.settings.ai_model.value);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  async function saveSetting(key: string, value: string) {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value }),
      });
      if (!res.ok) {
        const data = await res.json();
        setMessage({ type: "error", text: data.error || "Failed to save" });
        return false;
      }
      return true;
    } catch {
      setMessage({ type: "error", text: "Something went wrong" });
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle() {
    const newValue = !enabled;
    const ok = await saveSetting("ai_enabled", newValue ? "true" : "false");
    if (ok) {
      setEnabled(newValue);
      setMessage({
        type: "success",
        text: newValue ? "AI features enabled" : "AI features disabled",
      });
    }
  }

  async function handleModelChange(newModel: string | null) {
    if (!newModel) return;
    const ok = await saveSetting("ai_model", newModel);
    if (ok) {
      setModel(newModel);
      setMessage({ type: "success", text: `Model changed to ${newModel}` });
    }
  }

  if (loading) return <LoadingSkeleton />;

  return (
    <div>
      <SectionHeader
        title="AI Configuration"
        description="Control AI-powered features across the platform"
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Master toggle */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div
                  className={`p-2 rounded-xl shrink-0 ${enabled ? "bg-emerald-500/10 text-emerald-400" : "bg-muted text-muted-foreground"}`}
                >
                  <Sparkles className="size-4" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <CardTitle>AI Features</CardTitle>
                    {enabled ? (
                      <Badge
                        variant="outline"
                        className="text-emerald-400 border-emerald-500/30 text-[11px] px-1.5 py-0"
                      >
                        On
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="text-muted-foreground text-[11px] px-1.5 py-0"
                      >
                        Off
                      </Badge>
                    )}
                  </div>
                  <CardDescription>
                    Ice-breakers, topic suggestions, and news summaries. Disabling falls back to
                    templates.
                  </CardDescription>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={enabled}
                disabled={saving}
                onClick={handleToggle}
                className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 ${
                  enabled ? "bg-emerald-500" : "bg-muted-foreground/30"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block size-5 rounded-full bg-white shadow-lg ring-0 transition-transform duration-200 ${
                    enabled ? "translate-x-[22px]" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>
          </CardHeader>
          {message && (
            <CardContent>
              <Alert msg={message} />
            </CardContent>
          )}
        </Card>

        {/* Model selector */}
        <Card
          className={`transition-opacity duration-200 ${!enabled ? "opacity-40 pointer-events-none select-none" : ""}`}
        >
          <CardHeader>
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-muted text-muted-foreground shrink-0">
                <Bot className="size-4" />
              </div>
              <div className="space-y-1">
                <CardTitle>Model</CardTitle>
                <CardDescription>
                  Flash is faster and cheaper. Pro produces better quality.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Select value={model} onValueChange={handleModelChange}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AI_MODELS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    <span className="flex items-center gap-2">
                      {m.label}
                      <span className="text-muted-foreground text-xs">— {m.description}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* ─── Loading skeleton ─── */

function LoadingSkeleton() {
  return <PageLoader />;
}
