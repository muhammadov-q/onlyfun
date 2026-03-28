import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export function CtaSection() {
  const t = useTranslations("cta");
  return (
    <section className="py-24 bg-gray-900 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(249,115,22,0.15),transparent_60%)]" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-orange-500/50 to-transparent" />
      <div className="container mx-auto px-4 relative z-10 text-center">
        <h2 className="text-4xl sm:text-5xl font-black text-white mb-4 tracking-tight">{t("title")}</h2>
        <p className="text-lg text-white/60 mb-10">{t("subtitle")}</p>
        <Link href="/auth/register">
          <Button size="xl" className="group">
            {t("button")}
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Button>
        </Link>
      </div>
    </section>
  );
}
