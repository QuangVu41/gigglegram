"use client";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Languages } from "lucide-react";
import { setLocale } from "@/actions/locale/setLocale";
import { routing } from "@/i18n/routing";
import { ComponentProps } from "react";
import { VariantProps } from "class-variance-authority";

const locales = routing.locales.map((locale) => ({
  code: locale,
  name: locale === "en" ? "English" : "Tiếng Việt",
  flag: locale === "en" ? "🇺🇸" : "🇻🇳",
}));

export function LocaleSwitcher({ variant }: ComponentProps<"button"> & VariantProps<typeof buttonVariants>) {
  const handleLocaleChange = async (locale: string) => {
    await setLocale(locale);
    document.documentElement.lang = locale;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size="icon">
          <Languages className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {locales.map((locale) => (
          <DropdownMenuItem key={locale.code} onClick={() => handleLocaleChange(locale.code)}>
            <span className="mr-2">{locale.flag}</span>
            {locale.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
