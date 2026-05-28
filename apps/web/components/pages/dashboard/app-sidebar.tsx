"use client";

import * as React from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from "@/components/ui/sidebar";
import { authClient } from "@/lib/auth/auth-client";
import {
  NAV_DASHBOARD,
  type DashboardNavItem,
} from "@/constants/nav-dashboard";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import NavMain from "./nav-main";
import Link from "next/link";
import Logo from "@/components/common/logo";
import NavUser from "@/components/pages/home/nav-user";
import { Skeleton } from "@/components/ui/skeleton";

export default function AppDashboardSidebar() {
  const { open } = useSidebar();

  const { data: activeOrg } = authClient.useActiveOrganization();

  const { data: roles, isLoading } = useQuery({
    queryKey: ["org-roles", activeOrg?.id],
    queryFn: async () => {
      const response = await authClient.organization.listRoles();
      return response.data || [];
    },
  });

  // Take the first item and check the permission key
  const userPermissions =
    (roles?.[0]?.permission as Record<string, string[]>) || {};

  const filterNavItems = (items: DashboardNavItem[]): DashboardNavItem[] => {
    return items
      .filter((item) => {
        if (!item.permission) return true;

        // Only display if userPermissions contains ALL required resource:actions
        return Object.entries(item.permission).every(
          ([resource, requiredActions]) => {
            const userActions = userPermissions[resource];
            if (!userActions) return false;

            return requiredActions.every((action) =>
              userActions.includes(action),
            );
          },
        );
      })
      .map((item) => ({
        ...item,
        items: item.items ? filterNavItems(item.items) : undefined,
      }))
      .filter((item) => !item.items || item.items.length > 0);
  };

  const filteredNav = filterNavItems(NAV_DASHBOARD);

  const t = useTranslations("Dashboard.sidebar.nav");

  return (
    <Sidebar variant="sidebar" collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/">
                <Logo className="size-8 shrink-0" />
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold text-foreground">
                    Gigglegram
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {t("dashboard")}
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {isLoading ? (
          <div className="p-4 space-y-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : (
          <NavMain items={filteredNav} />
        )}
      </SidebarContent>
      <SidebarFooter>
        <NavUser size="lg" />
      </SidebarFooter>
    </Sidebar>
  );
}
