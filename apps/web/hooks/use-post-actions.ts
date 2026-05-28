"use client";

import {
  useMutation,
  useQueryClient,
  InfiniteData,
} from "@tanstack/react-query";
import { axiosGateway, FindManyResponse } from "@/lib/axios-config";
import { authClient } from "@/lib/auth/auth-client";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { PostWithRelations } from "./use-feed";
import { useRouter } from "next/navigation";

export function usePostActions(queryKeyToUpdate: string[] = ["feed"]) {
  const t = useTranslations("HomePage.feed.post");
  const queryClient = useQueryClient();
  const session = authClient.useSession();
  const userId = session.data?.user.id;
  const router = useRouter();

  const likeMutation = useMutation({
    mutationFn: async ({
      postId,
      isLiked,
    }: {
      postId: string;
      isLiked: boolean;
    }) => {
      if (!userId) throw new Error("User not authenticated");

      if (isLiked) {
        // We are unliking
        return axiosGateway.delete("/api/posts/likes", {
          data: { postId, userId },
        });
      } else {
        // We are liking
        return axiosGateway.post("/api/posts/likes", { postId, userId });
      }
    },
    onMutate: async ({ postId, isLiked }) => {
      // Optimistic update for the primary query (e.g., feed)
      await queryClient.cancelQueries({ queryKey: queryKeyToUpdate });
      const previousData = queryClient.getQueryData(queryKeyToUpdate);

      queryClient.setQueryData(
        queryKeyToUpdate,
        (
          old: InfiniteData<FindManyResponse<PostWithRelations>> | undefined,
        ) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              data: page.data.map((post: PostWithRelations) => {
                if (post.id === postId) {
                  return {
                    ...post,
                    likesCount: isLiked
                      ? post.likesCount - 1
                      : post.likesCount + 1,
                    likes: isLiked
                      ? post.likes.filter((l) => l.userId !== userId)
                      : [...post.likes, { userId, postId }],
                  };
                }
                return post;
              }),
            })),
          };
        },
      );

      // Also update the individual post cache if it exists
      const postQueryKey = ["post", postId];
      await queryClient.cancelQueries({ queryKey: postQueryKey });
      const previousPostData = queryClient.getQueryData(postQueryKey);

      if (previousPostData) {
        queryClient.setQueryData(
          postQueryKey,
          (old: PostWithRelations | undefined) => {
            if (!old) return old;
            return {
              ...old,
              likesCount: isLiked ? old.likesCount - 1 : old.likesCount + 1,
              likes: isLiked
                ? old.likes.filter((l) => l.userId !== userId)
                : [...old.likes, { userId, postId }],
            };
          },
        );
      }

      return { previousData, previousPostData };
    },
    onError: (err, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKeyToUpdate, context.previousData);
      }
      if (context?.previousPostData) {
        queryClient.setQueryData(
          ["post", variables.postId],
          context.previousPostData,
        );
      }
      toast.error(t("likeError"));
    },
    onSuccess: (data, variables) => {
      toast.success(variables.isLiked ? t("unliked") : t("liked"));
    },
  });

  const saveMutation = useMutation({
    mutationFn: async ({
      postId,
      isSaved,
    }: {
      postId: string;
      isSaved: boolean;
    }) => {
      if (!userId) throw new Error("User not authenticated");

      if (isSaved) {
        // We are unsaving
        return axiosGateway.delete(`/api/posts/unsave/${postId}`);
      } else {
        // We are saving
        return axiosGateway.post("/api/posts/save", { postId });
      }
    },
    onMutate: async ({ postId, isSaved }) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: queryKeyToUpdate });
      const previousData = queryClient.getQueryData(queryKeyToUpdate);

      queryClient.setQueryData(
        queryKeyToUpdate,
        (
          old: InfiniteData<FindManyResponse<PostWithRelations>> | undefined,
        ) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              data: page.data.map((post: PostWithRelations) => {
                if (post.id === postId) {
                  return {
                    ...post,
                    savedPosts: isSaved
                      ? post.savedPosts.filter((s) => s.userId !== userId)
                      : [...post.savedPosts, { userId, postId }],
                  };
                }
                return post;
              }),
            })),
          };
        },
      );

      return { previousData };
    },
    onError: (err, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKeyToUpdate, context.previousData);
      }
      toast.error(t("saveError"));
    },
    onSuccess: (data, variables) => {
      toast.success(variables.isSaved ? t("unsaved") : t("saved"));
    },
  });

  const sharePost = async (post: PostWithRelations) => {
    const shareUrl = `${window.location.origin}/p/${post.id}`;
    const shareData = {
      title: "Gigglegram",
      text: post.caption || "Check out this post on Gigglegram!",
      url: shareUrl,
    };

    if (
      navigator.share &&
      navigator.canShare &&
      navigator.canShare(shareData)
    ) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          toast.error(t("shareError"));
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl);
        toast.success(t("copied"));
      } catch (err) {
        toast.error(t("shareError"));
      }
    }
  };

  const deleteMutation = useMutation({
    mutationFn: async (postId: string) => {
      return axiosGateway.delete(`/api/posts/by/${postId}`);
    },
    onSuccess: () => {
      toast.success(
        t("postDeleted", { defaultValue: "Post deleted successfully" }),
      );
      queryClient.invalidateQueries({ queryKey: queryKeyToUpdate });
      queryClient.invalidateQueries({ queryKey: ["user-posts"] });
      queryClient.invalidateQueries({ queryKey: ["feed"] });
      router.replace(`/${session.data?.user?.username}`);
    },
    onError: () => {
      toast.error(t("deleteError", { defaultValue: "Failed to delete post" }));
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ postId, data }: { postId: string; data: any }) => {
      return axiosGateway.patch(`/api/posts/by/${postId}`, data);
    },
    onSuccess: (data, variables) => {
      toast.success(
        t("postUpdated", { defaultValue: "Post updated successfully" }),
      );
      queryClient.invalidateQueries({ queryKey: queryKeyToUpdate });
      queryClient.invalidateQueries({ queryKey: ["user-posts"] });
      queryClient.invalidateQueries({ queryKey: ["feed"] });
      queryClient.invalidateQueries({ queryKey: ["post", variables.postId] });
    },
    onError: () => {
      toast.error(t("updateError", { defaultValue: "Failed to update post" }));
    },
  });

  const archiveMutation = useMutation({
    mutationFn: async ({
      postId,
      isArchived,
    }: {
      postId: string;
      isArchived: boolean;
    }) => {
      return axiosGateway.patch(`/api/posts/by/${postId}`, {
        isArchived: !isArchived,
      });
    },
    onSuccess: (data, variables) => {
      toast.success(variables.isArchived ? t("unarchived") : t("archived"));
      queryClient.invalidateQueries({ queryKey: ["user-posts"] });
      queryClient.invalidateQueries({ queryKey: ["user-archived-posts"] });
      queryClient.invalidateQueries({ queryKey: ["feed"] });
    },
    onError: () => {
      toast.error(t("archiveError"));
    },
  });

  return {
    likePost: (postId: string, isLiked: boolean) =>
      likeMutation.mutate({ postId, isLiked }),
    savePost: (postId: string, isSaved: boolean) =>
      saveMutation.mutate({ postId, isSaved }),
    deletePost: (postId: string) => deleteMutation.mutate(postId),
    updatePost: (postId: string, data: any) =>
      updateMutation.mutate({ postId, data }),
    updatePostAsync: (postId: string, data: any) =>
      updateMutation.mutateAsync({ postId, data }),
    archivePost: (postId: string, isArchived: boolean) =>
      archiveMutation.mutate({ postId, isArchived }),
    isLiking: likeMutation.isPending,
    isSaving: saveMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isUpdating: updateMutation.isPending,
    sharePost,
    currentUserId: userId,
  };
}
