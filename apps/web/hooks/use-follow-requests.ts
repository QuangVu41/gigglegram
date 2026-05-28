import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { axiosGateway, FindManyResponse } from "@/lib/axios-config";
import { users } from "@repo/database";

export type FollowRequestWithActor = {
  id: string;
  followerId: string;
  followingId: string;
  status: "pending" | "accepted" | "rejected";
  createdAt: string;
  updatedAt: string;
  follower: typeof users.$inferSelect;
};

export const FOLLOW_REQUESTS_QUERY_KEY = ["follow-requests"] as const;

export function useFollowRequests(limit: number = 20) {
  const queryClient = useQueryClient();

  const query = useInfiniteQuery({
    queryKey: FOLLOW_REQUESTS_QUERY_KEY,
    queryFn: async ({ pageParam = 1 }) => {
      const res = await axiosGateway.get<
        FindManyResponse<FollowRequestWithActor>
      >("/api/users/follow-requests", {
        params: { page: pageParam, limit },
      });
      return res.data;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.metadata?.nextPage ?? undefined,
  });

  const updateFollowStatusMutation = useMutation({
    mutationFn: async ({
      followerId,
      status,
    }: {
      followerId: string;
      status: "accepted" | "rejected";
    }) => {
      await axiosGateway.patch("/api/users/follow-requests", null, {
        params: { followerId, status },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FOLLOW_REQUESTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  return {
    ...query,
    updateFollowStatus: updateFollowStatusMutation.mutateAsync,
  };
}
