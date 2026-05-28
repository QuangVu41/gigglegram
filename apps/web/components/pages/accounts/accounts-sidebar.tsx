"use client";

import { useTranslations } from "next-intl";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
} from "@/components/ui/sidebar";
import {
  Search,
  User,
  Bell,
  Lock,
  Star,
  Ban,
  MessageCircle,
  AtSign,
  MessageSquare,
  Share2,
  ChevronRight,
  Settings,
  HeartOff,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "@/components/common/logo";

export function AccountsSidebar() {
  const t = useTranslations("AccountsPage.sidebar");
  const pathname = usePathname();

  const menuItems = [
    {
      label: t("howYouUse"),
      items: [
        {
          icon: User,
          label: t("editProfile"),
          href: "/accounts/edit",
        },
        {
          icon: Bell,
          label: t("notifications"),
          href: "/accounts/notifications",
        },
      ],
    },
    {
      label: t("whoCanSee"),
      items: [
        {
          icon: Lock,
          label: t("accountPrivacy"),
          href: "/accounts/privacy",
        },
        {
          icon: Star,
          label: t("closeFriends"),
          href: "#",
        },
        {
          icon: Ban,
          label: t("blocked"),
          href: "#",
        },
      ],
    },
    {
      label: t("howOthersInteract"),
      items: [
        {
          icon: MessageCircle,
          label: t("messagesAndReplies"),
          href: "/accounts/messages",
        },
        {
          icon: AtSign,
          label: t("tagsAndMentions"),
          href: "/accounts/tags",
        },
        {
          icon: MessageSquare,
          label: t("comments"),
          href: "/accounts/comments",
        },
      ],
    },
    {
      label: t("contentYouSee"),
      items: [
        {
          icon: HeartOff,
          label: t("likesAndShares"),
          href: "/accounts/likes_and_shares",
        },
      ],
    },
  ];

  return (
    <Sidebar
      collapsible="none"
      className="w-80 border-r border-border bg-background/70 hidden md:flex sticky top-0 h-screen overflow-hidden"
    >
      <SidebarHeader className="p-6 pb-2 gap-4">
        <h2 className="text-xl font-bold px-2">{t("settings")}</h2>
      </SidebarHeader>
      <SidebarContent className="px-4 py-4 no-scrollbar">
        {/* Account Center Section */}
        <SidebarGroup className="mb-4">
          <div className="bg-muted/30 rounded-xl p-4 flex flex-col gap-2 border border-border/50">
            <div className="flex items-center gap-2 mb-1">
              <Logo className="w-5 h-5" />
              <span className="text-sm font-bold">Gigglegram</span>
            </div>
            <h3 className="text-sm font-bold">{t("accountCenter")}</h3>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {t("accountCenterDescription")}
            </p>
            <div className="flex items-center justify-between mt-1 text-xs text-primary font-semibold cursor-pointer hover:opacity-80">
              <span>{t("accountCenterDetails")}</span>
              {/* <ChevronRight className="w-3 h-3" /> */}
            </div>
          </div>
        </SidebarGroup>

        {menuItems.map((group, idx) => (
          <SidebarGroup key={idx} className="p-0 mb-4">
            <SidebarGroupLabel className="px-4 text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <SidebarMenuItem key={item.label}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        className={`px-4 py-6 rounded-lg transition-colors hover:bg-muted/50 ${
                          isActive ? "bg-muted/80 font-bold" : ""
                        }`}
                      >
                        <Link
                          href={item.href}
                          className="flex items-center gap-3"
                        >
                          <item.icon
                            className={`w-5 h-5 ${isActive ? "text-foreground" : "text-muted-foreground"}`}
                          />
                          <span className="text-sm">{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}
