"use client";

import * as React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useHandleBAAction } from "@/hooks/use-handle-ba-action";
import { authClient } from "@/lib/auth/auth-client";
import { cn, getUsernameFallback } from "@/lib/utils";
import {
  Archive,
  BadgeCheck,
  Bookmark,
  Building2,
  Check,
  ChevronsUpDown,
  LayoutDashboard,
  LogOut,
  Sparkles,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { getFirstPermittedPage } from "@/constants/nav-dashboard";

const NavUser = ({
  className,
  size,
}: {
  className?: string;
  size?: "default" | "sm" | "md" | "lg" | null | undefined;
}) => {
  const { isMobile, open } = useSidebar();
  const { data } = authClient.useSession();
  const { handleBAAction } = useHandleBAAction();
  const t = useTranslations("NavUser");
  const router = useRouter();
  const user = data?.user;

  const { data: organizations } = authClient.useListOrganizations();
  const { data: activeOrganization } = authClient.useActiveOrganization();

  const { data: roles } = useQuery({
    queryKey: ["org-roles", activeOrganization?.id],
    queryFn: async () => {
      const response = await authClient.organization.listRoles();
      return response.data || [];
    },
    enabled: !!activeOrganization?.id,
  });

  const userPermissions = React.useMemo(() => {
    return (roles?.[0]?.permission as Record<string, string[]>) || {};
  }, [roles]);

  const firstPermittedPage = React.useMemo(() => {
    return getFirstPermittedPage(userPermissions) || "/dashboard";
  }, [userPermissions]);

  const handleLogout = async () => {
    await handleBAAction(() => authClient.signOut());
    router.push("/accounts/login");
  };

  return (
    user && (
      <SidebarMenu className="overflow-hidden rounded-md">
        <SidebarMenuItem>
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size={size}
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground group-data-[collapsible=icon]:size-auto! h-auto! w-full"
              >
                <Avatar className={cn("h-8 w-8 rounded-lg", className)}>
                  <AvatarImage src={`/${user.image}`} alt={user.name} />
                  <AvatarFallback className="rounded-lg">
                    {getUsernameFallback(user.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user.name}</span>
                  <span className="truncate text-xs">{user.email}</span>
                </div>
                <ChevronsUpDown
                  className={`ml-auto size-4 ${!open ? "hidden" : ""}`}
                />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
              side={isMobile ? "bottom" : "right"}
              align="end"
              sideOffset={4}
            >
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage
                      src={`/${user.image}` || "/default-avatar.png"}
                      alt={user.name}
                    />
                    <AvatarFallback className="text-xs">
                      {getUsernameFallback(user?.name ?? "")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{user.name}</span>
                    <span className="truncate text-xs">{user.email}</span>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                {organizations && organizations.length > 1 && (
                  <DropdownMenuItem asChild>
                    <Link href={firstPermittedPage}>
                      <LayoutDashboard />
                      {t("dashboard")}
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <Building2 />
                    {t("organizations")}
                  </DropdownMenuSubTrigger>
                  <DropdownMenuPortal>
                    <DropdownMenuSubContent className="min-w-48">
                      {organizations?.map((org) => (
                        <DropdownMenuItem
                          key={org.id}
                          onClick={() =>
                            authClient.organization.setActive({
                              organizationId: org.id,
                            })
                          }
                        >
                          <div className="flex flex-1 items-center justify-between gap-2">
                            <span className="truncate">{org.name}</span>
                            {activeOrganization?.id === org.id && (
                              <Check className="size-4" />
                            )}
                          </div>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuPortal>
                </DropdownMenuSub>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem asChild>
                  <Link href="/activity">
                    <Sparkles />
                    {t("yourActivity")}
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem asChild>
                  <Link href={`/${user.username}`}>
                    <BadgeCheck />
                    {t("account")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/archive">
                    <Archive />
                    {t("archived")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/${user.username}?tab=saved`}>
                    <Bookmark />
                    {t("saved")}
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut />
                {t("logOut")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>
    )
  );
};

export default NavUser;
