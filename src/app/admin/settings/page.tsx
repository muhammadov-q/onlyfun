"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

type Msg = { type: "success" | "error"; text: string };

export default function AdminSettingsPage() {
  return (
    <div className="p-8">
      <h2 className="text-xl font-semibold">Settings</h2>
      <p className="text-sm text-muted-foreground mt-1">Manage account and API keys</p>

      <Separator className="my-6" />

      <ProfileSection />

      <Separator className="my-6" />

      <PasswordSection />

      <Separator className="my-6" />

      <ApiKeysSection />

      <Separator className="my-6" />

      <AISettingsSection />
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
        setMessage({ type: "error", text: data.error || "Failed to update profile" });
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

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading profile...</div>;
  }

  return (
    <div>
      <h3 className="text-base font-medium mb-4">Profile</h3>
      <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
        <Alert msg={message} />
        <Field label="Name" id="profileName" value={name} onChange={setName} required />
        <Field
          label="Email"
          id="profileEmail"
          type="email"
          value={email}
          onChange={setEmail}
          required
        />
        <Button type="submit" disabled={saving}>
          {saving ? "Saving..." : "Save profile"}
        </Button>
      </form>
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    if (newPassword !== confirmPassword) {
      setMessage({ type: "error", text: "New passwords do not match" });
      return;
    }
    if (newPassword.length < 6) {
      setMessage({ type: "error", text: "New password must be at least 6 characters" });
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
        setMessage({ type: "error", text: data.error || "Failed to update password" });
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
      <h3 className="text-base font-medium mb-4">Change password</h3>
      <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
        <Alert msg={message} />
        <Field
          label="Current password"
          id="currentPassword"
          type="password"
          value={currentPassword}
          onChange={setCurrentPassword}
          required
        />
        <Field
          label="New password"
          id="newPassword"
          type="password"
          value={newPassword}
          onChange={setNewPassword}
          required
          minLength={6}
        />
        <Field
          label="Confirm new password"
          id="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={setConfirmPassword}
          required
          minLength={6}
        />
        <Button type="submit" disabled={loading}>
          {loading ? "Updating..." : "Update password"}
        </Button>
      </form>
    </div>
  );
}

/* ─── API Keys ─── */

interface KeyState {
  masked: string;
  isSet: boolean;
}

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

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading keys...</div>;
  }

  return (
    <div>
      <h3 className="text-base font-medium mb-1">API Keys</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Keys are encrypted at rest. Saved values are never shown in full.
      </p>

      <div className="space-y-6 max-w-md">
        <ApiKeyField
          label="Gemini API Key"
          settingKey="gemini_api_key"
          current={keys.gemini_api_key}
          onSaved={fetchKeys}
        />
        <ApiKeyField
          label="Google Maps Key"
          settingKey="google_maps_key"
          current={keys.google_maps_key}
          onSaved={fetchKeys}
        />
      </div>
    </div>
  );
}

function ApiKeyField({
  label,
  settingKey,
  current,
  onSaved,
}: {
  label: string;
  settingKey: string;
  current?: KeyState;
  onSaved: () => void;
}) {
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
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
      setMessage({ type: "success", text: value ? "Key saved" : "Key removed" });
      setValue("");
      onSaved();
    } catch {
      setMessage({ type: "error", text: "Something went wrong" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {current?.isSet && (
        <p className="text-xs text-muted-foreground font-mono">Current: {current.masked}</p>
      )}
      <div className="flex gap-2">
        <Input
          type="password"
          placeholder={current?.isSet ? "Enter new key to replace" : "Paste API key"}
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <Button variant="outline" disabled={saving || !value.trim()} onClick={handleSave}>
          {saving ? "..." : "Save"}
        </Button>
      </div>
      {current?.isSet && (
        <button
          type="button"
          onClick={() => {
            setValue("");
            setSaving(true);
            fetch("/api/admin/settings", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ key: settingKey, value: "" }),
            })
              .then(() => onSaved())
              .finally(() => setSaving(false));
          }}
          className="text-xs text-destructive hover:underline"
        >
          Remove key
        </button>
      )}
      <Alert msg={message} />
    </div>
  );
}

/* ─── AI Settings ─── */

const AI_MODELS = [
  { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash (fast, cheap)" },
  { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro (smarter, costly)" },
  { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash (legacy)" },
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

  async function handleModelChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newModel = e.target.value;
    const ok = await saveSetting("ai_model", newModel);
    if (ok) {
      setModel(newModel);
      setMessage({ type: "success", text: `Model changed to ${newModel}` });
    }
  }

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading AI settings...</div>;
  }

  return (
    <div>
      <h3 className="text-base font-medium mb-1">AI Settings</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Control AI usage across the platform. Disabling AI will use fallback/template-based content
        instead.
      </p>

      <div className="space-y-5 max-w-md">
        <Alert msg={message} />

        {/* Toggle */}
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div>
            <Label className="text-sm font-medium">Enable AI features</Label>
            <p className="text-xs text-muted-foreground mt-0.5">
              Ice-breakers, topics, news summaries
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            disabled={saving}
            onClick={handleToggle}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
              enabled ? "bg-primary" : "bg-muted"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform duration-200 ease-in-out ${
                enabled ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {/* Model selector */}
        <div className="space-y-2">
          <Label htmlFor="aiModel">AI Model</Label>
          <select
            id="aiModel"
            value={model}
            onChange={handleModelChange}
            disabled={saving || !enabled}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {AI_MODELS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">
            Flash models are faster and cheaper. Pro models produce better quality but cost more.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─── Shared ─── */

function Field({
  label,
  id,
  type = "text",
  value,
  onChange,
  required,
  minLength,
}: {
  label: string;
  id: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  minLength?: number;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        minLength={minLength}
      />
    </div>
  );
}

function Alert({ msg }: { msg: Msg | null }) {
  if (!msg) return null;
  return (
    <div
      className={`rounded-lg px-4 py-3 text-sm ${
        msg.type === "success"
          ? "bg-green-500/10 border border-green-500/20 text-green-400"
          : "bg-destructive/10 border border-destructive/20 text-destructive"
      }`}
    >
      {msg.text}
    </div>
  );
}
