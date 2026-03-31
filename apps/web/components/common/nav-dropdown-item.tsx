"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSidebar } from "@/components/ui/sidebar";
import { NavMainItem } from "@/constants/nav-main";
import { useTranslations } from "next-intl";

interface NavDropdownItemProps {
  children: React.ReactNode;
  navItem: NavMainItem;
}

const NavDropdownItem = ({ navItem, children }: NavDropdownItemProps) => {
  const { isMobile } = useSidebar();
  const t = useTranslations("NavMain");

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
        side={isMobile ? "bottom" : "right"}
        align="end"
        sideOffset={4}
      >
        {navItem.dropdownItems?.map((item) => (
          <DropdownMenuItem key={item.key} className="text-xl justify-between">
            {t(item.key)}
            <item.icon className="size-8! stroke-sidebar-accent-foreground" />
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NavDropdownItem;
