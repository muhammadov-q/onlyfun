"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Eye, EyeOff } from "lucide-react";

const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});
type RegisterValues = z.infer<typeof registerSchema>;

export function RegisterForm() {
  const t = useTranslations("auth.register");
  const router = useRouter();
  const locale = useLocale();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState("");

  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<RegisterValues>({ resolver: zodResolver(registerSchema) });

  const onSubmit = async (data: RegisterValues) => {
    setServerError("");
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) {
      setServerError(json.error === "Email already in use" ? t("errors.emailTaken") : t("errors.generic"));
      return;
    }
    const result = await signIn("credentials", { email: data.email, password: data.password, redirect: false });
    if (result?.error) { setServerError(t("errors.generic")); return; }
    router.push(`/${locale}/onboarding`);
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {serverError && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {serverError}
        </div>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="email">{t("email")}</Label>
        <Input id="email" type="email" placeholder={t("emailPlaceholder")} {...register("email")} aria-invalid={!!errors.email} />
        {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">{t("password")}</Label>
        <div className="relative">
          <Input id="password" type={showPassword ? "text" : "password"} placeholder={t("passwordPlaceholder")} {...register("password")} />
          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
      </div>
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? t("submitting") : t("submit")}
      </Button>
      <p className="text-center text-xs text-gray-400">{t("terms")}</p>
      <p className="text-center text-sm text-gray-500">
        {t("hasAccount")}{" "}
        <Link href="/auth/login" className="text-brand-orange hover:text-orange-600 font-medium transition-colors">{t("login")}</Link>
      </p>
    </form>
  );
}
