import { useInfiniteQuery } from "@tanstack/react-query";
import { axiosGateway, FindManyResponse } from "@/lib/axios-config";
import { PostWithRelations } from "@/hooks/use-feed";

export function useInfiniteReels(limit: number = 5) {
  return useInfiniteQuery({
    queryKey: ["suggested-reels"],
    queryFn: async ({ pageParam = 1 }) => {
      const res = await axiosGateway.get<FindManyResponse<PostWithRelations>>(
        "/api/feed/suggested-reels",
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
