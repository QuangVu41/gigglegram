"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { NAV_MAIN } from "@/constants/nav-main";
import { useSidebar } from "@/components/ui/sidebar";
import { authClient } from "@/lib/auth/auth-client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { usePathname } from "next/navigation";
import { getUsernameFallback } from "@/lib/utils";
import NavDropdownItem from "@/components/common/nav-dropdown-item";
import { useConversations } from "@/hooks/use-conversations";
import { useQuery } from "@tanstack/react-query";
import { axiosGateway, OkResponse } from "@/lib/axios-config";
import { UserNotificationSetting } from "@/hooks/use-update-notification-settings";

export function NavBottom() {
  const pathname = usePathname();
  const { isMobile } = useSidebar();
  const { data } = authClient.useSession();
  const user = data?.user;
  const mobileNavItems = NAV_MAIN.filter((item) => item.mobileDisplay);

  const { data: conversations } = useConversations();
  const { data: userSettings } = useQuery({
    queryKey: ["user-notification-settings"],
    queryFn: async () => {
      const response = await axiosGateway.get<
        OkResponse<UserNotificationSetting>
      >("/api/users/notification-settings");
      return response.data.data;
    },
    enabled: !!user,
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
    isMobile &&
    user && (
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-sidebar backdrop-blur-md md:hidden">
        <nav className="flex h-16 items-center justify-around px-4 pb-[env(safe-area-inset-bottom)]">
          {mobileNavItems.map((item) => {
            if (item.type === "dropdown")
              return (
                <NavDropdownItem navItem={item} key={item.key}>
                  <Button
                    key={item.key}
                    variant="ghost"
                    size="icon"
                    asChild
                    className={`flex flex-col items-center justify-center hover:bg-sidebar-accent p-2 size-auto! ${pathname === item.url ? "bg-accent" : ""}`}
                  >
                    <Link href={item.url}>
                      <item.icon
                        className={`h-8! w-8! stroke-sidebar-accent-foreground ${pathname === item.url ? "stroke-3" : ""}`}
                      />
                      <span className="sr-only">{item.key}</span>
                    </Link>
                  </Button>
                </NavDropdownItem>
              );

            return (
              <Button
                key={item.key}
                variant="ghost"
                size="icon"
                asChild
                className={`flex flex-col items-center justify-center hover:bg-sidebar-accent p-2 size-auto! ${pathname === item.url ? "bg-accent" : ""}`}
              >
                <Link href={item.url}>
                  <div className="relative">
                    <item.icon
                      className={`h-8! w-8! stroke-sidebar-accent-foreground ${pathname === item.url ? "stroke-3" : ""}`}
                    />
                    {item.key === "messages" && hasUnreadMessages && (
                      <span className="absolute -top-0.5 -right-0.5 flex size-3 rounded-full bg-destructive border-2 border-background" />
                    )}
                  </div>
                  <span className="sr-only">{item.key}</span>
                </Link>
              </Button>
            );
          })}
          {user && (
            <Button
              key="profile"
              variant="ghost"
              size="icon"
              asChild
              className="flex flex-col items-center justify-center hover:bg-transparent p-2 size-auto!"
            >
              <Link href={`/${user.username}`}>
                <Avatar className="h-8 w-8 rounded-full">
                  <AvatarImage
                    src={`/${user.image}` || "/default-avatar.png"}
                    alt={user.name}
                  />
                  <AvatarFallback className="rounded-lg">
                    {getUsernameFallback(user.name)}
                  </AvatarFallback>
                </Avatar>
              </Link>
            </Button>
          )}
        </nav>
      </div>
    )
  );
}
