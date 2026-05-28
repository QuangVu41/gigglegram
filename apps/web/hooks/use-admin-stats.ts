import { useQuery } from "@tanstack/react-query";
import { axiosGateway, OkResponse } from "@/lib/axios-config";

export interface ActiveUsersStats {
  dailyActiveUsers: number;
  monthlyActiveUsers: number;
  stickinessPercentage: number;
  stickinessPercentageChange: number;
  trend: "INCREASE" | "DECREASE" | "UNCHANGED";
}

export interface DateRangeQueryDto {
  from?: Date;
  to?: Date;
}

export interface TotalUsersStats {
  totalUsers: number;
  activeUsers: number;
  pendingOrBannedUsers: number;
  pendingUsers: number;
  bannedUsers: number;
  userChange: number;
  userTrend: "INCREASE" | "DECREASE" | "UNCHANGED";
}

export interface NewSignupsStats {
  totalSignups: number;
  signupChange: number;
  trend: "INCREASE" | "DECREASE" | "UNCHANGED";
  data: Array<{ bucket: string; count: number }>;
}

export interface RetentionRateStats {
  retentionRatePercentage: number;
  retentionRateChange: number;
  trend: "INCREASE" | "DECREASE" | "UNCHANGED";
}

export interface MediaVolumeStats {
  data: Array<{
    day: string;
    posts: number;
    stories: number;
    reels: number;
    totalUploads: number;
  }>;
  totals: {
    posts: number;
    stories: number;
    reels: number;
    totalUploads: number;
  };
}

export interface EngagementMetric {
  count: number;
  previousCount: number;
  change: number;
  trend: "INCREASE" | "DECREASE" | "UNCHANGED";
}

export interface EngagementBreakdownStats {
  likes: EngagementMetric;
  comments: EngagementMetric;
  saves: EngagementMetric;
}

export interface AverageEngagementStats {
  averageEngagementPerPost: number;
  highInteractionRate: number;
  change: number;
  trend: "INCREASE" | "DECREASE" | "UNCHANGED";
}

export interface PopularContent {
  id: string;
  caption: string;
  likesCount: number;
  sharesCount: number;
  commentsCount: number;
  engagementScore: number;
  postMedia: any[];
  user: {
    username: string;
    image: string;
    name: string;
  };
}

export interface PopularContentStats {
  top: PopularContent[];
}

export interface KafkaLagStats {
  summary: {
    totalLag: number;
    criticalTopics: number;
    healthyTopics: number;
    monitoredGroups: number;
  };
  topics: Array<{
    topic: string;
    groupId: string;
    totalLag: number;
    partitions: number;
    level: "healthy" | "warning" | "critical" | "alert";
  }>;
}

export interface AverageResponseTimeStats {
  averageResponseTimeMs: number;
  averageResponseTimeMinutes: number;
  changeMs: number;
  changePercentage: number;
  trend: "INCREASE" | "DECREASE" | "UNCHANGED";
}

export const useActiveUsersStats = (params?: DateRangeQueryDto) => {
  return useQuery({
    queryKey: ["admin", "stats", "active-users", params],
    queryFn: async () => {
      const res = await axiosGateway.get<OkResponse<ActiveUsersStats>>(
        "/api/authentication/admin/stats/active-users",
        {
          params,
        },
      );
      return res.data.data;
    },
  });
};

export function useTotalUsersStats(params?: DateRangeQueryDto) {
  return useQuery({
    queryKey: ["admin", "stats", "total-users", params],
    queryFn: async () => {
      const res = await axiosGateway.get<OkResponse<TotalUsersStats>>(
        "/api/authentication/admin/stats/total-users",
        {
          params,
        },
      );
      return res.data.data;
    },
  });
}

export const useNewSignupsStats = (params?: { from?: Date; to?: Date }) => {
  return useQuery({
    queryKey: ["admin", "stats", "new-signups", params],
    queryFn: async () => {
      const res = await axiosGateway.get<OkResponse<NewSignupsStats>>(
        "/api/authentication/admin/stats/new-signups",
        {
          params,
        },
      );
      return res.data.data;
    },
  });
};

export const useRetentionRateStats = (params?: { from?: Date; to?: Date }) => {
  return useQuery({
    queryKey: ["admin", "stats", "user-retention-rate", params],
    queryFn: async () => {
      const res = await axiosGateway.get<OkResponse<RetentionRateStats>>(
        "/api/authentication/admin/stats/user-retention-rate",
        { params },
      );
      return res.data.data;
    },
  });
};

export const useMediaVolumeStats = (params?: { from?: Date; to?: Date }) => {
  return useQuery({
    queryKey: ["admin", "stats", "media-volume", params],
    queryFn: async () => {
      const res = await axiosGateway.get<OkResponse<MediaVolumeStats>>(
        "/api/authentication/admin/stats/content-activity/media-volume",
        { params },
      );
      return res.data.data;
    },
  });
};

export const useEngagementBreakdownStats = (params?: {
  from?: Date;
  to?: Date;
}) => {
  return useQuery({
    queryKey: ["admin", "stats", "engagement-breakdown", params],
    queryFn: async () => {
      const res = await axiosGateway.get<OkResponse<EngagementBreakdownStats>>(
        "/api/authentication/admin/stats/content-activity/engagement-breakdown",
        { params },
      );
      return res.data.data;
    },
  });
};

export const useAverageEngagementStats = (params?: {
  from?: Date;
  to?: Date;
}) => {
  return useQuery({
    queryKey: ["admin", "stats", "average-engagement", params],
    queryFn: async () => {
      const res = await axiosGateway.get<OkResponse<AverageEngagementStats>>(
        "/api/authentication/admin/stats/content-activity/average-engagement-per-post",
        { params },
      );
      return res.data.data;
    },
  });
};

export const usePopularContentStats = (params?: { from?: Date; to?: Date }) => {
  return useQuery({
    queryKey: ["admin", "stats", "popular-content", params],
    queryFn: async () => {
      const res = await axiosGateway.get<OkResponse<PopularContentStats>>(
        "/api/authentication/admin/stats/content-activity/popular-content",
        { params },
      );
      return res.data.data;
    },
  });
};

export interface StorageUsageStats {
  usedBytes: number;
  quotaBytes: number;
  percent: number;
  percentFormatted: string;
  usedFormatted: string;
  quotaFormatted: string;
}

export const useStorageUsageStats = () => {
  return useQuery({
    queryKey: ["admin", "stats", "storage-usage"],
    queryFn: async () => {
      const res = await axiosGateway.get<OkResponse<StorageUsageStats>>(
        "/api/authentication/admin/stats/storage-usage",
      );
      return res.data.data;
    },
  });
};

export const useKafkaLagStats = () => {
  return useQuery({
    queryKey: ["admin", "stats", "kafka-lag"],
    queryFn: async () => {
      const res = await axiosGateway.get<OkResponse<KafkaLagStats>>(
        "/api/authentication/admin/stats/kafka-lag",
      );
      return res.data.data;
    },
  });
};

export const useAverageResponseTimeStats = (params?: DateRangeQueryDto) => {
  return useQuery({
    queryKey: ["admin", "stats", "moderation", "average-response-time", params],
    queryFn: async () => {
      const res = await axiosGateway.get<OkResponse<AverageResponseTimeStats>>(
        "/api/authentication/admin/stats/moderation/average-response-time",
        { params },
      );
      return res.data.data;
    },
  });
};
