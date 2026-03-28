import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export function Footer() {
  const t = useTranslations("footer");
  return (
    <footer className="bg-white border-t border-gray-200 py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-3">
              <span className="text-xl">🦫</span>
              <span className="text-lg font-black">
                <span className="text-gray-900">ONLY</span>
                <span className="bg-gradient-to-r from-brand-orange to-brand-pink bg-clip-text text-transparent">FUN</span>
              </span>
            </Link>
            <p className="text-sm text-gray-500 leading-relaxed">{t("tagline")}</p>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-3">{t("product")}</h4>
            <ul className="space-y-2">
              {(["features", "pricing", "changelog"] as const).map((k) => (
                <li key={k}><a href={k === "features" ? "#features" : "#"} className="text-sm text-gray-500 hover:text-gray-900 transition-colors">{t(k)}</a></li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-3">{t("company")}</h4>
            <ul className="space-y-2">
              {(["about", "blog", "contact"] as const).map((k) => (
                <li key={k}><a href="#" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">{t(k)}</a></li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-3">{t("legal")}</h4>
            <ul className="space-y-2">
              {(["privacy", "terms"] as const).map((k) => (
                <li key={k}><a href="#" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">{t(k)}</a></li>
              ))}
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-100 pt-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-gray-400">{t("copyright")}</p>
          <p className="text-xs text-gray-400">{t("madeWith")}</p>
        </div>
      </div>
    </footer>
  );
}
