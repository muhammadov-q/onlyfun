import { Link } from "@/i18n/navigation";
import { ChevronLeft } from "lucide-react";

interface AddonMeta {
  key: string;
  name: string;
  gradient: string;
}

interface AddonShellProps {
  addon: AddonMeta;
  locale: string;
  children: React.ReactNode;
}

export function AddonShell({ addon, locale, children }: AddonShellProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/90 backdrop-blur-xl">
        <div className="max-w-screen-xl mx-auto px-6">
          <div className="flex h-14 items-center gap-3">
            <Link
              href={`/${locale}/dashboard`}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Dashboard
            </Link>

            <div className="h-4 w-px bg-gray-200" />

            <div className={`w-6 h-6 rounded-lg bg-gradient-to-br ${addon.gradient} flex items-center justify-center shadow-sm shrink-0`} />
            <span className="font-semibold text-gray-900 text-sm">{addon.name}</span>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-screen-xl mx-auto w-full px-6 py-8">
        {children}
      </main>
    </div>
  );
}
