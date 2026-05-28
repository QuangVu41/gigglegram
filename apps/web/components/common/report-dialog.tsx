"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useReportReasons, useCreateReport } from "@/hooks/use-report";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, ChevronRight, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface ReportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  targetId: string;
  targetType: "post" | "story";
}

export function ReportDialog({
  isOpen,
  onClose,
  targetId,
  targetType,
}: ReportDialogProps) {
  const t = useTranslations("Report");
  const { data: reasonsData, isLoading: isLoadingReasons } = useReportReasons();
  const { mutate: createReport, isPending: isSubmitting } = useCreateReport();

  const [selectedReasonId, setSelectedReasonId] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [step, setStep] = useState<"reasons" | "details">("reasons");

  const reasons = reasonsData?.data || [];

  const handleSelectReason = (reasonId: string) => {
    setSelectedReasonId(reasonId);
    setStep("details");
  };

  const handleSubmit = () => {
    if (!selectedReasonId) return;

    createReport(
      {
        reasonId: selectedReasonId,
        targetId,
        targetType,
        description: description.trim() || undefined,
      },
      {
        onSuccess: () => {
          onClose();
          // Reset state after successful submission
          setTimeout(() => {
            setStep("reasons");
            setSelectedReasonId(null);
            setDescription("");
          }, 300);
        },
      },
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] p-0 overflow-hidden gap-0">
        <DialogHeader className="p-4 border-b">
          <div className="flex items-center justify-between">
            {step === "details" && (
              <Button
                variant="ghost"
                size="icon"
                className="hover:bg-transparent"
                onClick={() => setStep("reasons")}
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            <DialogTitle className="text-center flex-1">
              {t("title")}
            </DialogTitle>
            {step === "details" && <div className="w-10" />} {/* Spacer */}
          </div>
        </DialogHeader>

        <div className="flex flex-col">
          {step === "reasons" ? (
            <>
              <div className="p-4 pb-2">
                <h3 className="font-semibold text-sm">{t("reasonsTitle")}</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("description")}
                </p>
              </div>

              <ScrollArea className="h-[300px] py-2">
                {isLoadingReasons ? (
                  <div className="flex flex-col gap-1 px-4 py-2">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between py-3"
                      >
                        <Skeleton className="h-4 w-[70%]" />
                        <Skeleton className="h-4 w-4 rounded-full" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col">
                    {reasons.map((reason) => (
                      <button
                        key={reason.id}
                        onClick={() => handleSelectReason(reason.id)}
                        className="flex items-center justify-between px-4 py-3 hover:bg-accent transition-colors text-left"
                      >
                        <span className="text-sm">{reason.description}</span>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </>
          ) : (
            <div className="p-4 flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">
                  {reasons.find((r) => r.id === selectedReasonId)?.description}
                </label>
                <Textarea
                  placeholder={t("reasonPlaceholder")}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="min-h-[120px] resize-none"
                  disabled={isSubmitting}
                />
              </div>

              <Button
                className="w-full"
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t("submitting")}
                  </>
                ) : (
                  t("submit")
                )}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
