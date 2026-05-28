"use client";

import { EyeOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

interface SensitiveContentOverlayProps {
  className?: string;
  size?: "sm" | "md";
}

export function SensitiveContentOverlay({
  className,
  size = "md",
}: SensitiveContentOverlayProps) {
  const t = useTranslations("Common.sensitiveContent");

  return (
    <div
      className={cn(
        "absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/60 backdrop-blur-3xl text-center px-4",
        className,
      )}
    >
      <div
        className={cn(
          "rounded-full bg-background/20 ring-1 ring-white/10",
          size === "sm" ? "p-2 mb-2" : "p-4 mb-6",
        )}
      >
        <EyeOff
          className={cn("text-white", size === "sm" ? "w-6 h-6" : "w-10 h-10")}
          strokeWidth={1.5}
        />
      </div>

      <h3
        className={cn(
          "font-bold text-white leading-tight",
          size === "sm" ? "text-xs mb-1" : "text-xl mb-2",
        )}
      >
        {t("title")}
      </h3>

      {size === "md" && (
        <p className="text-sm text-white/80 max-w-[280px] leading-relaxed">
          {t("description")}
        </p>
      )}
    </div>
  );
}
