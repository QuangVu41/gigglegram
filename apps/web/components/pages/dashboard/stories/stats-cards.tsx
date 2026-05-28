"use client";

import { useQuery } from "@tanstack/react-query";
import { axiosGateway } from "@/lib/axios-config";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslations } from "next-intl";
import { Eye, Layers, Sparkles, Clock } from "lucide-react";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";

type Stats = {
  totalStories: number;
  activeStories: number;
  expiredStories: number;
  avgViewsPerStory: number;
};

interface StatsCardsProps {
  dateRange?: DateRange;
  activeTab?: string;
  searchQuery?: string;
}

export function StatsCards({
  dateRange,
  activeTab,
  searchQuery,
}: StatsCardsProps) {
  const t = useTranslations("Dashboard.stories.stats");

  const { data: stats, isLoading } = useQuery<Stats>({
    queryKey: ["stories-stats", dateRange, activeTab, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateRange?.from)
        params.append("startDate", dateRange.from.toISOString());
      if (dateRange?.to) params.append("endDate", dateRange.to.toISOString());
      if (searchQuery) params.append("keyword", searchQuery);

      if (activeTab === "published") params.append("isExpired", "false");
      if (activeTab === "archived") params.append("isExpired", "true");

      const res = await axiosGateway.get(
        `/api/posts/stories/stats?${params.toString()}`,
      );
      return res.data.data;
    },
  });

  const cards = [
    {
      title: t("totalStories"),
      value: stats?.totalStories ?? 0,
      icon: Layers,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      border: "border-blue-500/20",
    },
    {
      title: t("activeStories"),
      value: stats?.activeStories ?? 0,
      icon: Sparkles,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20",
    },
    {
      title: t("expiredStories"),
      value: stats?.expiredStories ?? 0,
      icon: Clock,
      color: "text-purple-500",
      bg: "bg-purple-500/10",
      border: "border-purple-500/20",
    },
    {
      title: t("avgViewsPerStory"),
      value: (stats?.avgViewsPerStory ?? 0).toFixed(1),
      icon: Eye,
      color: "text-orange-500",
      bg: "bg-orange-500/10",
      border: "border-orange-500/20",
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
              <h3 className="text-2xl font-bold text-foreground">
                {card.value}
              </h3>
            )}
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
          {/* Subtle background glow */}
          <div
            className={cn(
              "absolute -right-4 -bottom-4 w-24 h-24 blur-3xl opacity-20 rounded-full",
              card.bg,
            )}
          />
        </Card>
      ))}
    </div>
  );
}
