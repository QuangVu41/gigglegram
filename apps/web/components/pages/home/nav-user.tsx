"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";
import { useHandleBAAction } from "@/hooks/use-handle-ba-action";
import { authClient } from "@/lib/auth/auth-client";
import { getUsernameFallback } from "@/lib/utils";
import { Archive, BadgeCheck, Bookmark, ChevronsUpDown, LogOut, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

const NavUser = () => {
  const { isMobile, open } = useSidebar();
  const { data } = authClient.useSession();
  const { handleBAAction } = useHandleBAAction();
  const t = useTranslations("NavUser");
  const router = useRouter();
  const user = data?.user;

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
              <SidebarMenuButton className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground group-data-[collapsible=icon]:size-auto! h-auto! w-full">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={user.image || "/default-avatar.png"} alt={user.name} />
                  <AvatarFallback className="rounded-lg">{getUsernameFallback(user.name)}</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user.name}</span>
                  <span className="truncate text-xs">{user.email}</span>
                </div>
                <ChevronsUpDown className={`ml-auto size-4 ${!open ? "hidden" : ""}`} />
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
                    <AvatarImage src={user.image || "/default-avatar.png"} alt={user.name} />
                    <AvatarFallback className="rounded-lg">CN</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{user.name}</span>
                    <span className="truncate text-xs">{user.email}</span>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem>
                  <Sparkles />
                  {t("yourActivity")}
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem>
                  <BadgeCheck />
                  {t("account")}
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Archive />
                  {t("archived")}
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Bookmark />
                  {t("saved")}
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
