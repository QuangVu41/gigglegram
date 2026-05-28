"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CreateHighlightStepper } from "@/components/pages/profile/create-highlight-stepper";
import { useTranslations } from "next-intl";

interface CreateHighlightDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateHighlightDialog({
  open,
  onOpenChange,
}: CreateHighlightDialogProps) {
  const t = useTranslations("CreateHighlight");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[400px] p-0 flex flex-col overflow-hidden bg-background border-border">
        <DialogHeader aria-hidden className="hidden">
          <DialogTitle>{t("title")}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-hidden flex flex-col">
          <CreateHighlightStepper onClose={() => onOpenChange(false)} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
