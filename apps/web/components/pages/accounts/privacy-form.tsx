"use client";

import * as React from "react";
import { useOptimistic, startTransition } from "react";
import { useTranslations } from "next-intl";
import { authClient } from "@/lib/auth/auth-client";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useUpdatePrivacySettings,
  UserPrivacySetting,
} from "@/hooks/use-update-privacy-settings";
import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export function PrivacyForm() {
  const t = useTranslations("AccountsPage.privacy");
  const router = useRouter();
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

  const handleToggle = (key: keyof UserPrivacySetting, value: boolean) => {
    startTransition(async () => {
      addOptimisticSetting({ [key]: value });
      await updatePrivacyMutation.mutateAsync({ [key]: value });
    });
  };

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-bold">{t("title")}</h1>

      <div className="bg-muted/30 rounded-[20px] p-6 border border-border/50">
        <div className="flex items-center justify-between">
          <span className="text-base font-medium">{t("privateAccount")}</span>
          <Switch
            checked={optimisticSettings?.accountPrivate ?? false}
            onCheckedChange={(checked) =>
              handleToggle("accountPrivate", checked)
            }
            disabled={updatePrivacyMutation.isPending}
          />
        </div>
      </div>

      <div className="space-y-6 px-1">
        <p className="text-sm text-muted-foreground leading-relaxed opacity-80">
          {t("description1")}
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed opacity-80">
          {t("description2")}{" "}
          <span className="text-primary cursor-pointer hover:underline font-medium">
            {t("learnMore")}
          </span>
        </p>
      </div>
    </div>
  );
}
