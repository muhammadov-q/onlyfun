"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  RefreshCw,
  MoreHorizontal,
  AlertTriangle,
  Ban,
  LogOut,
  X,
  Pencil,
  Link2,
  Unlink,
} from "lucide-react";

interface UserData {
  id: string;
  name: string;
  ip: string;
  roomId: string | null;
  connected: boolean;
}

interface RoomData {
  id: string;
  topic: string;
}

interface BlockedUser {
  id: number;
  ip: string;
  name: string | null;
  reason: string | null;
  blocked_until: string;
  created_at: string;
}

interface NameLock {
  id: number;
  ip: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [rooms, setRooms] = useState<RoomData[]>([]);
  const [blocked, setBlocked] = useState<BlockedUser[]>([]);
  const [nameLocks, setNameLocks] = useState<NameLock[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [modal, setModal] = useState<{
    type: "warn" | "block" | "rename" | "edit-lock" | null;
    user: UserData | null;
    lock: NameLock | null;
  }>({ type: null, user: null, lock: null });
  const [warnMessage, setWarnMessage] = useState("");
  const [blockMinutes, setBlockMinutes] = useState("30");
  const [blockReason, setBlockReason] = useState("");
  const [renameTo, setRenameTo] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, blockedRes, locksRes] = await Promise.all([
        fetch("/api/admin/stats"),
        fetch("/api/admin/blocked"),
        fetch("/api/admin/name-locks"),
      ]);
      if (statsRes.ok) {
        const stats = await statsRes.json();
        setUsers(stats.realUsers.filter((u: UserData) => u.connected));
        setRooms(stats.realRooms);
      }
      if (blockedRes.ok) {
        const data = await blockedRes.json();
        setBlocked(data.blocked);
      }
      if (locksRes.ok) {
        const data = await locksRes.json();
        setNameLocks(data.locks);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  async function handleWarn() {
    if (!modal.user) return;
    setActionLoading(true);
    try {
      const res = await fetch("/api/admin/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "warn",
          userId: modal.user.id,
          message: warnMessage || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(`Failed to warn: ${data.error || res.statusText}`);
        return;
      }
      setModal({ type: null, user: null, lock: null });
      setWarnMessage("");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleBlock() {
    if (!modal.user) return;
    setActionLoading(true);
    try {
      // 1. Save block to DB (by IP)
      await fetch("/api/admin/blocked", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ip: modal.user.ip,
          name: modal.user.name,
          reason: blockReason || undefined,
          minutes: parseInt(blockMinutes) || 30,
        }),
      });
      // 2. Send block to WS server (kicks + notifies user)
      await fetch("/api/admin/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "block",
          userId: modal.user.id,
          minutes: parseInt(blockMinutes) || 30,
        }),
      });
      setModal({ type: null, user: null, lock: null });
      setBlockMinutes("30");
      setBlockReason("");
      fetchData();
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRename() {
    if (!modal.user || !renameTo.trim()) return;
    setActionLoading(true);
    try {
      await fetch("/api/admin/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "rename",
          userId: modal.user.id,
          message: renameTo.trim(),
        }),
      });
      setModal({ type: null, user: null, lock: null });
      setRenameTo("");
      fetchData();
    } finally {
      setActionLoading(false);
    }
  }

  async function handleKick(userId: string) {
    await fetch("/api/admin/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "kick", userId }),
    });
    fetchData();
  }

  async function handleUnblock(id: number) {
    await fetch("/api/admin/blocked", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    fetchData();
  }

  const [editLockName, setEditLockName] = useState("");

  async function handleEditLock() {
    if (!modal.lock || !editLockName.trim()) return;
    setActionLoading(true);
    try {
      await fetch("/api/admin/name-locks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: modal.lock.id, name: editLockName.trim() }),
      });
      setModal({ type: null, user: null, lock: null });
      setEditLockName("");
      fetchData();
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDeleteLock(id: number) {
    await fetch("/api/admin/name-locks", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    fetchData();
  }

  function getRoomTopic(roomId: string | null) {
    if (!roomId) return null;
    return rooms.find((r) => r.id === roomId)?.topic || null;
  }

  function isExpired(until: string) {
    return new Date(until).getTime() < Date.now();
  }

  function timeLeft(until: string) {
    const diff = new Date(until).getTime() - Date.now();
    if (diff <= 0) return "expired";
    const m = Math.ceil(diff / 60000);
    if (m < 60) return `${m}m left`;
    const h = Math.floor(m / 60);
    return `${h}h ${m % 60}m left`;
  }

  if (loading) {
    return <div className="p-8 text-muted-foreground text-sm">Loading users...</div>;
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold">Users</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {users.length} online &middot; auto-refresh 10s
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData}>
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          Refresh
        </Button>
      </div>

      {/* Connected users table */}
      {users.length === 0 ? (
        <div className="text-muted-foreground text-sm py-12 text-center">
          No users connected right now
        </div>
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground text-xs text-left">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">IP</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Room</th>
                <th className="px-4 py-3 font-medium w-16">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const roomTopic = getRoomTopic(user.roomId);
                return (
                  <tr
                    key={user.id}
                    className="border-b border-border last:border-0 hover:bg-accent/30 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium">{user.name}</td>
                    <td className="px-4 py-3 text-muted-foreground text-sm font-mono select-all">
                      {user.ip}
                    </td>
                    <td className="px-4 py-3">
                      {user.roomId ? (
                        <span className="text-green-400 text-xs">in room</span>
                      ) : (
                        <span className="text-muted-foreground text-xs">browsing</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs truncate max-w-[300px]">
                      {roomTopic || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger className="inline-flex items-center justify-center h-7 w-7 rounded-md hover:bg-accent transition-colors cursor-pointer">
                          <MoreHorizontal className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem
                            onClick={() => {
                              setModal({ type: "warn", user, lock: null });
                              setWarnMessage("");
                            }}
                          >
                            <AlertTriangle className="h-4 w-4 mr-2 text-yellow-400" />
                            Warn
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setModal({ type: "rename", user, lock: null });
                              setRenameTo(user.name);
                            }}
                          >
                            <Pencil className="h-4 w-4 mr-2" />
                            Rename
                          </DropdownMenuItem>
                          {user.roomId && (
                            <DropdownMenuItem onClick={() => handleKick(user.id)}>
                              <LogOut className="h-4 w-4 mr-2" />
                              Kick from room
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => {
                              setModal({ type: "block", user, lock: null });
                              setBlockMinutes("30");
                              setBlockReason("");
                            }}
                            className="text-destructive focus:text-destructive"
                          >
                            <Ban className="h-4 w-4 mr-2" />
                            Block
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Separator className="my-8" />

      {/* Blocked users */}
      <div>
        <h3 className="text-base font-medium mb-4">
          Blocked users
          {blocked.length === 0 && (
            <span className="text-muted-foreground font-normal text-sm ml-2">none</span>
          )}
        </h3>

        {blocked.length > 0 && (
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground text-xs text-left">
                  <th className="px-4 py-3 font-medium">IP</th>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Reason</th>
                  <th className="px-4 py-3 font-medium">Expires</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium w-16"></th>
                </tr>
              </thead>
              <tbody>
                {blocked.map((b) => (
                  <tr key={b.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 text-muted-foreground text-xs font-mono">{b.ip}</td>
                    <td className="px-4 py-3 font-medium">{b.name || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{b.reason || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {new Date(b.blocked_until).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      {isExpired(b.blocked_until) ? (
                        <span className="text-muted-foreground text-xs">expired</span>
                      ) : (
                        <span className="text-destructive text-xs">
                          {timeLeft(b.blocked_until)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => handleUnblock(b.id)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Separator className="my-8" />

      {/* Name locks */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Link2 className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-base font-medium">
            Name locks
            <span className="text-muted-foreground font-normal text-sm ml-2">
              {nameLocks.length} {nameLocks.length === 1 ? "entry" : "entries"}
            </span>
          </h3>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Each IP is locked to the first name used. Users cannot change their name from a different
          browser. Remove a lock to let the user pick a new name.
        </p>

        {nameLocks.length > 0 && (
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground text-xs text-left">
                  <th className="px-4 py-3 font-medium">IP</th>
                  <th className="px-4 py-3 font-medium">Locked name</th>
                  <th className="px-4 py-3 font-medium">Since</th>
                  <th className="px-4 py-3 font-medium">Updated</th>
                  <th className="px-4 py-3 font-medium w-24">Actions</th>
                </tr>
              </thead>
              <tbody>
                {nameLocks.map((lock) => (
                  <tr key={lock.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 text-muted-foreground text-xs font-mono">{lock.ip}</td>
                    <td className="px-4 py-3 font-medium">{lock.name}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {new Date(lock.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {new Date(lock.updated_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          title="Edit name"
                          onClick={() => {
                            setModal({ type: "edit-lock", user: null, lock });
                            setEditLockName(lock.name);
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                          title="Remove lock"
                          onClick={() => handleDeleteLock(lock.id)}
                        >
                          <Unlink className="h-3.5 w-3.5" />
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

      {/* Warn modal */}
      {modal.type === "warn" && modal.user && (
        <Modal onClose={() => setModal({ type: null, user: null, lock: null })}>
          <h3 className="text-base font-semibold mb-1">Warn {modal.user.name}</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Send a warning message. The user will see it as a popup.
          </p>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Message (optional)</Label>
              <Input
                placeholder="You have received a warning for misbehavior."
                value={warnMessage}
                onChange={(e) => setWarnMessage(e.target.value)}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setModal({ type: null, user: null, lock: null })}
              >
                Cancel
              </Button>
              <Button onClick={handleWarn} disabled={actionLoading}>
                {actionLoading ? "Sending..." : "Send warning"}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Rename modal */}
      {modal.type === "rename" && modal.user && (
        <Modal onClose={() => setModal({ type: null, user: null, lock: null })}>
          <h3 className="text-base font-semibold mb-1">Rename {modal.user.name}</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Change the user&apos;s display name. They will be notified.
          </p>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>New name</Label>
              <Input
                placeholder="New display name"
                value={renameTo}
                onChange={(e) => setRenameTo(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleRename()}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setModal({ type: null, user: null, lock: null })}
              >
                Cancel
              </Button>
              <Button onClick={handleRename} disabled={actionLoading || !renameTo.trim()}>
                {actionLoading ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Block modal */}
      {modal.type === "block" && modal.user && (
        <Modal onClose={() => setModal({ type: null, user: null, lock: null })}>
          <h3 className="text-base font-semibold mb-1">Block {modal.user.name}</h3>
          <p className="text-sm text-muted-foreground mb-4">
            The user will be disconnected and shown a &ldquo;blocked&rdquo; screen with a countdown.
          </p>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Duration (minutes)</Label>
              <Input
                type="number"
                min="1"
                value={blockMinutes}
                onChange={(e) => setBlockMinutes(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Reason (optional, internal)</Label>
              <Input
                placeholder="Spamming, toxicity, etc."
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setModal({ type: null, user: null, lock: null })}
              >
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleBlock} disabled={actionLoading}>
                {actionLoading ? "Blocking..." : "Block user"}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit name lock modal */}
      {modal.type === "edit-lock" && modal.lock && (
        <Modal onClose={() => setModal({ type: null, user: null, lock: null })}>
          <h3 className="text-base font-semibold mb-1">Edit name lock</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Change the locked name for IP <span className="font-mono">{modal.lock.ip}</span>. The
            user will use this name on their next connection.
          </p>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Locked name</Label>
              <Input
                placeholder="New locked name"
                value={editLockName}
                onChange={(e) => setEditLockName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleEditLock()}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setModal({ type: null, user: null, lock: null })}
              >
                Cancel
              </Button>
              <Button onClick={handleEditLock} disabled={actionLoading || !editLockName.trim()}>
                {actionLoading ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative bg-card border border-border rounded-xl p-6 w-full max-w-md shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
