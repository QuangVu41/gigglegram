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
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";

export function TagsForm() {
  const t = useTranslations("AccountsPage.tagsAndMentions");
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

      {/* Tags Section */}
      <div className="space-y-4">
        <div className="space-y-2">
          <h2 className="text-base font-bold">{t("tagsHeader")}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {t("tagsDescription")}
          </p>
        </div>

        <div className="bg-muted/30 rounded-[20px] p-2 border border-border/50">
          <RadioGroup
            value={optimisticSettings?.whoCanTag ?? "everyone"}
            onValueChange={(value) => handleUpdate("whoCanTag", value)}
            className="gap-0"
          >
            {(["everyone", "followers", "no_one"] as const).map((option) => (
              <Label
                key={option}
                className={cn(
                  "flex items-center justify-between p-4 rounded-xl cursor-pointer hover:bg-muted/50 transition-colors",
                  optimisticSettings?.whoCanTag === option && "bg-muted/20",
                )}
              >
                <span className="text-base font-medium">
                  {t(`options.${option}`)}
                </span>
                <RadioGroupItem value={option} />
              </Label>
            ))}
          </RadioGroup>
        </div>

        {/* Manually Approve Tags Placeholder */}
        <div className="bg-muted/30 rounded-[20px] overflow-hidden border border-border/50 mt-4 opacity-60 cursor-not-allowed">
          <div className="w-full flex items-center justify-between p-6">
            <span className="text-base font-medium">{t("manualApprove")}</span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{t("off")}</span>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </div>
          </div>
        </div>
      </div>

      <div className="h-px bg-border/50" />

      {/* Mentions Section */}
      <div className="space-y-4">
        <div className="space-y-2">
          <h2 className="text-base font-bold">{t("mentionsHeader")}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {t("mentionsDescription")}
          </p>
        </div>

        <div className="bg-muted/30 rounded-[20px] p-2 border border-border/50">
          <RadioGroup
            value={optimisticSettings?.whoCanMention ?? "everyone"}
            onValueChange={(value) => handleUpdate("whoCanMention", value)}
            className="gap-0"
          >
            {(["everyone", "followers", "no_one"] as const).map((option) => (
              <Label
                key={option}
                className={cn(
                  "flex items-center justify-between p-4 rounded-xl cursor-pointer hover:bg-muted/50 transition-colors",
                  optimisticSettings?.whoCanMention === option && "bg-muted/20",
                )}
              >
                <span className="text-base font-medium">
                  {t(`mentionOptions.${option}`)}
                </span>
                <RadioGroupItem value={option} />
              </Label>
            ))}
          </RadioGroup>
        </div>
      </div>
    </div>
  );
}
