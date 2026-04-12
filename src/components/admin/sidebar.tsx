"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  LayoutDashboard,
  MessageSquare,
  Users,
  Settings,
  ChevronsUpDown,
  LogOut,
  Newspaper,
  CalendarDays,
  PenLine,
  Menu,
  X,
} from "lucide-react";

interface AdminUser {
  id: number;
  email: string;
  name: string;
}

const NAV_ITEMS = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Rooms", href: "/admin/rooms", icon: MessageSquare },
  { label: "Users", href: "/admin/users", icon: Users },
  { label: "News", href: "/admin/news", icon: Newspaper },
  { label: "Events", href: "/admin/events", icon: CalendarDays },
  { label: "Podcast", href: "/admin/podcast", icon: PenLine },
  { label: "Settings", href: "/admin/settings", icon: Settings },
];

export function AdminSidebar({
  user,
  open,
  onToggle,
}: {
  user: AdminUser;
  open: boolean;
  onToggle: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/admin/auth/logout", { method: "POST" });
    router.push("/admin/login");
  }

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <>
      {/* Mobile header bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-card border-b border-border flex items-center px-4 z-40">
        <button
          onClick={onToggle}
          className="p-2 -ml-2 rounded-xl hover:bg-accent/50 transition-colors"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2 ml-3">
          <Image src="/logo.svg" alt="onlyfun" width={24} height={24} className="invert" />
          <span className="text-sm font-bold text-foreground">onlyfun</span>
          <span className="text-muted-foreground text-[10px] bg-muted px-1.5 py-0.5 rounded-full">
            admin
          </span>
        </div>
      </div>

      {/* Mobile overlay */}
      {open && <div className="md:hidden fixed inset-0 bg-black/60 z-40" onClick={onToggle} />}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 w-56 border-r border-border bg-card flex flex-col z-50 transition-transform duration-200 ease-in-out ${
          open ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0`}
      >
        {/* Logo */}
        <div className="h-14 flex items-center gap-2 px-5">
          <Image src="/logo.svg" alt="onlyfun" width={28} height={28} className="invert" />
          <span className="text-base font-bold text-foreground">onlyfun</span>
          <span className="text-muted-foreground text-[10px] bg-muted px-1.5 py-0.5 rounded-full">
            admin
          </span>
          {/* Mobile close button */}
          <button
            onClick={onToggle}
            className="md:hidden ml-auto p-1 rounded-lg hover:bg-accent/50 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <Separator />

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onToggle}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-colors ${
                  isActive
                    ? "bg-accent text-accent-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User footer */}
        <div className="p-3 border-t border-border">
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-3 w-full px-3 py-2 rounded-xl hover:bg-accent/50 transition-colors outline-none cursor-pointer">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="bg-accent text-accent-foreground text-[10px]">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{user.name}</p>
                <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
              </div>
              <ChevronsUpDown className="h-4 w-4 text-muted-foreground shrink-0" />
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start" className="w-48">
              <DropdownMenuItem onClick={() => router.push("/admin/settings")}>
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-destructive focus:text-destructive"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>
    </>
  );
}
