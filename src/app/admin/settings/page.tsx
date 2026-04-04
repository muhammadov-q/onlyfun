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
