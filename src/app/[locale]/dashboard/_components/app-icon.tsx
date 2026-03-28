"use client";

import { Link } from "@/i18n/navigation";
import { Lock } from "lucide-react";
import {
  Brain, FileText, Timer, Calculator,
  BookOpen, Laugh, Bot, Gamepad2,
} from "lucide-react";

const iconMap = {
  Brain, FileText, Timer, Calculator,
  BookOpen, Laugh, Bot, Gamepad2,
} as const;

export type AppIconKey = keyof typeof iconMap;

interface AppIconProps {
  name: string;
  iconKey: AppIconKey;
  gradient: string;
  available: boolean;
  href: string;
  isNew?: boolean;
}

export function AppIcon({ name, iconKey, gradient, available, href, isNew }: AppIconProps) {
  const Icon = iconMap[iconKey];

  const inner = (
    <div className="flex flex-col items-center gap-2 group w-20">
      {/* Icon */}
      <div className={`relative w-16 h-16 rounded-[22px] bg-gradient-to-br ${gradient} shadow-md flex items-center justify-center overflow-hidden transition-all duration-200 ${available ? "group-hover:-translate-y-1 group-hover:shadow-lg" : "opacity-60"}`}>
        {/* Shine gloss */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent pointer-events-none" />
        <Icon className="w-8 h-8 text-white relative z-10 drop-shadow-sm" />
        {/* Lock overlay */}
        {!available && (
          <div className="absolute inset-0 bg-black/20 rounded-[22px] flex items-center justify-center">
            <Lock className="w-5 h-5 text-white/80 drop-shadow" />
          </div>
        )}
        {/* NEW badge */}
        {isNew && available && (
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center z-20 shadow-sm">
            <span className="text-[9px] text-white font-black">N</span>
          </div>
        )}
      </div>
      {/* Label */}
      <span className={`text-[11px] font-medium text-center leading-tight line-clamp-2 w-full transition-colors ${available ? "text-gray-600 group-hover:text-gray-900" : "text-gray-400"}`}>
        {name}
      </span>
    </div>
  );

  if (!available) {
    return <div className="cursor-not-allowed select-none">{inner}</div>;
  }

  return (
    <Link href={href} className="focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 rounded-2xl">
      {inner}
    </Link>
  );
}
