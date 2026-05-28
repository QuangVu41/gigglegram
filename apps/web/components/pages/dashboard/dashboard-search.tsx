"use client";

import * as React from "react";
import { Search, Settings, Shield, User, LayoutDashboard } from "lucide-react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import {
  NAV_DASHBOARD,
  type DashboardNavItem,
} from "@/constants/nav-dashboard";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ButtonGroup, ButtonGroupText } from "@/components/ui/button-group";
import { Kbd } from "@/components/ui/kbd";

export function DashboardSearch() {
  const [open, setOpen] = React.useState(false);
  const t = useTranslations("Dashboard.sidebar");
  const tSearch = useTranslations("Dashboard.search");
  const router = useRouter();

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const flattenedNav = React.useMemo(() => {
    const items: { title: string; url: string; icon?: any }[] = [];

    const traverse = (navItems: DashboardNavItem[]) => {
      navItems.forEach((item) => {
        if (item.url !== "#") {
          items.push({ title: item.title, url: item.url, icon: item.icon });
        }
        if (item.items) {
          traverse(item.items);
        }
      });
    };

    traverse(NAV_DASHBOARD);
    return items;
  }, []);

  const runCommand = React.useCallback((command: () => void) => {
    setOpen(false);
    command();
  }, []);

  return (
    <>
      <ButtonGroup className="w-full sm:w-64 md:w-80 lg:w-96">
        <Button
          variant="outline"
          className="flex-1 justify-start bg-muted/50 text-muted-foreground hover:bg-accent hover:text-accent-foreground rounded-full"
          onClick={() => setOpen(true)}
        >
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50 transition-colors group-hover:text-primary group-hover:opacity-100" />
          <span className="inline-flex">{tSearch("placeholder")}</span>
        </Button>
        <ButtonGroupText className="bg-muted/30 px-1 hidden sm:flex rounded-full">
          <Kbd className="bg-transparent border-none h-6 text-xs">⌘K</Kbd>
        </ButtonGroupText>
      </ButtonGroup>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder={tSearch("dialogPlaceholder")} />
        <CommandList className="max-h-[500px]">
          <CommandEmpty>{tSearch("noResults")}</CommandEmpty>
          <CommandGroup heading={tSearch("navigation")}>
            {flattenedNav.map((item) => (
              <CommandItem
                key={item.url}
                value={t(`nav.${item.title}`)}
                onSelect={() => runCommand(() => router.push(item.url))}
              >
                {item.icon ? (
                  <item.icon className="mr-2 h-4 w-4" />
                ) : (
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                )}
                <span>{t(`nav.${item.title}`)}</span>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading={tSearch("management")}>
            <CommandItem
              onSelect={() => runCommand(() => router.push("/dashboard/users"))}
            >
              <User className="mr-2 h-4 w-4" />
              <span>{tSearch("searchUsers")}</span>
            </CommandItem>
            <CommandItem
              onSelect={() =>
                runCommand(() => router.push("/dashboard/reports"))
              }
            >
              <Shield className="mr-2 h-4 w-4" />
              <span>{tSearch("reviewReports")}</span>
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading={tSearch("settings")}>
            <CommandItem
              onSelect={() =>
                runCommand(() => router.push("/dashboard/settings"))
              }
            >
              <Settings className="mr-2 h-4 w-4" />
              <span>{tSearch("globalSettings")}</span>
              <CommandShortcut>⌘S</CommandShortcut>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
