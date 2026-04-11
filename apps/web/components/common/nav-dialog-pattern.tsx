"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { NavMainItem } from "@/constants/nav-main";
import { useTranslations } from "next-intl";
import { CreatePostStepper } from "@/components/pages/home/create-post-stepper";
import CreatePostProvider from "@/components/pages/home/create-post-provider";
import { cn } from "@/lib/utils";

interface NavDialogPatternProps {
  item: NavMainItem;
  open: boolean;
  setOpenChange: (open: boolean) => void;
  className?: string;
}

export function NavDialogPattern({ item, open, className, setOpenChange }: NavDialogPatternProps) {
  const t = useTranslations("NavMain");

  return (
    <Dialog open={open} onOpenChange={setOpenChange}>
      <DialogContent className={cn("max-h-[70dvh] overflow-y-auto no-scrollbar scroll-smooth md:max-w-4xl", className)}>
        <DialogHeader>
          <DialogTitle>{t(item.key)}</DialogTitle>
        </DialogHeader>
        {item.key === "createPost" && (
          <CreatePostProvider>
            <CreatePostStepper />
          </CreatePostProvider>
        )}
      </DialogContent>
    </Dialog>
  );
}
