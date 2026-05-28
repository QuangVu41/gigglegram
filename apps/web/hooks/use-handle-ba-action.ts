import { BAActionType } from "@/types/ba-action-types";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

export const useHandleBAAction = () => {
  const tBetterAuthErrorCodes = useTranslations("BetterAuthErrorCodes");

  const handleBAAction = async <T extends BAActionType>(
    action: T,
  ): Promise<Awaited<ReturnType<T>>> => {
    const res = await action();
    if (res.error) {
      const errorCode = res.error.code || "GENERAL_ERROR";
      const errorMessage = tBetterAuthErrorCodes.has(errorCode)
        ? tBetterAuthErrorCodes(errorCode)
        : tBetterAuthErrorCodes("GENERAL_ERROR");
      toast.error(errorMessage);
    }
    return res as Awaited<ReturnType<T>>;
  };

  return { handleBAAction };
};
