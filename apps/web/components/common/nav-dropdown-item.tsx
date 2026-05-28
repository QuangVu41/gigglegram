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
import { NavDialogPattern } from "@/components/common/nav-dialog-pattern";
import { useState } from "react";

interface NavDropdownItemProps {
  children: React.ReactNode;
  navItem: NavMainItem;
}

const NavDropdownItem = ({ navItem, children }: NavDropdownItemProps) => {
  const { isMobile } = useSidebar();
  const t = useTranslations("NavMain");
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<NavMainItem | null>(null);

  const handleItemClick = (item: NavMainItem) => {
    setSelectedItem(item);
    setOpenDialog(true);
  };

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
        <DropdownMenuContent
          className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
          side={isMobile ? "bottom" : "right"}
          align="end"
          sideOffset={4}
        >
          {navItem.dropdownItems?.map((item) => (
            <DropdownMenuItem
              key={item.key}
              className="text-xl justify-between"
              onClick={() => handleItemClick(item)}
            >
              {t(item.key)}
              <item.icon className="size-8! stroke-sidebar-accent-foreground" />
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      {selectedItem && (
        <NavDialogPattern
          item={selectedItem}
          open={openDialog}
          setOpenChange={setOpenDialog}
        />
      )}
    </>
  );
};

export default NavDropdownItem;
