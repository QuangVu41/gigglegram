"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { axiosGateway, FindManyResponse } from "@/lib/axios-config";
import { PostWithRelations } from "./use-feed";

export function useAudioPosts(audioId: string) {
  return useInfiniteQuery({
    queryKey: ["audio-posts", audioId],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await axiosGateway.get<
        FindManyResponse<PostWithRelations>
      >("/api/posts", {
        params: {
          audioId,
          page: pageParam,
          limit: 12,
          sort: "createdAt,desc",
        },
      });
      return response.data;
    },
    getNextPageParam: (lastPage) => {
      return lastPage.metadata?.nextPage ?? undefined;
    },
    initialPageParam: 1,
    enabled: !!audioId,
  });
}
