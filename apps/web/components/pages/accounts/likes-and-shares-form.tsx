"use client";

import * as React from "react";
import { useOptimistic, startTransition } from "react";
import { useTranslations } from "next-intl";
import { authClient } from "@/lib/auth/auth-client";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  useUpdatePrivacySettings,
  UserPrivacySetting,
} from "@/hooks/use-update-privacy-settings";

export function LikesAndSharesForm() {
  const t = useTranslations("AccountsPage.likesAndShares");
  const session = authClient.useSession();
  const updatePrivacyMutation = useUpdatePrivacySettings();

  const userPrivacySetting = (session.data?.user as any)?.userPrivacySetting as
    | UserPrivacySetting
    | undefined;

  const [optimisticSettings, addOptimisticSetting] = useOptimistic(
    userPrivacySetting,
    (state, newSetting: Partial<UserPrivacySetting>) => {
      if (!state) return newSetting as UserPrivacySetting;
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
        <Skeleton className="h-20 w-full rounded-xl" />
        <div className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      </div>
    );
  }

  const handleUpdate = async (key: keyof UserPrivacySetting, value: any) => {
    startTransition(async () => {
      addOptimisticSetting({ [key]: value });
      await updatePrivacyMutation.mutateAsync({ [key]: value });
    });
  };

  return (
    <div className="flex flex-col gap-10 animate-in fade-in duration-300 max-w-2xl">
      <h1 className="text-2xl font-bold">{t("title")}</h1>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold">{t("hideCounts")}</h2>
          <Switch
            checked={optimisticSettings?.hideLikesCount ?? false}
            onCheckedChange={(checked) =>
              handleUpdate("hideLikesCount", checked)
            }
            disabled={updatePrivacyMutation.isPending}
          />
        </div>

        <div className="space-y-6">
          <p className="text-sm text-muted-foreground leading-relaxed">
            {t("description1")}
            <span className="text-primary cursor-pointer hover:underline font-medium ml-1">
              {t("learnMore")}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
