"use client";

import { useQuery } from "@tanstack/react-query";
import { axiosGateway } from "@/lib/axios-config";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslations } from "next-intl";
import { MapPin, Building2, Globe } from "lucide-react";
import { cn } from "@/lib/utils";

type Stats = {
  totalLocations: number;
  uniqueCities: number;
  uniqueCountries: number;
};

export function StatsCards() {
  const t = useTranslations("Dashboard.locations.stats");

  const { data: stats, isLoading } = useQuery<Stats>({
    queryKey: ["locations-stats"],
    queryFn: async () => {
      const res = await axiosGateway.get("/api/posts/locations/stats");
      return res.data.data;
    },
  });

  const cards = [
    {
      title: t("totalLocations"),
      value: stats?.totalLocations ?? 0,
      icon: MapPin,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      border: "border-blue-500/20",
    },
    {
      title: t("uniqueCities"),
      value: stats?.uniqueCities ?? 0,
      icon: Building2,
      color: "text-purple-500",
      bg: "bg-purple-500/10",
      border: "border-purple-500/20",
    },
    {
      title: t("uniqueCountries"),
      value: stats?.uniqueCountries ?? 0,
      icon: Globe,
      color: "text-orange-500",
      bg: "bg-orange-500/10",
      border: "border-orange-500/20",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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
