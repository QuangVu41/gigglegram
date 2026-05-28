import { useMutation } from "@tanstack/react-query";
import { axiosGateway } from "@/lib/axios-config";
import { authClient } from "@/lib/auth/auth-client";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

export interface UserNotificationSetting {
  likesNotifications: boolean;
  commentsNotifications: boolean;
  newFollowersNotifications: boolean;
  mentionsNotifications: boolean;
  messagesNotifications: boolean;
  videoCallsNotifications: boolean;
}

export function useUpdateNotificationSettings() {
  const t = useTranslations("Notifications.settings");
  const session = authClient.useSession();
  const mutation = useMutation({
    mutationFn: async (dto: Partial<UserNotificationSetting>) => {
      await axiosGateway.patch("/api/users/notification-settings", dto);
    },
    onSuccess: async () => {
      await session.refetch();
      toast.success(t("success"));
    },
    onError: (error) => {
      console.error("Failed to update notification settings:", error);
      toast.error(t("error"));
    },
  });

  return mutation;
}
