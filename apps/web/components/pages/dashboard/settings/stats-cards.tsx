"use client";

import { useQuery } from "@tanstack/react-query";
import { axiosGateway } from "@/lib/axios-config";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslations } from "next-intl";
import { Eye, EyeOff, Layers, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

type SettingsStats = {
  totalSettings: number;
  publicSettings: number;
  privateSettings: number;
  typesMix: {
    string: number;
    int: number;
    float: number;
    bool: number;
    json: number;
  };
};

interface StatsCardsProps {
  typeFilter?: string;
  accessFilter?: string;
}

export function StatsCards({ typeFilter, accessFilter }: StatsCardsProps) {
  const t = useTranslations("Dashboard.settings.stats");

  const { data: stats, isLoading } = useQuery<SettingsStats>({
    queryKey: ["settings-stats", typeFilter, accessFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (typeFilter && typeFilter !== "all") params.append("type", typeFilter);
      if (accessFilter && accessFilter !== "all")
        params.append("isPublic", accessFilter);

      const res = await axiosGateway.get(
        `/api/settings/stats?${params.toString()}`,
      );
      return res.data.data;
    },
  });

  const cards = [
    {
      title: t("totalSettings"),
      value: stats?.totalSettings ?? 0,
      description: t("registered"),
      icon: Settings,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      border: "border-blue-500/20",
    },
    {
      title: t("publicSettings"),
      value: stats?.publicSettings ?? 0,
      description: t("publicDesc"),
      icon: Eye,
      color: "text-green-500",
      bg: "bg-green-500/10",
      border: "border-green-500/20",
    },
    {
      title: t("privateSettings"),
      value: stats?.privateSettings ?? 0,
      description: t("privateDesc"),
      icon: EyeOff,
      color: "text-red-500",
      bg: "bg-red-500/10",
      border: "border-red-500/20",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map((card, i) => (
        <Card
          key={i}
          className="p-6 flex flex-row justify-between items-start gap-4 bg-card border border-border overflow-hidden relative"
        >
          <div className="relative z-10">
            <p className="text-sm font-medium text-muted-foreground">
              {card.title}
            </p>
            {isLoading ? (
              <Skeleton className="h-8 w-16 mt-1" />
            ) : (
              <h3 className="text-2xl font-bold text-foreground mt-1">
                {card.value}
              </h3>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {card.description}
            </p>
          </div>
          <div
            className={cn(
              "p-3 rounded-md relative z-10 border",
              card.bg,
              card.border,
            )}
          >
            <card.icon className={cn("w-6 h-6", card.color)} />
          </div>
          <div
            className={cn(
              "absolute -right-4 -bottom-4 w-24 h-24 blur-3xl opacity-20 rounded-full",
              card.bg,
            )}
          />
        </Card>
      ))}

      {/* Types Mix Breakdown Card */}
      <Card className="p-6 flex flex-row justify-between items-start gap-4 bg-card border border-border overflow-hidden relative">
        <div className="relative z-10 w-full">
          <p className="text-sm font-medium text-muted-foreground">
            {t("typesMix")}
          </p>
          {isLoading ? (
            <div className="space-y-2 mt-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
            </div>
          ) : (
            <div className="flex flex-col gap-1 mt-2 text-xs text-muted-foreground">
              <div className="flex gap-4">
                <span>
                  {t("types.bool")}:{" "}
                  <strong className="text-foreground">
                    {stats?.typesMix?.bool ?? 0}
                  </strong>
                </span>
                <span>
                  {t("types.json")}:{" "}
                  <strong className="text-foreground">
                    {stats?.typesMix?.json ?? 0}
                  </strong>
                </span>
              </div>
              <div className="flex gap-4">
                <span>
                  {t("types.intFloat")}:{" "}
                  <strong className="text-foreground">
                    {(stats?.typesMix?.int ?? 0) +
                      (stats?.typesMix?.float ?? 0)}
                  </strong>
                </span>
                <span>
                  {t("types.string")}:{" "}
                  <strong className="text-foreground">
                    {stats?.typesMix?.string ?? 0}
                  </strong>
                </span>
              </div>
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-2">
            {t("typesBreakdown")}
          </p>
        </div>
        <div className="p-3 rounded-md relative z-10 border bg-purple-500/10 border-purple-500/20">
          <Layers className="w-6 h-6 text-purple-500" />
        </div>
        <div className="absolute -right-4 -bottom-4 w-24 h-24 blur-3xl opacity-20 rounded-full bg-purple-500/10" />
      </Card>
    </div>
  );
}
