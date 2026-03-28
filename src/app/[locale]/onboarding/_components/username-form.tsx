"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, AtSign, CheckCircle2 } from "lucide-react";

const usernameSchema = z.object({
  username: z
    .string()
    .min(3, "At least 3 characters")
    .max(20, "At most 20 characters")
    .regex(/^[a-z0-9_]+$/, "Only lowercase letters, numbers and underscores"),
});
type UsernameValues = z.infer<typeof usernameSchema>;

export function UsernameForm() {
  const t = useTranslations("onboarding");
  const router = useRouter();
  const locale = useLocale();
  const [serverError, setServerError] = useState("");

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } =
    useForm<UsernameValues>({ resolver: zodResolver(usernameSchema) });

  const usernameValue = watch("username") ?? "";
  const isValid = usernameValue.length >= 3 && /^[a-z0-9_]+$/.test(usernameValue);

  const onSubmit = async (data: UsernameValues) => {
    setServerError("");
    const res = await fetch("/api/user/username", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: data.username }),
    });
    const json = await res.json();
    if (!res.ok) {
      setServerError(json.error === "Username already taken" ? t("errors.usernameTaken") : t("errors.generic"));
      return;
    }
    router.push(`/${locale}/dashboard`);
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
        <Label htmlFor="username">{t("username")}</Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><AtSign className="w-4 h-4" /></span>
          <Input
            id="username"
            type="text"
            placeholder={t("usernamePlaceholder")}
            className="pl-9 pr-9"
            {...register("username")}
            onChange={(e) => {
              e.target.value = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "");
              register("username").onChange(e);
            }}
          />
          {isValid && <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />}
        </div>
        {errors.username
          ? <p className="text-xs text-red-500">{errors.username.message}</p>
          : <p className="text-xs text-gray-400">{t("usernameHint")}</p>}
      </div>
      <Button type="submit" className="w-full" size="lg" disabled={isSubmitting || !isValid}>
        {isSubmitting ? t("submitting") : t("submit")}
      </Button>
    </form>
  );
}
