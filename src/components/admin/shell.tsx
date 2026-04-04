"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AdminSidebar } from "./sidebar";

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

  const isLoginPage = pathname === "/admin/login";

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

  // Login page — no shell
  if (isLoginPage) {
    return <div className="dark">{children}</div>;
  }

  if (loading) {
    return (
      <div className="dark min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground text-sm">Loading...</div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div
      className="dark fixed inset-0 bg-background text-foreground"
      style={{ overflow: "hidden", height: "100vh" }}
    >
      <AdminSidebar user={user} />
      <main className="ml-56 h-full overflow-y-auto">{children}</main>
    </div>
  );
}
