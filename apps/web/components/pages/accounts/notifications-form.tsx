"use client";

import * as React from "react";
import { useOptimistic, startTransition } from "react";
import { useTranslations } from "next-intl";
import { authClient } from "@/lib/auth/auth-client";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useUpdateNotificationSettings,
  UserNotificationSetting,
} from "@/hooks/use-update-notification-settings";
import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export function NotificationsForm() {
  const t = useTranslations("Notifications.settings");
  const router = useRouter();
  const session = authClient.useSession();
  const updateSettingsMutation = useUpdateNotificationSettings();

  const userNotificationSetting = (session.data?.user as any)
    ?.userNotificationSetting as UserNotificationSetting | undefined;

  const [optimisticSettings, addOptimisticSetting] = useOptimistic(
    userNotificationSetting,
    (state, newSetting: Partial<UserNotificationSetting>) => {
      if (!state) return newSetting as UserNotificationSetting;
      return {
        ...state,
        ...newSetting,
      };
    },
  );

  if (session.isPending) {
    return (
      <div className="flex flex-col gap-6 p-6 max-w-2xl mx-auto">
        <Skeleton className="h-8 w-48" />
        <div className="space-y-6 mt-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between py-2 border-b border-border/50"
            >
              <Skeleton className="h-5 w-1/3" />
              <Skeleton className="h-6 w-11 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const settingItems: { key: keyof UserNotificationSetting; label: string }[] =
    [
      { key: "likesNotifications", label: t("likes") },
      { key: "commentsNotifications", label: t("comments") },
      { key: "newFollowersNotifications", label: t("newFollowers") },
      { key: "mentionsNotifications", label: t("mentions") },
      { key: "messagesNotifications", label: t("messages") },
      { key: "videoCallsNotifications", label: t("videoCalls") },
    ];

  const handleToggle = (key: keyof UserNotificationSetting, value: boolean) => {
    startTransition(async () => {
      addOptimisticSetting({ [key]: value });
      await updateSettingsMutation.mutateAsync({ [key]: value });
    });
  };

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-bold">{t("title")}</h1>

      {settingItems.map((item, index) => (
        <React.Fragment key={item.key}>
          <div className="flex flex-col gap-4">
            <h3 className="text-sm font-bold">{item.label}</h3>
            <RadioGroup
              value={optimisticSettings?.[item.key] ? "on" : "off"}
              onValueChange={(value) => handleToggle(item.key, value === "on")}
              disabled={updateSettingsMutation.isPending}
              className="gap-4"
            >
              <div className="flex items-center gap-3">
                <RadioGroupItem value="off" id={`${item.key}-off`} />
                <Label
                  htmlFor={`${item.key}-off`}
                  className="font-medium cursor-pointer text-sm"
                >
                  {t("off")}
                </Label>
              </div>
              <div className="flex items-center gap-3">
                <RadioGroupItem value="on" id={`${item.key}-on`} />
                <Label
                  htmlFor={`${item.key}-on`}
                  className="font-medium cursor-pointer text-sm"
                >
                  {t("on")}
                </Label>
              </div>
            </RadioGroup>
          </div>
          {index < settingItems.length - 1 && (
            <Separator className="opacity-50" />
          )}
        </React.Fragment>
      ))}

      <p className="text-xs text-muted-foreground mt-4 px-1 leading-relaxed">
        {t("description")}
      </p>
    </div>
  );
}
