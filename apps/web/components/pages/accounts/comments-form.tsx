"use client";

import * as React from "react";
import { useOptimistic, startTransition } from "react";
import { useTranslations } from "next-intl";
import { authClient } from "@/lib/auth/auth-client";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useUpdatePrivacySettings,
  UserPrivacySetting,
} from "@/hooks/use-update-privacy-settings";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export function CommentsForm() {
  const t = useTranslations("AccountsPage.comments");
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

      {/* Allow Comments From Section */}
      <div className="space-y-4">
        <h2 className="text-base font-bold">{t("allowHeader")}</h2>

        <div className="bg-muted/30 rounded-[20px] p-2 border border-border/50">
          <RadioGroup
            value={optimisticSettings?.whoCanComment ?? "everyone"}
            onValueChange={(value) => handleUpdate("whoCanComment", value)}
            className="gap-0"
          >
            {(["everyone", "followers", "no_one"] as const).map((option) => (
              <Label
                key={option}
                className={cn(
                  "flex items-center justify-between p-4 rounded-xl cursor-pointer hover:bg-muted/50 transition-colors",
                  optimisticSettings?.whoCanComment === option && "bg-muted/20",
                )}
              >
                <div className="flex flex-col">
                  <span className="text-base font-medium">
                    {t(`options.${option}`)}
                  </span>
                </div>
                <RadioGroupItem value={option} />
              </Label>
            ))}
          </RadioGroup>
        </div>
      </div>

      {/* GIF Comments Placeholder */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h2 className="text-base font-bold">{t("allowGifs")}</h2>
            <p className="text-sm text-muted-foreground max-w-[80%]">
              {t("gifsDescription")}
            </p>
          </div>
          <Switch disabled className="opacity-60 cursor-not-allowed" />
        </div>
      </div>
    </div>
  );
}
