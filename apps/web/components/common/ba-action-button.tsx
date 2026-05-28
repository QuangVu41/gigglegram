"use client";

import { ComponentProps, useTransition } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { VariantProps } from "class-variance-authority";
import { LoadingSwap } from "@/components/ui/loading-swap";
import { BAActionType } from "@/types/ba-action-types";

const BAActionButton = ({
  action,
  successMessage,
  pendingMessage,
  children,
  ...props
}: {
  action: BAActionType;
  successMessage?: string;
  pendingMessage?: string;
  children: React.ReactNode;
} & VariantProps<typeof buttonVariants> &
  ComponentProps<"button">) => {
  const [isPending, startTransition] = useTransition();
  const tBetterAuthErrorCodes = useTranslations("BetterAuthErrorCodes");

  const handleSubmit = async () => {
    let pendingToastId: string | number;
    if (pendingMessage) pendingToastId = toast.info(pendingMessage);
    startTransition(async () => {
      const res = await action();
      if (res.error) {
        const errorCode = res.error.code || "GENERAL_ERROR";
        const errorMessage = tBetterAuthErrorCodes.has(errorCode)
          ? tBetterAuthErrorCodes(errorCode)
          : tBetterAuthErrorCodes("GENERAL_ERROR");
        toast.dismiss(pendingToastId);
        toast.error(errorMessage);
      }
      if (successMessage) {
        toast.dismiss(pendingToastId);
        toast.success(successMessage);
      }
    });
  };

  return (
    <Button
      {...props}
      disabled={isPending || props.disabled}
      onClick={handleSubmit}
    >
      <LoadingSwap isLoading={isPending}>{children}</LoadingSwap>
    </Button>
  );
};

export default BAActionButton;
