"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { axiosGateway, FindManyResponse } from "@/lib/axios-config";
import { stories } from "@repo/database";

export function useUserStories() {
  return useInfiniteQuery({
    queryKey: ["user-stories"],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await axiosGateway.get<
        FindManyResponse<typeof stories.$inferSelect>
      >(`/api/posts/stories/my`, {
        params: {
          page: pageParam,
          limit: 20,
        },
      });
      return response.data;
    },
    getNextPageParam: (lastPage) => {
      return lastPage.metadata?.nextPage ?? undefined;
    },
    initialPageParam: 1,
  });
}
