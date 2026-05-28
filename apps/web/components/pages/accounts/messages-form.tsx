"use client";

import * as React from "react";
import { useOptimistic, startTransition, useState } from "react";
import { useTranslations } from "next-intl";
import { authClient } from "@/lib/auth/auth-client";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useUpdatePrivacySettings,
  UserPrivacySetting,
} from "@/hooks/use-update-privacy-settings";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent } from "@/components/ui/tabs";

type ViewState = "main" | "message-controls" | "activity-status";

export function MessagesForm() {
  const t = useTranslations("AccountsPage.messagesAndReplies");
  const session = authClient.useSession();
  const updatePrivacyMutation = useUpdatePrivacySettings();
  const [currentView, setCurrentView] = useState<ViewState>("main");

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
    <div className="max-w-2xl">
      <Tabs
        value={currentView}
        onValueChange={(v) => setCurrentView(v as ViewState)}
        className="w-full"
      >
        <TabsContent
          value="main"
          className="mt-0 border-0 p-0 focus-visible:ring-0"
        >
          <div className="flex flex-col gap-8 animate-in fade-in duration-300">
            <h1 className="text-2xl font-bold">{t("title")}</h1>

            <div className="space-y-4">
              <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider px-1">
                {t("contactHeader")}
              </h2>
              <div className="bg-muted/30 rounded-[20px] overflow-hidden border border-border/50">
                <button
                  onClick={() => setCurrentView("message-controls")}
                  className="w-full flex items-center justify-between p-6 hover:bg-muted/50 transition-colors border-b border-border/50"
                >
                  <span className="text-base font-medium">
                    {t("messageControls")}
                  </span>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </button>
                <button
                  disabled
                  className="w-full flex items-center justify-between p-6 opacity-50 cursor-not-allowed"
                >
                  <span className="text-base font-medium">
                    {t("storyReplies")}
                  </span>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider px-1">
                {t("onlineHeader")}
              </h2>
              <div className="bg-muted/30 rounded-[20px] overflow-hidden border border-border/50">
                <button
                  onClick={() => setCurrentView("activity-status")}
                  className="w-full flex items-center justify-between p-6 hover:bg-muted/50 transition-colors"
                >
                  <span className="text-base font-medium">
                    {t("activityStatus")}
                  </span>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent
          value="message-controls"
          className="mt-0 border-0 p-0 focus-visible:ring-0"
        >
          <div className="flex flex-col gap-8 animate-in slide-in-from-right duration-300">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setCurrentView("main")}
                className="p-2 hover:bg-muted rounded-full transition-colors"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <h1 className="text-2xl font-bold">
                {t("messageRequests.title")}
              </h1>
            </div>

            <div className="space-y-6 px-1">
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t("messageRequests.description")}{" "}
                <span className="text-primary cursor-pointer hover:underline font-medium">
                  {t("messageRequests.learnMore")}
                </span>
              </p>
            </div>

            <div className="space-y-4">
              <h2 className="text-sm font-bold text-muted-foreground px-1">
                {t("messageRequests.whoCanSend")}
              </h2>
              <div className="bg-muted/30 rounded-[20px] p-2 border border-border/50">
                <RadioGroup
                  value={optimisticSettings?.whoCanMessage ?? "everyone"}
                  onValueChange={(value) =>
                    handleUpdate("whoCanMessage", value)
                  }
                  className="gap-0"
                >
                  {(["everyone", "followers", "no_one"] as const).map(
                    (option) => (
                      <Label
                        key={option}
                        className={cn(
                          "flex items-center justify-between p-4 rounded-xl cursor-pointer hover:bg-muted/50 transition-colors",
                          optimisticSettings?.whoCanMessage === option &&
                            "bg-muted/20",
                        )}
                      >
                        <span className="text-base font-medium">
                          {t(`messageRequests.options.${option}`)}
                        </span>
                        <RadioGroupItem value={option} />
                      </Label>
                    ),
                  )}
                </RadioGroup>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent
          value="activity-status"
          className="mt-0 border-0 p-0 focus-visible:ring-0"
        >
          <div className="flex flex-col gap-8 animate-in slide-in-from-right duration-300">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setCurrentView("main")}
                className="p-2 hover:bg-muted rounded-full transition-colors"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <h1 className="text-2xl font-bold">
                {t("activityStatusPage.title")}
              </h1>
            </div>

            <div className="bg-muted/30 rounded-[20px] p-6 border border-border/50">
              <div className="flex items-center justify-between">
                <span className="text-base font-medium">
                  {t("activityStatusPage.toggleLabel")}
                </span>
                <Switch
                  checked={!(optimisticSettings?.hideActivityStatus ?? false)}
                  onCheckedChange={(checked) =>
                    handleUpdate("hideActivityStatus", !checked)
                  }
                  disabled={updatePrivacyMutation.isPending}
                />
              </div>
            </div>

            <div className="space-y-6 px-1">
              <p className="text-sm text-muted-foreground leading-relaxed opacity-80">
                {t("activityStatusPage.description")}{" "}
                <span className="text-primary cursor-pointer hover:underline font-medium">
                  {t("activityStatusPage.learnMore")}
                </span>
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed opacity-80">
                {t("activityStatusPage.footer")}
              </p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
