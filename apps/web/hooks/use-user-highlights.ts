"use client";

import { useQuery } from "@tanstack/react-query";
import { axiosGateway, FindManyResponse, OkResponse } from "@/lib/axios-config";

export interface HighlightItem {
  id: string;
  title: string;
  coverStoryId: string;
  userId: string;
  storiesCount: number;
  createdAt: string;
  updatedAt: string;
  story?: {
    id: string;
    mediaUrl: string;
    thumbnailUrl: string;
    mediaType: string;
    moderationStatus: string;
  };
}

export interface HighlightWithStories extends HighlightItem {
  user: {
    id: string;
    name: string;
    username: string;
    image: string | null;
  };
  storyHighlightItems: {
    story: {
      id: string;
      mediaUrl: string;
      thumbnailUrl: string;
      mediaType: string;
      moderationStatus: string;
      createdAt: string;
    };
  }[];
}

export function useUserHighlights(
  userId: string,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: ["user-highlights", userId],
    queryFn: async () => {
      const response = await axiosGateway.get<FindManyResponse<HighlightItem>>(
        "/api/posts/highlights",
        {
          params: {
            userId,
            page: 1,
            limit: 20,
            sort: "createdAt,desc",
          },
        },
      );
      return response.data.data;
    },
    enabled: (options?.enabled ?? true) && !!userId,
  });
}

export function useHighlight(highlightId: string | null) {
  return useQuery({
    queryKey: ["highlight", highlightId],
    queryFn: async () => {
      if (!highlightId) return null;
      const response = await axiosGateway.get<OkResponse<HighlightWithStories>>(
        `/api/posts/highlights/${highlightId}`,
      );
      return response.data.data;
    },
    enabled: !!highlightId,
  });
}
