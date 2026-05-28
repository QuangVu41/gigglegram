"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { NavMainItem } from "@/constants/nav-main";
import { useTranslations } from "next-intl";
import { CreatePostStepper } from "@/components/pages/home/create-post-stepper";
import CreatePostProvider from "@/components/pages/home/create-post-provider";
import { CreateStoryStepper } from "@/components/pages/home/create-story-stepper";
import CreateStoryProvider from "@/components/pages/home/create-story-provider";
import { cn } from "@/lib/utils";

interface NavDialogPatternProps {
  item: NavMainItem;
  open: boolean;
  setOpenChange: (open: boolean) => void;
  className?: string;
}

export function NavDialogPattern({
  item,
  open,
  className,
  setOpenChange,
}: NavDialogPatternProps) {
  const t = useTranslations("NavMain");

  return (
    <Dialog open={open} onOpenChange={setOpenChange}>
      <DialogContent
        className={cn(
          "w-full max-w-none h-dvh max-h-dvh sm:w-[calc(100vw-2rem)] sm:max-w-3xl md:max-w-4xl lg:max-w-5xl sm:h-auto sm:max-h-[85dvh] overflow-y-auto no-scrollbar scroll-smooth flex flex-col border-0 sm:border rounded-none! sm:rounded-xl! p-4 sm:p-6",
          className,
        )}
      >
        <DialogHeader>
          <DialogTitle>{t(item.key)}</DialogTitle>
        </DialogHeader>
        {item.key === "createPost" && (
          <CreatePostProvider>
            <CreatePostStepper />
          </CreatePostProvider>
        )}
        {item.key === "createStory" && (
          <CreateStoryProvider>
            <CreateStoryStepper />
          </CreateStoryProvider>
        )}
      </DialogContent>
    </Dialog>
  );
}
