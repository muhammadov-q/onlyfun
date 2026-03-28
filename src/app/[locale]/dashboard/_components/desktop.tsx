"use client";

import { DesktopIcon, type DesktopIconDef } from "./desktop-icon";
import { Taskbar } from "./taskbar";

interface DesktopProps {
  username: string;
  role: string;
  locale: string;
  addons: DesktopIconDef[];
}

export function Desktop({ username, role, locale, addons }: DesktopProps) {
  const taskbarAddons = addons
    .filter((a) => a.available)
    .map((a) => ({
      key: a.key,
      emoji: a.emoji,
      gradient: a.gradient,
      shadow: a.shadow,
      label: a.name,
    }));

  return (
    <div
      className="fixed inset-0 overflow-hidden select-none"
      style={{
        backgroundImage: "url('/background.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        cursor: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E%3Ctext y='28' font-size='28'%3E%F0%9F%A6%AB%3C/text%3E%3C/svg%3E\") 4 4, auto",
      }}
    >
      {/* Subtle readability overlay */}
      <div className="absolute inset-0 bg-black/10 pointer-events-none" />

      {/* Desktop icons — column grid top-left */}
      <div
        className="absolute top-4 left-4 overflow-y-auto"
        style={{ bottom: "60px" }}
      >
        <div
          className="flex flex-col flex-wrap gap-4 content-start"
          style={{ maxHeight: "calc(100vh - 76px)" }}
        >
          {addons.map((addon) => (
            <DesktopIcon
              key={addon.key}
              name={addon.name}
              emoji={addon.emoji}
              gradient={addon.gradient}
              shadow={addon.shadow}
              rotation={addon.rotation}
              available={addon.available}
              isNew={addon.isNew}
              href={`/${locale}/addons/${addon.key}`}
            />
          ))}
        </div>
      </div>

      {/* Taskbar */}
      <Taskbar
        username={username}
        role={role}
        locale={locale}
        addons={taskbarAddons}
      />
    </div>
  );
}
