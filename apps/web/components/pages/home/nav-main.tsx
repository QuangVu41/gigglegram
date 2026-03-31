"use client";

import NavDropdownItem from "@/components/common/nav-dropdown-item";
import { SearchCommand } from "@/components/common/search-command";
import { AnimatedThemeToggle } from "@/components/ui/animated-theme-toggle";
import { SidebarGroup, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { NAV_MAIN } from "@/constants/nav-main";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NavMain = () => {
  const pathname = usePathname();
  const t = useTranslations("NavMain");

  return (
    <SidebarGroup>
      <SidebarMenu className="gap-4">
        {NAV_MAIN.map((item) => (
          <SidebarMenuItem key={item.key}>
            {item.key === "search" ? (
              <SearchCommand>
                <SidebarMenuButton
                  isActive={pathname === item.url}
                  className="overflow-visible group-data-[collapsible=icon]:size-auto! h-auto!"
                >
                  <item.icon className={`w-8! h-8! ${pathname === item.url ? "stroke-3" : ""}`} />
                  <span className="text-xl">{t(item.key)}</span>
                </SidebarMenuButton>
              </SearchCommand>
            ) : item.type === "dropdown" ? (
              <NavDropdownItem navItem={item}>
                <SidebarMenuButton
                  isActive={pathname === item.url}
                  className="overflow-visible group-data-[collapsible=icon]:size-auto! h-auto!"
                  asChild
                >
                  <Link href={item.url}>
                    <item.icon className={`w-8! h-8! ${pathname === item.url ? "stroke-3" : ""}`} />
                    <span className="text-xl">{t(item.key)}</span>
                  </Link>
                </SidebarMenuButton>
              </NavDropdownItem>
            ) : (
              <SidebarMenuButton
                isActive={pathname === item.url}
                className="overflow-visible group-data-[collapsible=icon]:size-auto! h-auto!"
                asChild
              >
                <Link href={item.url}>
                  <item.icon className={`w-8! h-8! ${pathname === item.url ? "stroke-3" : ""}`} />
                  <span className="text-xl">{t(item.key)}</span>
                </Link>
              </SidebarMenuButton>
            )}
          </SidebarMenuItem>
        ))}
        <AnimatedThemeToggle
          size="lg"
          className="cursor-pointer h-12! justify-start! text-xl! font-normal truncate"
          iconClassName="size-8!"
        >
          {t("appearance")}
        </AnimatedThemeToggle>
      </SidebarMenu>
    </SidebarGroup>
  );
};

export default NavMain;
