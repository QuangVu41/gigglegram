"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { axiosGateway, FindManyResponse } from "@/lib/axios-config";
import { PostWithRelations } from "@/hooks/use-feed";

export function useHashtagPosts(hashtag: string) {
  return useInfiniteQuery({
    queryKey: ["hashtag-posts", hashtag],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await axiosGateway.get<
        FindManyResponse<PostWithRelations>
      >(`/api/posts/post-hashtags`, {
        params: {
          hashtag,
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
    enabled: !!hashtag,
  });
}
