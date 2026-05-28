"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { axiosGateway, FindManyResponse } from "@/lib/axios-config";
import { PostWithRelations } from "@/hooks/use-feed";

export function useUserPosts(userId: string, options?: { enabled?: boolean }) {
  return useInfiniteQuery({
    queryKey: ["user-posts", userId],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await axiosGateway.get<
        FindManyResponse<PostWithRelations>
      >(`/api/posts/user-posts`, {
        params: {
          userId,
          page: pageParam,
          limit: 12,
        },
      });
      return response.data;
    },
    getNextPageParam: (lastPage) => {
      return lastPage.metadata?.nextPage ?? undefined;
    },
    initialPageParam: 1,
    enabled: (options?.enabled ?? true) && !!userId,
  });
}
