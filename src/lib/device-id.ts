/**
 * Per-browser device token stored in both localStorage and a long-lived cookie.
 * Used instead of IP to identify returning users — handles shared networks correctly.
 */

const KEY = "onlyfun-did";
const COOKIE_DAYS = 365;

function readCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${KEY}=([^;]+)`));
  return match?.[1] ?? null;
}

function writeCookie(value: string) {
  if (typeof document === "undefined") return;
  const expires = new Date(Date.now() + COOKIE_DAYS * 864e5).toUTCString();
  document.cookie = `${KEY}=${value}; path=/; expires=${expires}; SameSite=Lax`;
}

function uuid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  // fallback
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/** Returns a stable device ID, creating one if needed. */
export function getDeviceId(): string {
  if (typeof window === "undefined") return "";

  // Check localStorage first, then cookie
  const fromStorage = localStorage.getItem(KEY);
  const fromCookie = readCookie();
  const id = fromStorage || fromCookie || uuid();

  // Ensure both stores are in sync
  if (!fromStorage) localStorage.setItem(KEY, id);
  if (!fromCookie || fromCookie !== id) writeCookie(id);

  return id;
}
