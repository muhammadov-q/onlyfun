import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import Image from "next/image";

export function Hero() {
  const t = useTranslations("hero");

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16 bg-white">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_50%,rgba(249,115,22,0.06),transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_80%,rgba(236,72,153,0.05),transparent_60%)]" />
      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage: "linear-gradient(rgba(0,0,0,1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,1) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="container mx-auto px-4 relative z-10">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
          <div className="flex-1 text-center lg:text-left max-w-2xl">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-50 border border-orange-200 text-sm text-orange-700 mb-8 font-medium">
              <Sparkles className="w-4 h-4 text-brand-orange" />
              {t("badge")}
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black leading-tight mb-6 tracking-tight text-gray-900">
              <span className="block">{t("title")}</span>
              <span className="bg-gradient-to-r from-brand-orange via-brand-pink to-brand-purple bg-clip-text text-transparent block animate-gradient-shift bg-[length:200%_200%]">
                {t("titleHighlight")}
              </span>
            </h1>

            <p className="text-lg text-gray-500 leading-relaxed mb-10 max-w-xl mx-auto lg:mx-0">
              {t("subtitle")}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Link href="/auth/register">
                <Button size="xl" className="group w-full sm:w-auto">
                  {t("cta")}
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link href="/auth/login">
                <Button variant="outline" size="xl" className="w-full sm:w-auto">{t("ctaSecondary")}</Button>
              </Link>
            </div>

            <div className="mt-10 flex items-center gap-3 justify-center lg:justify-start">
              <div className="flex -space-x-2">
                {["🧑‍🎓", "👩‍🎓", "🧑‍💻", "👩‍💻", "🎓"].map((emoji, i) => (
                  <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-orange to-brand-pink border-2 border-white flex items-center justify-center text-sm shadow-sm">
                    {emoji}
                  </div>
                ))}
              </div>
              <p className="text-sm text-gray-500">{t("trustedBy")}</p>
            </div>
          </div>

          <div className="flex-shrink-0 relative">
            <div className="relative w-[320px] h-[220px] sm:w-[440px] sm:h-[300px] animate-float">
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-orange-100 via-pink-100 to-blue-100 blur-2xl scale-110 opacity-60" />
              <Image src="/logo.svg" alt="OnlyFun" fill className="object-contain drop-shadow-xl relative z-10" priority />
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent" />
    </section>
  );
}
