"use client";

import { useEffect, useState, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AdminSidebar } from "./sidebar";
import { Toaster } from "sonner";

interface AdminUser {
  id: number;
  email: string;
  name: string;
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isLoginPage = pathname === "/admin/login";

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (isLoginPage) {
      setLoading(false);
      return;
    }

    fetch("/api/admin/auth/me")
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data) => setUser(data.user))
      .catch(() => router.push("/admin/login"))
      .finally(() => setLoading(false));
  }, [isLoginPage, router]);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => !prev);
  }, []);

  // Login page — no shell
  if (isLoginPage) {
    return (
      <div className="dark">
        {children}
        <Toaster theme="dark" position="top-right" richColors closeButton />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="dark min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <div className="size-8 rounded-full border-2 border-muted" />
            <div className="absolute inset-0 size-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div
      className="dark fixed inset-0 bg-background text-foreground"
      style={{ overflow: "hidden", height: "100vh" }}
    >
      <AdminSidebar user={user} open={sidebarOpen} onToggle={toggleSidebar} />
      <main className="pt-14 md:pt-0 md:ml-56 h-full overflow-y-auto">{children}</main>
      <Toaster theme="dark" position="top-right" richColors closeButton />
    </div>
  );
}
