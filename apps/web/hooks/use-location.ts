"use client";

import { useQuery } from "@tanstack/react-query";
import { axiosGateway, OkResponse } from "@/lib/axios-config";
import { locations } from "@repo/database";

export type Location = typeof locations.$inferSelect;

export function useLocation(locationId: string) {
  return useQuery({
    queryKey: ["location", locationId],
    queryFn: async () => {
      const response = await axiosGateway.get<OkResponse<Location>>(
        `/api/posts/locations/${locationId}`,
      );
      return response.data.data;
    },
    enabled: !!locationId,
  });
}
