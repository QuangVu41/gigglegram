"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

export default function NotFound() {
  const t = useTranslations("NotFoundPage");

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 text-center animate-in fade-in zoom-in duration-300 text-foreground">
      <h2 className="text-2xl font-bold mb-6">{t("title")}</h2>
      <p className="text-base text-muted-foreground max-w-md">
        {t("description")}{" "}
        <Link href="/" className="text-primary hover:underline font-medium">
          {t("goBack")}
        </Link>
      </p>
    </div>
  );
}
