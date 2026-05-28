"use client";

import { useQuery } from "@tanstack/react-query";
import { axiosGateway } from "@/lib/axios-config";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslations } from "next-intl";
import { Music, TrendingUp, Clock, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { DateRange } from "react-day-picker";

type Stats = {
  totalTracks: number;
  trendingTracks: number;
  avgDuration: number;
  totalUsageCount: number;
};

interface StatsCardsProps {
  searchQuery?: string;
  dateRange?: DateRange;
}

export function StatsCards({ searchQuery, dateRange }: StatsCardsProps) {
  const t = useTranslations("Dashboard.audio.stats");

  const { data: stats, isLoading } = useQuery<Stats>({
    queryKey: ["audio-stats", searchQuery, dateRange],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.append("keyword", searchQuery);
      if (dateRange?.from)
        params.append("startDate", dateRange.from.toISOString());
      if (dateRange?.to) params.append("endDate", dateRange.to.toISOString());

      const res = await axiosGateway.get(
        `/api/posts/audio/stats?${params.toString()}`,
      );
      return res.data.data;
    },
  });

  // Helper to format duration in MM:SS
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const cards = [
    {
      title: t("totalTracks"),
      value: stats?.totalTracks ?? 0,
      icon: Music,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      border: "border-blue-500/20",
    },
    {
      title: t("trendingTracks"),
      value: stats?.trendingTracks ?? 0,
      icon: TrendingUp,
      color: "text-orange-500",
      bg: "bg-orange-500/10",
      border: "border-orange-500/20",
    },
    {
      title: t("avgDuration"),
      value: stats?.avgDuration ? formatDuration(stats.avgDuration) : "0:00",
      icon: Clock,
      color: "text-purple-500",
      bg: "bg-purple-500/10",
      border: "border-purple-500/20",
    },
    {
      title: t("totalUsageCount"),
      value: stats?.totalUsageCount ?? 0,
      icon: Activity,
      color: "text-green-500",
      bg: "bg-green-500/10",
      border: "border-green-500/20",
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
