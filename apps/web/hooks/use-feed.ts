import { useInfiniteQuery } from "@tanstack/react-query";
import { axiosGateway, FindManyResponse } from "@/lib/axios-config";
import {
  posts,
  users,
  locations,
  postMedia,
  postHashtags,
  postCollaborators,
  postUserTags,
  likes,
  savedPosts,
  hashtags,
  audioTracks,
} from "@repo/database";

export type PostWithRelations = typeof posts.$inferSelect & {
  user: typeof users.$inferSelect;
  location: typeof locations.$inferSelect | null;
  audioTrack:
    | (typeof audioTracks.$inferSelect & {
        uploader: typeof users.$inferSelect;
      })
    | null;
  postCollaborators: (typeof postCollaborators.$inferSelect & {
    user: typeof users.$inferSelect;
  })[];
  postHashtags: (typeof postHashtags.$inferSelect & {
    hashtag: typeof hashtags.$inferSelect;
  })[];
  postMedia: (typeof postMedia.$inferSelect)[];
  postUserTags: (typeof postUserTags.$inferSelect & {
    user: typeof users.$inferSelect;
  })[];
  savedPosts: (typeof savedPosts.$inferSelect)[];
  likes: (typeof likes.$inferSelect)[];
};

export function useInfiniteFeed(limit: number = 10) {
  return useInfiniteQuery({
    queryKey: ["feed"],
    queryFn: async ({ pageParam = 1 }) => {
      const res = await axiosGateway.get<FindManyResponse<PostWithRelations>>(
        "/api/feed",
        {
          params: {
            page: pageParam,
            limit,
          },
        },
      );
      return res.data;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      return lastPage.metadata?.nextPage ?? undefined;
    },
    throwOnError: true,
  });
}
