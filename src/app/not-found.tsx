"use client";

import Image from "next/image";
import Link from "next/link";
import { useI18n } from "@/i18n";

export default function NotFound() {
  const { t } = useI18n();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-black text-white">
      <Image src="/logo.svg" alt="onlyfun" width={120} height={100} className="invert" />
      <h1 className="text-6xl font-bold tracking-tight">{t("notFound.title")}</h1>
      <p className="text-lg text-neutral-400">{t("notFound.message")}</p>
      <Link
        href="/"
        className="mt-2 rounded-full bg-white px-6 py-2 text-sm font-medium text-black transition hover:bg-neutral-200"
      >
        {t("notFound.goHome")}
      </Link>
    </div>
  );
}
