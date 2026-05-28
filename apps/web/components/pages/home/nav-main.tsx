"use client";

import NavDropdownItem from "@/components/common/nav-dropdown-item";
import { SearchCommand } from "@/components/common/search-command";
import { NotificationSheet } from "@/components/common/notification-sheet";
import { AnimatedThemeToggle } from "@/components/ui/animated-theme-toggle";
import { Badge } from "@/components/ui/badge";
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { NAV_MAIN } from "@/constants/nav-main";
import { useNotifications } from "@/hooks/use-notifications";
import { useConversations } from "@/hooks/use-conversations";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { axiosGateway, OkResponse } from "@/lib/axios-config";
import { UserNotificationSetting } from "@/hooks/use-update-notification-settings";

const NavMain = () => {
  const pathname = usePathname();
  const t = useTranslations("NavMain");
  const [notifOpen, setNotifOpen] = useState(false);
  const { unreadCount } = useNotifications();
  const { data: conversations } = useConversations();
  const { data: userSettings } = useQuery({
    queryKey: ["user-notification-settings"],
    queryFn: async () => {
      const response = await axiosGateway.get<
        OkResponse<UserNotificationSetting>
      >("/api/users/notification-settings");
      return response.data.data;
    },
  });

  const hasUnreadMessages =
    ((userSettings?.messagesNotifications ?? true) &&
      conversations?.some((c) => {
        if (!c.notificationsEnabled) return false;
        if (!c.lastMessageAt) return false;
        if (!c.lastReadAt) return true;
        return new Date(c.lastMessageAt) > new Date(c.lastReadAt);
      })) ??
    false;

  return (
    <>
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
                    <item.icon
                      className={`w-8! h-8! ${pathname === item.url ? "stroke-3" : ""}`}
                    />
                    <span className="text-xl">{t(item.key)}</span>
                  </SidebarMenuButton>
                </SearchCommand>
              ) : item.key === "notifications" ? (
                <SidebarMenuButton
                  isActive={notifOpen}
                  className="overflow-visible group-data-[collapsible=icon]:size-auto! h-auto!"
                  onClick={() => setNotifOpen(true)}
                  asChild
                >
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <item.icon
                        className={`w-8! h-8! ${notifOpen ? "stroke-3" : ""}`}
                      />
                      {unreadCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 flex size-3 rounded-full bg-destructive border-2 border-background" />
                      )}
                    </div>
                    <span className="text-xl">{t(item.key)}</span>
                  </div>
                </SidebarMenuButton>
              ) : item.type === "dropdown" ? (
                <NavDropdownItem navItem={item}>
                  <SidebarMenuButton
                    isActive={pathname === item.url}
                    className="overflow-visible group-data-[collapsible=icon]:size-auto! h-auto!"
                    asChild
                  >
                    <Link href={item.url}>
                      <item.icon
                        className={`w-8! h-8! ${pathname === item.url ? "stroke-3" : ""}`}
                      />
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
                    <div className="relative">
                      <item.icon
                        className={`w-8! h-8! ${pathname === item.url ? "stroke-3" : ""}`}
                      />
                      {item.key === "messages" && hasUnreadMessages && (
                        <span className="absolute -top-0.5 -right-0.5 flex size-3 rounded-full bg-destructive border-2 border-background" />
                      )}
                    </div>
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

      <NotificationSheet open={notifOpen} onOpenChange={setNotifOpen} />
    </>
  );
};

export default NavMain;
