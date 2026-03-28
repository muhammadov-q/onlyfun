import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Brain, FileText, Timer, Calculator, BookOpen, Laugh, Bot, Gamepad2 } from "lucide-react";

const addonConfig = {
  quiz:  { icon: Brain,      iconBg: "bg-orange-50", iconColor: "text-orange-500" },
  notes: { icon: FileText,   iconBg: "bg-blue-50",   iconColor: "text-blue-500" },
  timer: { icon: Timer,      iconBg: "bg-green-50",  iconColor: "text-green-500" },
  math:  { icon: Calculator, iconBg: "bg-purple-50", iconColor: "text-purple-500" },
  vocab: { icon: BookOpen,   iconBg: "bg-pink-50",   iconColor: "text-pink-500" },
  meme:  { icon: Laugh,      iconBg: "bg-yellow-50", iconColor: "text-yellow-600" },
  ai:    { icon: Bot,        iconBg: "bg-indigo-50", iconColor: "text-indigo-500" },
  games: { icon: Gamepad2,   iconBg: "bg-red-50",    iconColor: "text-red-500" },
} as const;

const comingSoon = new Set(["meme", "ai", "games"]);

export function Features() {
  const t = useTranslations("features");

  return (
    <section id="features" className="py-24 lg:py-32 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-black text-gray-900 mb-4 tracking-tight">{t("title")}</h2>
          <p className="text-lg text-gray-500 max-w-xl mx-auto leading-relaxed">{t("subtitle")}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {(Object.keys(addonConfig) as (keyof typeof addonConfig)[]).map((key) => {
            const { icon: Icon, iconBg, iconColor } = addonConfig[key];
            const isComing = comingSoon.has(key);
            return (
              <div key={key} className={`group p-6 rounded-2xl border bg-white transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${isComing ? "border-gray-200 opacity-75" : "border-gray-200 hover:border-gray-300 cursor-pointer"}`}>
                <div className={`inline-flex items-center justify-center w-11 h-11 rounded-xl ${iconBg} mb-4`}>
                  <Icon className={`w-5 h-5 ${iconColor}`} />
                </div>
                <h3 className="font-bold text-gray-900 mb-1">{t(`addons.${key}.name`)}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{t(`addons.${key}.desc`)}</p>
                {isComing && <div className="mt-3"><Badge variant="coming">{t("comingSoon")}</Badge></div>}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
