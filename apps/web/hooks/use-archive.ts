"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { axiosGateway, FindManyResponse } from "@/lib/axios-config";
import { PostWithRelations } from "@/hooks/use-feed";
import { stories } from "@repo/database";
import { AudioTrack } from "@/hooks/use-audio";

export type ArchivedStory = typeof stories.$inferSelect;

export function useUserArchivedPosts() {
  return useInfiniteQuery({
    queryKey: ["user-archived-posts"],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await axiosGateway.get<
        FindManyResponse<PostWithRelations>
      >(`/api/posts/user-archive`, {
        params: {
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
  });
}

export function useUserArchivedStories() {
  return useInfiniteQuery({
    queryKey: ["user-archived-stories"],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await axiosGateway.get<FindManyResponse<ArchivedStory>>(
        `/api/posts/stories/my-archive`,
        {
          params: {
            page: pageParam,
            limit: 20,
          },
        },
      );
      return response.data;
    },
    getNextPageParam: (lastPage) => {
      return lastPage.metadata?.nextPage ?? undefined;
    },
    initialPageParam: 1,
  });
}

export function useUserSavedAudio(keyword?: string) {
  return useInfiniteQuery({
    queryKey: ["user-saved-audio", keyword],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await axiosGateway.get<FindManyResponse<AudioTrack>>(
        `/api/posts/audio/my-saved`,
        {
          params: {
            page: pageParam,
            limit: 12,
            keyword,
          },
        },
      );
      return response.data;
    },
    getNextPageParam: (lastPage) => {
      return lastPage.metadata?.nextPage ?? undefined;
    },
    initialPageParam: 1,
  });
}
