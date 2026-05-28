"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { axiosGateway, FindManyResponse } from "@/lib/axios-config";
import { CommentWithUser } from "@/hooks/use-comments";
import { PostWithRelations } from "@/hooks/use-feed";

export interface UserCommentWithPost extends CommentWithUser {
  post: PostWithRelations;
}

export function useUserComments(options?: { enabled?: boolean }) {
  return useInfiniteQuery({
    queryKey: ["user-comments"],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await axiosGateway.get<
        FindManyResponse<UserCommentWithPost>
      >(`/api/real-time/comments/user-comments`, {
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
    enabled: options?.enabled ?? true,
  });
}
