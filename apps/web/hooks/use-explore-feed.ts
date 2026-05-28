"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { axiosGateway, FindManyResponse } from "@/lib/axios-config";
import { PostWithRelations } from "@/hooks/use-feed";

export function useExploreFeed() {
  return useInfiniteQuery({
    queryKey: ["explore-feed"],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await axiosGateway.get<
        FindManyResponse<PostWithRelations>
      >(`/api/feed/suggested-posts`, {
        params: {
          page: pageParam,
          limit: 15,
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
