"use client";

import Logo from "@/components/common/logo";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import NavMain from "@/components/pages/home/nav-main";
import Link from "next/link";
import NavUser from "@/components/pages/home/nav-user";
import LogoText from "@/components/common/logo-text";

const AppSidebar = () => {
  const { open, setOpen } = useSidebar();

  return (
    <Sidebar
      className="bg-sidebar/50"
      collapsible="icon"
      onMouseOver={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <SidebarHeader className="mt-4 mb-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="overflow-visible group-data-[collapsible=icon]:size-auto! h-auto!"
              asChild
            >
              <Link href="/">
                <Logo className="w-8 h-8 shrink-0" />
                <LogoText
                  className={`w-36 object-contain ${open ? "" : "hidden!"}`}
                />
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
};

export default AppSidebar;
