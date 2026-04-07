"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
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
  Eye,
  EyeOff,
  Trash2,
  Loader2,
  Shield,
  Zap,
  Sparkles,
  CircleDot,
  Moon,
  Construction,
  Rocket,
  Globe,
  UserPlus,
  Users,
  Mail,
  Pencil,
  MapPin,
} from "lucide-react";

const TABS = [
  { id: "profile", label: "Profile", icon: User },
  { id: "security", label: "Security", icon: Shield },
  { id: "admins", label: "Admins", icon: Users },
  { id: "site", label: "Site", icon: Globe },
  { id: "api-keys", label: "API Keys", icon: Key },
  { id: "ai", label: "AI", icon: Sparkles },
  { id: "hours", label: "Hours", icon: Moon },
] as const;

type TabId = (typeof TABS)[number]["id"];

/* ─── Toggle switch component ─── */

function Toggle({
  checked,
  onChange,
  disabled,
  color = "bg-emerald-500",
}: {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  color?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? color : "bg-muted-foreground/30"
      }`}
    >
      <span
        className={`pointer-events-none inline-block size-4 rounded-full bg-white shadow-lg ring-0 transition-transform duration-200 ${
          checked ? "translate-x-[21px]" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

/* ─── Main ─── */

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>("profile");

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="mb-4 sm:mb-6">
        <h2 className="text-xl font-semibold">Settings</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your account, security, and integrations
        </p>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-0.5 sm:gap-1 mb-6 sm:mb-8 border-b border-border/50 overflow-x-auto scrollbar-none">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              title={tab.label}
              className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2.5 text-sm font-medium transition-colors relative -mb-px whitespace-nowrap shrink-0 ${
                isActive
                  ? "text-foreground border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="size-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {activeTab === "profile" && <ProfileSection />}
      {activeTab === "security" && <PasswordSection />}
      {activeTab === "admins" && <AdminsSection />}
      {activeTab === "site" && <SiteStatusSection />}
      {activeTab === "api-keys" && <ApiKeysSection />}
      {activeTab === "ai" && <AISettingsSection />}
      {activeTab === "hours" && <OperatingHoursSection />}
    </div>
  );
}

/* ─── Profile ─── */

function ProfileSection() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
    if (!name.trim() || !email.trim()) {
      toast.error("Name and email are required");
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
        toast.error(data.error || "Failed to update profile");
        return;
      }
      toast.success("Profile updated");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <PageLoader />;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>Your admin account details</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
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
          <div className="flex justify-end">
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="size-4 mr-2 animate-spin" />}
              Save changes
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

/* ─── Password ─── */

function PasswordSection() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters");
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
        toast.error(data.error || "Failed to update password");
        return;
      }
      toast.success("Password updated");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Change password</CardTitle>
        <CardDescription>Minimum 6 characters. Use a strong, unique password.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
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
          <div className="flex justify-end">
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="size-4 mr-2 animate-spin" />}
              Update password
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

/* ─── Admins ─── */

interface AdminItem {
  id: number;
  email: string;
  name: string;
  created_at: string;
}

function AdminsSection() {
  const [admins, setAdmins] = useState<AdminItem[]>([]);
  const [currentId, setCurrentId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [addName, setAddName] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addPassword, setAddPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchAdmins = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/admins");
      if (!res.ok) return;
      const data = await res.json();
      setAdmins(data.admins);
      setCurrentId(data.currentId);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAdmins();
  }, [fetchAdmins]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/admin/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: addName.trim(),
          email: addEmail.trim(),
          password: addPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to create admin");
        return;
      }
      toast.success(`Admin "${data.admin.name}" created`);
      setAddName("");
      setAddEmail("");
      setAddPassword("");
      setShowAdd(false);
      fetchAdmins();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function handleEdit(id: number) {
    setSaving(true);
    try {
      const body: Record<string, string> = {};
      if (editName.trim()) body.name = editName.trim();
      if (editEmail.trim()) body.email = editEmail.trim();
      if (editPassword) body.password = editPassword;

      const res = await fetch(`/api/admin/admins/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to update");
        return;
      }
      toast.success("Admin updated");
      setEditingId(null);
      setEditPassword("");
      fetchAdmins();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/admins/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to delete");
        return;
      }
      toast.success("Admin deleted");
      fetchAdmins();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) return <PageLoader />;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold">Admin Users</h3>
          <p className="text-sm text-muted-foreground">
            {admins.length} admin{admins.length !== 1 ? "s" : ""}
          </p>
        </div>
        {!showAdd && (
          <Button size="sm" onClick={() => setShowAdd(true)}>
            <UserPlus className="size-4 mr-1.5" />
            Add
          </Button>
        )}
      </div>

      {/* Add form */}
      {showAdd && (
        <Card className="mb-4">
          <CardContent className="pt-5">
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="newAdminName">Name</Label>
                  <Input
                    id="newAdminName"
                    value={addName}
                    onChange={(e) => setAddName(e.target.value)}
                    placeholder="John Doe"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="newAdminEmail">Email</Label>
                  <Input
                    id="newAdminEmail"
                    type="email"
                    value={addEmail}
                    onChange={(e) => setAddEmail(e.target.value)}
                    placeholder="john@example.com"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="newAdminPassword">Password</Label>
                  <Input
                    id="newAdminPassword"
                    type="password"
                    value={addPassword}
                    onChange={(e) => setAddPassword(e.target.value)}
                    placeholder="Min 6 chars"
                    required
                    minLength={6}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={saving}>
                  {saving && <Loader2 className="size-3.5 mr-1.5 animate-spin" />}
                  Create
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setShowAdd(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Admin list */}
      <div className="space-y-2">
        {admins.map((admin) => {
          const isEditing = editingId === admin.id;
          const isSelf = admin.id === currentId;
          const initials = admin.name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);

          return (
            <Card key={admin.id}>
              <CardContent className="py-3">
                {isEditing ? (
                  <div className="space-y-3">
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="space-y-1.5">
                        <Label>Name</Label>
                        <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Email</Label>
                        <Input
                          type="email"
                          value={editEmail}
                          onChange={(e) => setEditEmail(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>New password</Label>
                        <Input
                          type="password"
                          value={editPassword}
                          onChange={(e) => setEditPassword(e.target.value)}
                          placeholder="Leave empty to keep"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" disabled={saving} onClick={() => handleEdit(admin.id)}>
                        {saving && <Loader2 className="size-3.5 mr-1.5 animate-spin" />}
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingId(null);
                          setEditPassword("");
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-[11px] font-semibold text-accent-foreground shrink-0">
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{admin.name}</p>
                        {isSelf && (
                          <Badge
                            variant="outline"
                            className="text-emerald-400 border-emerald-500/30 text-[10px] px-1.5 py-0"
                          >
                            You
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Mail className="size-3" />
                        {admin.email}
                      </p>
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(admin.id);
                          setEditName(admin.name);
                          setEditEmail(admin.email);
                          setEditPassword("");
                        }}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
                        title="Edit"
                      >
                        <Pencil className="size-3.5" />
                      </button>
                      {!isSelf && (
                        <button
                          type="button"
                          onClick={() => handleDelete(admin.id)}
                          disabled={deletingId === admin.id}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                          title="Delete"
                        >
                          {deletingId === admin.id ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="size-3.5" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
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
    description: "Powers AI ice-breakers and topic suggestions",
    icon: Sparkles,
  },
  {
    key: "google_maps_key",
    label: "Google Maps Key",
    description: "Map embeds and location services",
    icon: CircleDot,
  },
] as const;

function ApiKeysSection() {
  const [keys, setKeys] = useState<Record<string, KeyState & { value?: string }>>({});
  const [loading, setLoading] = useState(true);
  const [mapProvider, setMapProvider] = useState<"google" | "leaflet">("google");
  const [savingProvider, setSavingProvider] = useState(false);

  const fetchKeys = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/settings");
      if (!res.ok) return;
      const data = await res.json();
      setKeys(data.settings);
      if (data.settings?.map_provider?.value) {
        setMapProvider(data.settings.map_provider.value as "google" | "leaflet");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  async function handleProviderChange(provider: "google" | "leaflet") {
    setSavingProvider(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "map_provider", value: provider }),
      });
      if (!res.ok) {
        toast.error("Failed to save map provider");
        return;
      }
      setMapProvider(provider);
      toast.success(
        `Map provider set to ${provider === "leaflet" ? "OpenStreetMap" : "Google Maps"}`
      );
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSavingProvider(false);
    }
  }

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-4">
      {/* Map Provider Toggle */}
      <Card>
        <CardHeader>
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl shrink-0 bg-blue-500/10 text-blue-400">
              <MapPin className="size-4" />
            </div>
            <div className="space-y-1">
              <CardTitle className="text-sm font-semibold">Map Provider</CardTitle>
              <CardDescription className="text-xs">
                Choose which map service to use. OpenStreetMap is free and requires no API key.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <button
              onClick={() => handleProviderChange("google")}
              disabled={savingProvider}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium border-2 transition-all disabled:opacity-50 ${
                mapProvider === "google"
                  ? "border-blue-500 bg-blue-500/10 text-blue-400"
                  : "border-border/50 bg-muted/30 text-muted-foreground hover:border-border hover:bg-muted/50"
              }`}
            >
              <CircleDot className="size-4" />
              Google Maps
            </button>
            <button
              onClick={() => handleProviderChange("leaflet")}
              disabled={savingProvider}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium border-2 transition-all disabled:opacity-50 ${
                mapProvider === "leaflet"
                  ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                  : "border-border/50 bg-muted/30 text-muted-foreground hover:border-border hover:bg-muted/50"
              }`}
            >
              <Globe className="size-4" />
              OpenStreetMap
            </button>
          </div>
          {mapProvider === "leaflet" && (
            <p className="text-xs text-emerald-400/70 mt-2">
              Using free CartoDB Dark Matter tiles. No API key required.
            </p>
          )}
          {mapProvider === "google" && (
            <p className="text-xs text-muted-foreground mt-2">
              Requires a valid Google Maps API key below.
            </p>
          )}
        </CardContent>
      </Card>

      {/* API Key Cards */}
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

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: settingKey, value }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to save");
        return;
      }
      toast.success(`${label} saved`);
      setValue("");
      onSaved();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove() {
    setRemoving(true);
    try {
      await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: settingKey, value: "" }),
      });
      toast.success(`${label} removed`);
      setValue("");
      onSaved();
    } catch {
      toast.error("Something went wrong");
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
                <Badge
                  variant="outline"
                  className={`text-[11px] px-1.5 py-0 ${current?.isSet ? "text-emerald-400 border-emerald-500/30" : "text-muted-foreground"}`}
                >
                  {current?.isSet ? "Active" : "Not set"}
                </Badge>
              </div>
              <CardDescription className="text-xs">{description}</CardDescription>
            </div>
          </div>
          {current?.isSet && (
            <button
              type="button"
              onClick={handleRemove}
              disabled={removing}
              className="shrink-0 p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
              title="Remove key"
            >
              <Trash2 className="size-3.5" />
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {current?.isSet && (
            <div className="font-mono text-xs text-muted-foreground bg-muted/30 rounded-lg px-3 py-2 border border-border/30">
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
            <Button disabled={saving || !value.trim()} onClick={handleSave} size="sm">
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
    description: "Higher quality",
    icon: Sparkles,
  },
  {
    value: "gemini-2.5-flash-lite",
    label: "Gemini 2.5 Flash Lite",
    description: "Cheapest",
    icon: Bot,
  },
];

function AISettingsSection() {
  const [enabled, setEnabled] = useState(false);
  const [model, setModel] = useState("gemini-2.5-flash");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data.settings?.ai_enabled) setEnabled(data.settings.ai_enabled.value === "true");
        if (data.settings?.ai_model?.value) {
          const saved = data.settings.ai_model.value;
          const validModels = AI_MODELS.map((m) => m.value);
          setModel(validModels.includes(saved) ? saved : "gemini-2.5-flash");
        }
      })
      .finally(() => setLoading(false));
  }, []);

  async function saveSetting(key: string, value: string) {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to save");
        return false;
      }
      return true;
    } catch {
      toast.error("Something went wrong");
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
      toast.success(newValue ? "AI features enabled" : "AI features disabled");
    }
  }

  async function handleModelChange(newModel: string | null) {
    if (!newModel) return;
    const ok = await saveSetting("ai_model", newModel);
    if (ok) {
      setModel(newModel);
      toast.success(`Model changed to ${newModel}`);
    }
  }

  if (loading) return <PageLoader />;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
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
                  <Badge
                    variant="outline"
                    className={`text-[11px] px-1.5 py-0 ${enabled ? "text-emerald-400 border-emerald-500/30" : "text-muted-foreground"}`}
                  >
                    {enabled ? "On" : "Off"}
                  </Badge>
                </div>
                <CardDescription>
                  Ice-breakers, topic suggestions, and news summaries
                </CardDescription>
              </div>
            </div>
            <Toggle checked={enabled} onChange={handleToggle} disabled={saving} />
          </div>
        </CardHeader>
      </Card>

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
              <CardDescription>Flash is faster, Pro is better quality</CardDescription>
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
                    {m.label}{" "}
                    <span className="text-muted-foreground text-xs">— {m.description}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>
    </div>
  );
}

/* ─── Site Status ─── */

function SiteStatusSection() {
  const [underConstruction, setUnderConstruction] = useState(false);
  const [launchCountdown, setLaunchCountdown] = useState(false);
  const [launchDate, setLaunchDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings/site-status")
      .then((r) => r.json())
      .then((data) => {
        setUnderConstruction(data.underConstruction ?? false);
        setLaunchCountdown(data.launchCountdown ?? false);
        setLaunchDate(data.launchDate ?? "");
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings/site-status", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ underConstruction, launchCountdown, launchDate }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to save");
        return;
      }
      toast.success("Site status updated");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <PageLoader />;

  return (
    <div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div
                  className={`p-2 rounded-xl shrink-0 ${underConstruction ? "bg-amber-500/10 text-amber-400" : "bg-muted text-muted-foreground"}`}
                >
                  <Construction className="size-4" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <CardTitle>Under Construction</CardTitle>
                    <Badge
                      variant="outline"
                      className={`text-[11px] px-1.5 py-0 ${underConstruction ? "text-amber-400 border-amber-500/30" : "text-muted-foreground"}`}
                    >
                      {underConstruction ? "On" : "Off"}
                    </Badge>
                  </div>
                  <CardDescription>Show a construction page to all visitors</CardDescription>
                </div>
              </div>
              <Toggle
                checked={underConstruction}
                onChange={() => {
                  setUnderConstruction(!underConstruction);
                  if (!underConstruction) setLaunchCountdown(false);
                }}
                color="bg-amber-500"
              />
            </div>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div
                  className={`p-2 rounded-xl shrink-0 ${launchCountdown ? "bg-violet-500/10 text-violet-400" : "bg-muted text-muted-foreground"}`}
                >
                  <Rocket className="size-4" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <CardTitle>Launch Countdown</CardTitle>
                    <Badge
                      variant="outline"
                      className={`text-[11px] px-1.5 py-0 ${launchCountdown ? "text-violet-400 border-violet-500/30" : "text-muted-foreground"}`}
                    >
                      {launchCountdown ? "On" : "Off"}
                    </Badge>
                  </div>
                  <CardDescription>Show a countdown timer until launch date</CardDescription>
                </div>
              </div>
              <Toggle
                checked={launchCountdown}
                onChange={() => {
                  setLaunchCountdown(!launchCountdown);
                  if (!launchCountdown) setUnderConstruction(false);
                }}
                color="bg-violet-500"
              />
            </div>
          </CardHeader>
          <CardContent
            className={`transition-opacity duration-200 ${!launchCountdown ? "opacity-40 pointer-events-none select-none" : ""}`}
          >
            <div className="space-y-1.5">
              <Label htmlFor="launchDate">Launch date & time</Label>
              <Input
                id="launchDate"
                type="datetime-local"
                value={launchDate}
                onChange={(e) => setLaunchDate(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-5 flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="size-4 mr-2 animate-spin" />}
          Save changes
        </Button>
      </div>
    </div>
  );
}

/* ─── Operating Hours ─── */

function OperatingHoursSection() {
  const [enabled, setEnabled] = useState(false);
  const [startTime, setStartTime] = useState("19:00");
  const [endTime, setEndTime] = useState("04:00");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings/operating-hours")
      .then((r) => r.json())
      .then((data) => {
        setEnabled(data.nightModeEnabled ?? false);
        setStartTime(data.startTime ?? "19:00");
        setEndTime(data.endTime ?? "04:00");
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings/operating-hours", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nightModeEnabled: enabled, startTime, endTime }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to save");
        return;
      }
      toast.success("Operating hours updated");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <PageLoader />;

  return (
    <div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div
                  className={`p-2 rounded-xl shrink-0 ${enabled ? "bg-violet-500/10 text-violet-400" : "bg-muted text-muted-foreground"}`}
                >
                  <Moon className="size-4" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <CardTitle>Night Mode</CardTitle>
                    <Badge
                      variant="outline"
                      className={`text-[11px] px-1.5 py-0 ${enabled ? "text-violet-400 border-violet-500/30" : "text-muted-foreground"}`}
                    >
                      {enabled ? "On" : "Off"}
                    </Badge>
                  </div>
                  <CardDescription>
                    Restrict app to specific hours. Users see a &quot;come back later&quot; screen
                    outside those hours.
                  </CardDescription>
                </div>
              </div>
              <Toggle
                checked={enabled}
                onChange={() => setEnabled(!enabled)}
                color="bg-violet-500"
              />
            </div>
          </CardHeader>
        </Card>

        <Card
          className={`transition-opacity duration-200 ${!enabled ? "opacity-40 pointer-events-none select-none" : ""}`}
        >
          <CardHeader>
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-muted text-muted-foreground shrink-0">
                <Lock className="size-4" />
              </div>
              <div className="space-y-1">
                <CardTitle>Allowed Hours</CardTitle>
                <CardDescription>Supports overnight ranges. Bishkek time (UTC+6).</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="startTime">Start</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="endTime">End</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-5 flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="size-4 mr-2 animate-spin" />}
          Save changes
        </Button>
      </div>
    </div>
  );
}
