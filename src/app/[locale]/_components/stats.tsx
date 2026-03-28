import { useTranslations } from "next-intl";

const stats = [
  { value: "10K+",  key: "students",  emoji: "🎓" },
  { value: "8",     key: "tools",     emoji: "🛠️" },
  { value: "50+",   key: "countries", emoji: "🌍" },
  { value: "99.9%", key: "uptime",    emoji: "⚡" },
];

export function Stats() {
  const t = useTranslations("stats");
  return (
    <section className="py-16 bg-white border-y border-gray-100">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map(({ value, key, emoji }) => (
            <div key={key} className="text-center">
              <div className="text-3xl mb-2">{emoji}</div>
              <div className="text-3xl sm:text-4xl font-black mb-1 bg-gradient-to-r from-brand-orange to-brand-pink bg-clip-text text-transparent">{value}</div>
              <div className="text-sm text-gray-500">{t(key as "students" | "tools" | "countries" | "uptime")}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
