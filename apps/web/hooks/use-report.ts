"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { axiosGateway, FindManyResponse, OkResponse } from "@/lib/axios-config";
import { reportReasons, contentReports } from "@repo/database";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

export type ReportReason = typeof reportReasons.$inferSelect;

export function useReportReasons() {
  return useQuery({
    queryKey: ["report-reasons"],
    queryFn: async () => {
      const res = await axiosGateway.get<FindManyResponse<ReportReason>>(
        "/api/posts/reports/reasons",
        {
          params: { limit: 100 },
        },
      );
      return res.data;
    },
  });
}

interface CreateReportParams {
  reasonId: string;
  targetId: string;
  targetType: "post" | "story";
  description?: string;
}

export function useCreateReport() {
  const t = useTranslations("Report");

  return useMutation({
    mutationFn: async (params: CreateReportParams) => {
      const payload = {
        reasonId: params.reasonId,
        additionalInfo: params.description,
        targetId: params.targetId,
        type: params.targetType,
      };

      const res = await axiosGateway.post<
        OkResponse<typeof contentReports.$inferSelect>
      >("/api/posts/reports", payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success(t("success"));
    },
    onError: (error: any) => {
      // Error is handled by global interceptor, but we can add specific logic here if needed
    },
  });
}
