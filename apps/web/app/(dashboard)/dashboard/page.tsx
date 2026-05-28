"use client";

import { useTranslations } from "next-intl";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { authClient } from "@/lib/auth/auth-client";
import { CaptionRenderer } from "../../../components/common/caption-renderer";
import {
  useActiveUsersStats,
  useTotalUsersStats,
  useNewSignupsStats,
  useRetentionRateStats,
  useMediaVolumeStats,
  useEngagementBreakdownStats,
  useAverageEngagementStats,
  usePopularContentStats,
  useStorageUsageStats,
  useKafkaLagStats,
  useAverageResponseTimeStats,
} from "@/hooks/use-admin-stats";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Bar,
  BarChart,
  Line,
  LineChart,
  CartesianGrid,
  Pie,
  PieChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import Image from "next/image";
import { cn, getMediaUrl } from "@/lib/utils";
import {
  ArrowUpRight,
  ArrowDownRight,
  MoreHorizontal,
  BarChart2,
  AlertCircle,
  CheckCircle2,
  LineChart as LineChartIcon,
  ImagePlus,
  LayoutGrid,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

import { usePathname } from "next/navigation";
import { usePermissionGuard } from "@/hooks/use-permission-guard";
import { getPermissionByPath } from "@/constants/nav-dashboard";

const formatNumber = (num: number) =>
  new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(num);

// Custom tooltips
const CustomBarTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card p-4 rounded-2xl shadow-xl border border-border text-sm">
        <p className="text-muted-foreground mb-2 font-medium">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center justify-between gap-4 py-1">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: entry.color }} />
              <span className="text-muted-foreground font-medium capitalize">{entry.name}</span>
            </div>
            <span className="font-semibold text-foreground">{formatNumber(entry.value)}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function DashboardPage() {
  const t = useTranslations("DashboardPage");
  const pathname = usePathname();
  const permissions = getPermissionByPath(pathname);

  // Apply permission check
  const fallbackPermissions = useMemo(() => ({ report: ["read"] }), []);
  usePermissionGuard(permissions ?? fallbackPermissions);

  // Date range filter state
  const [timeframe, setTimeframe] = useState<string>("30d");
  const [mediaView, setMediaView] = useState<"chart" | "line">("chart");

  // Calculate DateRangeQueryDto params based on selected timeframe
  const dateParams = useMemo(() => {
    if (timeframe === "all") return {};

    const to = new Date();
    const from = new Date();
    if (timeframe === "7d") {
      from.setDate(from.getDate() - 7);
    } else if (timeframe === "30d") {
      from.setDate(from.getDate() - 30);
    }
    return { from, to };
  }, [timeframe]);

  const { data: activeUsers, isLoading: isLoadingActive } = useActiveUsersStats(dateParams);
  const { data: totalUsers, isLoading: isLoadingTotal } = useTotalUsersStats(dateParams);
  const { data: signups, isLoading: isLoadingSignups } = useNewSignupsStats(dateParams);
  const { data: retention, isLoading: isLoadingRetention } = useRetentionRateStats(dateParams);
  const { data: mediaVolume, isLoading: isLoadingMedia } = useMediaVolumeStats(dateParams);

  const { data: adminOrg } = useQuery({
    queryKey: ["admin-organization"],
    queryFn: async () => {
      const res = await authClient.organization.listMembers({
        query: {
          organizationSlug: "admin-org",
        },
      });
      return res.data;
    },
  });

  const admins = adminOrg?.members || [];
  const { data: engagement, isLoading: isLoadingEngagement } = useEngagementBreakdownStats(dateParams);
  const { data: avgEngagement, isLoading: isLoadingAvgEngagement } = useAverageEngagementStats(dateParams);
  const { data: popularContent, isLoading: isLoadingPopular } = usePopularContentStats(dateParams);
  const { data: storageUsage, isLoading: isLoadingStorage } = useStorageUsageStats();
  const { data: kafkaLag, isLoading: isLoadingKafka } = useKafkaLagStats();
  const { data: responseTime, isLoading: isLoadingResponseTime } = useAverageResponseTimeStats(dateParams);

  const isGlobalLoading =
    isLoadingActive ||
    isLoadingTotal ||
    isLoadingSignups ||
    isLoadingRetention ||
    isLoadingMedia ||
    isLoadingEngagement ||
    isLoadingAvgEngagement ||
    isLoadingPopular ||
    isLoadingStorage ||
    isLoadingKafka ||
    isLoadingResponseTime;

  // Colors based on mockup
  const colors = {
    green: "#84cc16", // lime-500
    greenLight: "#d9f99d", // lime-200
    yellow: "#fde047", // yellow-300
    orange: "#fb923c", // orange-400
  };

  if (isGlobalLoading) {
    return (
      <div className="flex flex-1 flex-col gap-6 p-6 pt-4 min-h-screen bg-background">
        <div className="grid grid-cols-12 gap-6">
          {/* LEFT COLUMN */}
          <div className="col-span-12 xl:col-span-9 flex flex-col gap-6">
            {/* Row 1: Media Volume & Stat Cards */}
            <div className="grid grid-cols-12 gap-6">
              <Skeleton className="col-span-12 lg:col-span-8 h-[500px] rounded-4xl" />
              <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
                <Skeleton className="flex-1 min-h-[100px] rounded-2xl" />
                <Skeleton className="flex-1 min-h-[100px] rounded-2xl" />
                <Skeleton className="flex-1 min-h-[100px] rounded-2xl" />
                <Skeleton className="flex-1 min-h-[100px] rounded-2xl" />
              </div>
            </div>
            {/* Row 2: Storage & Engagement Tip */}
            <div className="grid grid-cols-12 gap-6">
              <Skeleton className="col-span-12 lg:col-span-7 h-[220px] rounded-3xl" />
              <Skeleton className="col-span-12 lg:col-span-5 h-[220px] rounded-3xl" />
            </div>
            {/* Row 3: Breakdown, Health, Kafka */}
            <div className="grid grid-cols-12 gap-6">
              <Skeleton className="col-span-12 lg:col-span-4 h-[300px] rounded-3xl" />
              <Skeleton className="col-span-12 lg:col-span-4 h-[300px] rounded-3xl" />
              <Skeleton className="col-span-12 lg:col-span-4 h-[300px] rounded-3xl" />
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="col-span-12 xl:col-span-3 flex flex-col gap-6">
            {/* Quick Actions & Admins */}
            <Skeleton className="h-[320px] rounded-3xl" />
            <Skeleton className="h-[200px] rounded-3xl" />
            {/* Popular Content */}
            <Skeleton className="h-[500px] rounded-3xl" />
          </div>
        </div>
      </div>
    );
  }

  // Formatting helpers
  const mediaData =
    mediaVolume?.data.map((d) => ({
      name: new Date(d.day).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      posts: d.posts,
      stories: d.stories,
      reels: d.reels,
    })) || [];

  const engagementTotal = engagement ? engagement.likes.count + engagement.comments.count + engagement.saves.count : 0;
  const likesPct = engagementTotal ? (engagement!.likes.count / engagementTotal) * 100 : 0;
  const commentsPct = engagementTotal ? (engagement!.comments.count / engagementTotal) * 100 : 0;
  const savesPct = engagementTotal ? (engagement!.saves.count / engagementTotal) * 100 : 0;

  const storagePct = storageUsage?.percent || 0;
  const storageUsedLabel = storageUsage?.usedFormatted || "0 B";
  const storageMaxLabel = storageUsage?.quotaFormatted || "0 B";

  // Render Trend
  const renderTrend = (change: number, label: string) => {
    const isPositive = change >= 0;
    return (
      <div className="flex items-center gap-1 mt-2 text-xs font-medium">
        {isPositive ? (
          <ArrowUpRight className="w-3 h-3 text-lime-500" />
        ) : (
          <ArrowDownRight className="w-3 h-3 text-rose-500" />
        )}
        <span className={isPositive ? "text-lime-500" : "text-rose-500"}>
          {Math.abs(change).toFixed(1)}% {label}
        </span>
      </div>
    );
  };

  // Reusable Select Filter styled like the mockup
  const FilterSelect = () => (
    <Select value={timeframe} onValueChange={setTimeframe}>
      <SelectTrigger className="h-9 px-3 bg-muted rounded-lg border border-border text-xs font-semibold text-muted-foreground shadow-none focus:ring-0 gap-1.5 min-w-[120px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="7d" className="text-xs">
          {t("timeframe7d")}
        </SelectItem>
        <SelectItem value="30d" className="text-xs">
          {t("timeframe30d")}
        </SelectItem>
        <SelectItem value="all" className="text-xs">
          {t("timeframeAll")}
        </SelectItem>
      </SelectContent>
    </Select>
  );

  return (
    <div className="flex flex-col min-h-full bg-background/50 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-end justify-between px-8 py-4 bg-background">
        <div className="space-y-0.5">
          <h1 className="text-2xl font-bold tracking-tight">{t("pageTitle")}</h1>
          <p className="text-sm text-muted-foreground">{t("pageDescription")}</p>
        </div>
        <div className="flex items-center gap-4">
          <FilterSelect />
        </div>
      </div>

      <div className="flex-1 px-8 py-4 space-y-6">
        <div className="grid grid-cols-12 gap-6">
          {/* LEFT COLUMN (Spans 8 or 9 out of 12) */}
          <div className="col-span-12 xl:col-span-9 flex flex-col gap-6">
            {/* Row 1: Main Chart & 3 Stat Blocks */}
            <div className="grid grid-cols-12 gap-6">
              {/* Balance Overview -> Media Volume */}
              <Card className="col-span-12 lg:col-span-8 bg-card p-8 shadow-sm border border-border relative gap-0! block!">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-4xl font-bold text-foreground">
                      {formatNumber(mediaVolume?.totals.totalUploads || 0)}
                    </h2>
                    <p className="text-sm font-medium text-muted-foreground mt-1">{t("mediaUploadsTitle")}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <ToggleGroup
                      type="single"
                      value={mediaView}
                      onValueChange={(value) => {
                        if (value) setMediaView(value as "chart" | "line");
                      }}
                      className="hidden sm:flex bg-muted p-1 border border-border h-auto gap-1"
                    >
                      <ToggleGroupItem
                        value="chart"
                        aria-label="Toggle bar chart"
                        className="w-6 h-6 p-0 data-[state=on]:bg-card data-[state=on]:shadow-sm data-[state=on]:text-foreground text-muted-foreground hover:text-foreground hover:bg-card/50 transition-all"
                      >
                        <BarChart2 className="w-3 h-3" />
                      </ToggleGroupItem>
                      <ToggleGroupItem
                        value="line"
                        aria-label="Toggle line chart"
                        className="w-6 h-6 p-0 rounded-lg data-[state=on]:bg-card data-[state=on]:shadow-sm data-[state=on]:text-foreground text-muted-foreground hover:text-foreground hover:bg-card/50 transition-all"
                      >
                        <LineChartIcon className="w-3 h-3" />
                      </ToggleGroupItem>
                    </ToggleGroup>
                  </div>
                </div>

                <div className="flex items-center gap-4 justify-end mb-4 text-xs font-semibold text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm bg-lime-500" /> {t("posts")}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm bg-yellow-300" /> {t("stories")}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm bg-orange-400" /> {t("reels")}
                  </div>
                </div>

                <div className="h-[400px] w-full mt-4">
                  {mediaView === "chart" ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={mediaData} barCategoryGap="10%" maxBarSize={100}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                        <XAxis
                          dataKey="name"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 14, fill: "var(--foreground)" }}
                          dy={10}
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 14, fill: "var(--foreground)" }}
                          dx={-10}
                        />
                        <Tooltip content={<CustomBarTooltip />} cursor={{ fill: "var(--muted)", opacity: 0.4 }} />
                        <Bar dataKey="posts" name={t("posts")} stackId="a" fill={colors.green} radius={[0, 0, 4, 4]} />
                        <Bar dataKey="stories" name={t("stories")} stackId="a" fill={colors.yellow} />
                        <Bar dataKey="reels" name={t("reels")} stackId="a" fill={colors.orange} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={mediaData}
                        margin={{
                          left: 12,
                          right: 12,
                        }}
                      >
                        <CartesianGrid vertical={false} stroke="var(--border)" />
                        <XAxis
                          dataKey="name"
                          axisLine={false}
                          tickLine={false}
                          tickMargin={8}
                          tick={{ fontSize: 14, fill: "var(--foreground)" }}
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 14, fill: "var(--foreground)" }}
                          dx={-10}
                        />
                        <Tooltip content={<CustomBarTooltip />} cursor={false} />
                        <Line
                          type="linear"
                          dataKey="posts"
                          name={t("posts")}
                          stroke={colors.green}
                          strokeWidth={2}
                          dot={false}
                          activeDot={{ r: 6 }}
                        />
                        <Line
                          type="linear"
                          dataKey="stories"
                          name={t("stories")}
                          stroke={colors.yellow}
                          strokeWidth={2}
                          dot={false}
                          activeDot={{ r: 6 }}
                        />
                        <Line
                          type="linear"
                          dataKey="reels"
                          name={t("reels")}
                          stroke={colors.orange}
                          strokeWidth={2}
                          dot={false}
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </Card>

              {/* 3 Stat Blocks */}
              <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
                {/* Total Users */}
                <Card className="bg-card p-6 shadow-sm border border-border flex-1 flex flex-col justify-center gap-0!">
                  <p className="text-sm font-medium text-muted-foreground mb-1">{t("totalUsers")}</p>
                  <h3 className="text-3xl font-bold text-foreground">{formatNumber(totalUsers?.totalUsers || 0)}</h3>
                  {renderTrend(totalUsers?.userChange || 0, t("fromLastMonth"))}
                </Card>
                {/* New Signups */}
                <Card className="bg-card p-6 shadow-sm border border-border flex-1 flex flex-col justify-center gap-0!">
                  <p className="text-sm font-medium text-muted-foreground mb-1">{t("newSignups")}</p>
                  <h3 className="text-3xl font-bold text-foreground">{formatNumber(signups?.totalSignups || 0)}</h3>
                  {renderTrend(signups?.signupChange || 0, t("fromLastMonth"))}
                </Card>
                {/* Active Users */}
                <Card className="bg-card p-6 shadow-sm border border-border flex-1 flex flex-col justify-center gap-0!">
                  <p className="text-sm font-medium text-muted-foreground mb-1">{t("activeUsers")}</p>
                  <h3 className="text-3xl font-bold text-foreground">
                    {formatNumber(activeUsers?.monthlyActiveUsers || 0)}
                  </h3>
                  {renderTrend(activeUsers?.stickinessPercentageChange || 0, t("fromLastMonth"))}
                </Card>
                {/* Retention */}
                <Card className="bg-card p-6 shadow-sm border border-border flex-1 flex flex-col justify-center gap-0!">
                  <p className="text-sm font-medium text-muted-foreground mb-1">{t("retentionRate")}</p>
                  <h3 className="text-3xl font-bold text-foreground">
                    {retention?.retentionRatePercentage.toFixed(1)}%
                  </h3>
                  {renderTrend(retention?.retentionRateChange || 0, t("fromLastMonth"))}
                </Card>
              </div>
            </div>

            {/* Row 2: Storage Limit & Average Engagement tip */}
            <div className="grid grid-cols-12 gap-6">
              {/* Monthly spending limit -> Storage Limit */}
              <Card className="col-span-12 lg:col-span-7 bg-card p-6 shadow-sm border border-border relative overflow-hidden gap-0! block!">
                <div className="flex justify-between items-start mb-6 relative z-10">
                  <div>
                    <h3 className="text-lg font-bold text-foreground">{t("storageUsage")}</h3>
                    <p className="text-sm text-muted-foreground font-medium mt-1">{t("platformCapacity")}</p>
                  </div>
                </div>

                <div className="mt-8 relative z-10">
                  <div className="w-full bg-muted h-6 rounded-full overflow-hidden flex">
                    <div
                      className="h-full bg-lime-500 transition-all duration-1000 ease-out"
                      style={{ width: `${storagePct}%` }}
                    />
                    <div
                      className="h-full bg-lime-300 transition-all duration-1000 ease-out"
                      style={{
                        width: `${storagePct > 80 ? storagePct - 80 : 0}%`,
                      }}
                    />
                  </div>
                  <div className="flex justify-between mt-3 text-sm font-semibold">
                    <span className="text-foreground">{storageUsedLabel}</span>
                    <span className="text-muted-foreground">{storageMaxLabel}</span>
                  </div>
                </div>
              </Card>

              {/* Optimize budget -> Average Engagement Tip */}
              <Card className="col-span-12 lg:col-span-5 bg-card p-6 shadow-sm border border-border relative overflow-hidden flex flex-col justify-between gap-0!">
                <div className="relative z-10 w-[70%]">
                  <h3 className="text-lg font-bold text-foreground leading-tight">{t("engagementTipTitle")}</h3>
                  <p className="text-sm text-muted-foreground mt-2 font-medium">{t("engagementTipDesc")}</p>
                </div>

                {/* Abstract decorative blocks mimicking the mockup */}
                <div className="absolute right-4 bottom-4 flex gap-1 items-end opacity-80">
                  <div className="w-6 h-6 rounded-md bg-lime-200 mb-14" />
                  <div className="flex flex-col gap-1 mb-7">
                    <div className="w-6 h-6 rounded-md bg-yellow-300" />
                    <div className="w-6 h-6 rounded-md bg-lime-500" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="w-6 h-6 rounded-md bg-lime-200" />
                    <div className="w-6 h-6 rounded-md bg-lime-500" />
                    <div className="w-6 h-6 rounded-md bg-lime-500" />
                  </div>
                </div>
              </Card>
            </div>

            {/* Row 3: Breakdown, Health, Goal Tracker */}
            <div className="grid grid-cols-12 gap-6">
              {/* Cost analysis -> Engagement Breakdown */}
              <Card className="col-span-12 lg:col-span-4 bg-card p-6 shadow-sm border border-border block! gap-0!">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-base font-bold text-foreground">{t("engagementBreakdown")}</h3>
                    <p className="text-xs text-muted-foreground font-medium mt-1">{t("activityOverview")}</p>
                  </div>
                </div>

                <h2 className="text-3xl font-bold text-foreground mb-6">{formatNumber(engagementTotal)}</h2>

                {/* Horizontal Stacked Bar */}
                <div className="w-full h-4 rounded-full overflow-hidden flex mb-6">
                  <div className="h-full bg-orange-400" style={{ width: `${likesPct}%` }} />
                  <div className="h-full bg-yellow-300" style={{ width: `${commentsPct}%` }} />
                  <div className="h-full bg-lime-500" style={{ width: `${savesPct}%` }} />
                </div>

                {/* Legend Grid */}
                <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-xs font-semibold">
                  <div className="flex justify-between items-center pr-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-sm bg-orange-400" />{" "}
                      <span className="text-muted-foreground">{t("likes")}</span>
                    </div>
                    <span className="text-foreground">{Math.round(likesPct)}%</span>
                  </div>
                  <div className="flex justify-between items-center pr-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-sm bg-yellow-300" />{" "}
                      <span className="text-muted-foreground">{t("comments")}</span>
                    </div>
                    <span className="text-foreground">{Math.round(commentsPct)}%</span>
                  </div>
                  <div className="flex justify-between items-center pr-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-sm bg-lime-500" />{" "}
                      <span className="text-muted-foreground">{t("saves")}</span>
                    </div>
                    <span className="text-foreground">{Math.round(savesPct)}%</span>
                  </div>
                </div>
              </Card>

              {/* Financial Health -> Avg Engagement */}
              <Card className="col-span-12 lg:col-span-4 bg-card p-6 shadow-sm border border-border flex flex-col justify-between gap-0!">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="text-base font-bold text-foreground">{t("averageEngagement")}</h3>
                      <p className="text-xs text-muted-foreground font-medium mt-1">{t("averageEngagementStatus")}</p>
                    </div>
                  </div>

                  <h2 className="text-3xl font-bold text-foreground mt-2">
                    {avgEngagement?.averageEngagementPerPost.toFixed(1) || "0"}
                  </h2>
                  {renderTrend(avgEngagement?.change || 0, t("fromLastMonth"))}
                </div>

                <div className="relative h-40 mt-6 flex items-end justify-center">
                  {/* Semi Circle Chart */}
                  <div className="absolute inset-0 flex items-end justify-center overflow-hidden pb-6">
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={[
                            {
                              value: avgEngagement?.highInteractionRate || 0,
                              fill: colors.green,
                            },
                            {
                              value: 100 - (avgEngagement?.highInteractionRate || 0),
                              fill: "var(--muted)",
                            },
                          ]}
                          cx="50%"
                          cy="100%"
                          startAngle={180}
                          endAngle={0}
                          innerRadius={78}
                          outerRadius={96}
                          paddingAngle={5}
                          dataKey="value"
                          stroke="none"
                          cornerRadius={40}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="text-center z-10 pb-4">
                    <span className="text-2xl font-bold text-foreground">
                      {avgEngagement?.highInteractionRate.toFixed(0) || "0"}%
                    </span>
                    <p className="text-xs text-muted-foreground font-medium leading-tight mt-2 max-w-[120px] mx-auto">
                      {t("highInteraction")}
                    </p>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground font-medium mt-4 text-center">{t("interactionBasedOn")}</p>
              </Card>

              {/* Goal tracker -> Kafka Topics Tracker */}
              <Card className="col-span-12 lg:col-span-4 bg-card p-6 shadow-sm border border-border block! gap-0!">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-base font-bold text-foreground">{t("kafkaLagTracker")}</h3>
                </div>

                <div className="space-y-5">
                  <div className="mb-2">
                    <p className="text-xs text-muted-foreground font-medium mb-3">{t("criticalQueues")}</p>
                    {kafkaLag?.topics.slice(0, 3).map((topic, i) => (
                      <div key={i} className="flex gap-3 items-center mb-4">
                        <div className="w-10 h-10 rounded-xl bg-muted border border-border flex items-center justify-center shrink-0">
                          {topic.level === "healthy" ? (
                            <CheckCircle2 className="w-5 h-5 text-lime-500" />
                          ) : topic.level === "warning" ? (
                            <AlertCircle className="w-5 h-5 text-yellow-500" />
                          ) : (
                            <AlertCircle className="w-5 h-5 text-orange-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-baseline mb-1">
                            <p className="text-sm font-bold text-foreground truncate">
                              {topic.topic.replace("gigglegram.", "")}
                            </p>
                            <p className="text-xs font-semibold text-muted-foreground">
                              {topic.totalLag} / {topic.totalLag + 100}
                            </p>
                          </div>
                          <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                            <div
                              className={cn(
                                "h-full",
                                topic.level === "healthy"
                                  ? "bg-lime-500"
                                  : topic.level === "warning"
                                    ? "bg-yellow-500"
                                    : "bg-orange-400",
                              )}
                              style={{
                                width: `${Math.min((topic.totalLag / (topic.totalLag + 100)) * 100, 100)}%`,
                              }}
                            />
                          </div>
                          <p className="text-[9px] text-muted-foreground font-medium mt-1">
                            {t("leftToProcess")} {topic.totalLag} {t("msgs")}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {/* RIGHT COLUMN (Spans 3 out of 12) */}
          <div className="col-span-12 xl:col-span-3 flex flex-col gap-6">
            {/* Quick Actions & Admins */}
            <Card className="bg-card p-6 shadow-sm border border-border relative block! gap-0!">
              {/* Active Admins */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-sm font-bold text-foreground">{t("activeAdmins")}</h4>
                  <Button size="icon" variant="outline" className="rounded-full" asChild>
                    <Link href="/dashboard/users">
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    </Link>
                  </Button>
                </div>
                <div className="flex -space-x-2 overflow-hidden py-1">
                  {admins.length > 0
                    ? admins.map((member) => (
                        <div key={member.id} className="flex flex-col items-center group relative">
                          <Link
                            href={`#`}
                            className="w-10 h-10 rounded-full bg-muted overflow-hidden border-2 border-background shadow-sm hover:z-10 transition-all cursor-pointer"
                          >
                            <Image
                              src={(member.user.image && `/${member.user.image}`) || `/default-avatar.png`}
                              alt={member.user.name}
                              width={40}
                              height={40}
                              className="object-cover w-full h-full"
                            />
                          </Link>
                          {/* Tooltip on hover */}
                          <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-popover text-popover-foreground px-2 py-1 rounded text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none border border-border shadow-md z-20">
                            {member.user.name}
                          </div>
                        </div>
                      ))
                    : [1, 2, 3, 4, 5].map((i) => (
                        <div
                          key={i}
                          className="w-10 h-10 rounded-full bg-muted animate-pulse border-2 border-background shadow-sm"
                        />
                      ))}
                </div>
              </div>
            </Card>

            {/* Moderation -> Average Response Time */}
            <Card className="bg-card p-6 shadow-sm border border-border flex flex-col justify-between gap-0!">
              <div>
                <h3 className="text-base font-bold text-foreground mb-1">{t("avgResponseTime")}</h3>
                <p className="text-xs text-muted-foreground font-medium mb-4">{t("moderationEfficiency")}</p>

                <div className="mt-4">
                  <h2 className="text-4xl font-bold text-foreground mb-1">
                    {responseTime?.averageResponseTimeMinutes.toFixed(1) || "0"}
                    <span className="text-lg ml-1 font-semibold text-muted-foreground">m</span>
                  </h2>
                  {renderTrend(responseTime?.changePercentage || 0, t("fromLastPeriod"))}
                </div>
              </div>

              <div className="mt-8">
                <div className="flex justify-between items-end mb-2">
                  <span className="text-xs font-semibold text-muted-foreground">{t("resolutionSpeed")}</span>
                  <span
                    className={cn(
                      "text-xs font-bold",
                      (responseTime?.averageResponseTimeMinutes || 0) < 30 ? "text-lime-500" : "text-yellow-500",
                    )}
                  >
                    {(responseTime?.averageResponseTimeMinutes || 0) < 30 ? t("optimal") : t("delayed")}
                  </span>
                </div>
                <div className="w-full bg-muted h-3 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full transition-all duration-500",
                      (responseTime?.averageResponseTimeMinutes || 0) < 30 ? "bg-lime-500" : "bg-yellow-500",
                    )}
                    style={{
                      width: `${Math.min((30 / Math.max(responseTime?.averageResponseTimeMinutes || 0, 1)) * 100, 100)}%`,
                    }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground font-medium mt-2">
                  {t("targetResolution")} 30{t("mins")}
                </p>
              </div>
            </Card>

            {/* Popular Content */}
            <Card className="bg-card p-6 shadow-sm border border-border flex-1 overflow-hidden flex flex-col gap-0!">
              <div className="flex justify-between items-center mb-6 shrink-0">
                <h3 className="text-base font-bold text-foreground">{t("popularContent")}</h3>
              </div>

              <div className="flex justify-between text-xs font-semibold text-muted-foreground mb-4 px-2 shrink-0">
                <span className="flex items-center gap-1">{t("name")}</span>
                <span>{t("score")}</span>
              </div>

              <div className="space-y-4 overflow-y-auto pr-2 pb-4 flex-1">
                {popularContent?.top.slice(0, 5).map((post, i) => (
                  <div key={i} className="flex justify-between items-center">
                    <div className="flex gap-3 items-center">
                      <Link href={`/p/${post.id}`} className="w-10 h-10 rounded-xl bg-muted overflow-hidden shrink-0">
                        {post.postMedia?.[0]?.mediaUrl ? (
                          <Image
                            src={
                              post.postMedia[0].mediaType?.startsWith("video/") && post.postMedia[0].thumbnailUrl
                                ? getMediaUrl(post.postMedia[0].thumbnailUrl, "post", post.postMedia[0].mediaType)
                                : getMediaUrl(post.postMedia[0].mediaUrl, "post", post.postMedia[0].mediaType)
                            }
                            alt="Post"
                            width={40}
                            height={40}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-muted flex items-center justify-center">
                            <ImagePlus className="w-4 h-4 text-muted-foreground/50" />
                          </div>
                        )}
                      </Link>
                      <div className="flex flex-col min-w-0">
                        <Link
                          href={`/${post.user.username}`}
                          className="text-sm font-bold text-foreground hover:underline underline-offset-2 transition-all truncate"
                        >
                          {post.user.name}
                        </Link>
                        <div className="text-xs text-muted-foreground line-clamp-1">
                          <CaptionRenderer html={post.caption || t("noCaption")} />
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-foreground">+{formatNumber(post.engagementScore)}</p>
                      <p className="text-xs font-semibold text-muted-foreground">{t("score")}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
