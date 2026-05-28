import { useMutation } from "@tanstack/react-query";
import { axiosGateway } from "@/lib/axios-config";
import { authClient } from "@/lib/auth/auth-client";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

export interface UserPrivacySetting {
  accountPrivate: boolean;
  hideActivityStatus: boolean;
  hideLikesCount: boolean;
  whoCanMessage: "everyone" | "followers" | "no_one";
  whoCanComment: "everyone" | "followers" | "no_one";
  whoCanTag: "everyone" | "followers" | "no_one";
  whoCanMention: "everyone" | "followers" | "no_one";
}

export function useUpdatePrivacySettings() {
  const t = useTranslations("AccountsPage.privacy");
  const session = authClient.useSession();
  const mutation = useMutation({
    mutationFn: async (dto: Partial<UserPrivacySetting>) => {
      await axiosGateway.patch("/api/users/privacy-settings", dto);
    },
    onSuccess: async () => {
      await session.refetch();
      toast.success(t("success"));
    },
    onError: (error) => {
      console.error("Failed to update privacy settings:", error);
      toast.error(t("error"));
    },
  });

  return mutation;
}
