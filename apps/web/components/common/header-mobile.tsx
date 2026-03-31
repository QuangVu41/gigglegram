import Link from "next/link";
import { Button } from "@/components/ui/button";
import { NAV_MAIN } from "@/constants/nav-main";
import LogoText from "@/components/common/logo-text";
import { SearchCommand } from "@/components/common/search-command";
import { useTranslations } from "next-intl";

export function HeaderMobile() {
  const t = useTranslations("NavMain");
  // We extract these specifically for the top-right header slots
  const notifications = NAV_MAIN.find((item) => item.key === "notifications");

  return (
    <nav className="relative h-16 md:hidden">
      <header className="fixed top-0 left-0 right-0 z-50 flex gap-2 h-16 items-center justify-between border-b bg-sidebar px-4 backdrop-blur">
        {/* Brand / Logo */}
        <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80 shrink-0 mr-2">
          <LogoText className="w-36" />
        </Link>
        {/* 1. The Search Bar Area */}
        <SearchCommand className="w-64 ml-auto" />
        {/* Header Actions */}
        <div className="flex items-center gap-1">
          {notifications && (
            <Button variant="ghost" size="icon" asChild className="relative p-2 size-auto!">
              <Link href={notifications.url}>
                <notifications.icon className="h-8! w-8! stroke-sidebar-accent-foreground" />
                {/* // TODO: Add a red dot for "unread" notifications */}
                {/* <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-destructive" /> */}
                <span className="sr-only">{t(notifications.key)}</span>
              </Link>
            </Button>
          )}
        </div>
      </header>
    </nav>
  );
}
