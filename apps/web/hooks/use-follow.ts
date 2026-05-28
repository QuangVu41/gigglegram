import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { axiosGateway, OkResponse } from "@/lib/axios-config";
import { authClient } from "@/lib/auth/auth-client";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

export function useFollow(targetUserId: string) {
  const queryClient = useQueryClient();
  const session = authClient.useSession();
  const currentUserId = session.data?.user.id;
  const t = useTranslations("ProfilePage");

  const { data: isFollowing, isLoading } = useQuery({
    queryKey: ["is-following", currentUserId, targetUserId],
    queryFn: async () => {
      if (!currentUserId || !targetUserId) return false;
      // We check if the current user is in the target user's followers
      // Or we can check a specific endpoint if it exists
      // For now, let's assume we can fetch target user profile or a follow status
      const response = await axiosGateway.get<OkResponse<any>>(
        `/api/users/${targetUserId}`,
      );
      const user = response.data.data;
      return (
        user.followers?.some(
          (f: any) => f.followerId === currentUserId && f.status === "accepted",
        ) || false
      );
    },
    enabled: !!currentUserId && !!targetUserId,
  });

  const followMutation = useMutation({
    mutationFn: async () => {
      if (!currentUserId) throw new Error("Not authenticated");
      if (isFollowing) {
        return axiosGateway.post("/api/users/unfollow", {
          followingUserId: targetUserId,
        });
      } else {
        return axiosGateway.post("/api/users/follow", {
          followingUserId: targetUserId,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["is-following", currentUserId, targetUserId],
      });
      queryClient.invalidateQueries({ queryKey: ["user-profile"] }); // Invalidate profile if needed
      toast.success(isFollowing ? t("unfollow") : t("follow"));
    },
    onError: () => {
      toast.error(t("followError"));
    },
  });

  return {
    isFollowing,
    isLoading,
    toggleFollow: () => followMutation.mutate(),
    isFollowingPending: followMutation.isPending,
  };
}
