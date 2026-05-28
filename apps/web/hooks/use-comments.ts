import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { axiosGateway, FindManyResponse } from "@/lib/axios-config";
import { users } from "@repo/database";
import { authClient } from "@/lib/auth/auth-client";

export interface CommentWithUser {
  id: string;
  content: string;
  createdAt: string;
  userId: string;
  postId: string;
  parentCommentId?: string;
  repliesCount: number;
  likesCount: number;
  user: typeof users.$inferSelect;
  likes: any[];
  replies: any[];
}

export function usePostComments(postId: string, limit: number = 20) {
  return useInfiniteQuery({
    queryKey: ["post-comments", postId],
    queryFn: async ({ pageParam = 1 }) => {
      const res = await axiosGateway.get<FindManyResponse<CommentWithUser>>(
        `/api/real-time/comments/post/${postId}`,
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
    enabled: !!postId,
  });
}

export function useCommentReplies(
  commentId: string,
  limit: number = 3,
  enabled: boolean = true,
) {
  return useInfiniteQuery({
    queryKey: ["comment-replies", commentId],
    queryFn: async ({ pageParam = 1 }) => {
      const res = await axiosGateway.get<FindManyResponse<CommentWithUser>>(
        `/api/real-time/comments/${commentId}/replies`,
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
    enabled: !!commentId && enabled,
  });
}

export function useCreateComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      postId,
      content,
      parentCommentId,
    }: {
      postId: string;
      content: string;
      parentCommentId?: string;
    }) => {
      const res = await axiosGateway.post("/api/real-time/comments", {
        postId,
        content,
        parentCommentId,
      });
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["post-comments", variables.postId],
      });
      queryClient.invalidateQueries({ queryKey: ["post", variables.postId] });
    },
  });
}

export function useLikeComment() {
  const queryClient = useQueryClient();
  const session = authClient.useSession();
  const currentUserId = session.data?.user.id;

  return useMutation({
    mutationFn: async ({
      commentId,
    }: {
      commentId: string;
      postId: string;
      parentCommentId?: string;
    }) => {
      const res = await axiosGateway.post(
        `/api/real-time/comments/${commentId}/like`,
      );
      return res.data;
    },
    onMutate: async (variables) => {
      await queryClient.cancelQueries({
        queryKey: ["post-comments", variables.postId],
      });
      if (variables.parentCommentId) {
        await queryClient.cancelQueries({
          queryKey: ["comment-replies", variables.parentCommentId],
        });
      }

      const previousComments = queryClient.getQueryData([
        "post-comments",
        variables.postId,
      ]);
      const previousReplies = variables.parentCommentId
        ? queryClient.getQueryData([
            "comment-replies",
            variables.parentCommentId,
          ])
        : null;

      const updater = (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map((page: any) => ({
            ...page,
            data: page.data.map((c: CommentWithUser) => {
              if (c.id === variables.commentId) {
                return {
                  ...c,
                  likes: [...c.likes, { userId: currentUserId }],
                  likesCount: c.likesCount + 1,
                };
              }
              return c;
            }),
          })),
        };
      };

      queryClient.setQueryData(["post-comments", variables.postId], updater);
      if (variables.parentCommentId) {
        queryClient.setQueryData(
          ["comment-replies", variables.parentCommentId],
          updater,
        );
      }

      return { previousComments, previousReplies };
    },
    onError: (err, variables, context) => {
      if (context?.previousComments) {
        queryClient.setQueryData(
          ["post-comments", variables.postId],
          context.previousComments,
        );
      }
      if (context?.previousReplies) {
        queryClient.setQueryData(
          ["comment-replies", variables.parentCommentId],
          context.previousReplies,
        );
      }
    },
    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["post-comments", variables.postId],
      });
      if (variables.parentCommentId) {
        queryClient.invalidateQueries({
          queryKey: ["comment-replies", variables.parentCommentId],
        });
      }
    },
  });
}

export function useUnlikeComment() {
  const queryClient = useQueryClient();
  const session = authClient.useSession();
  const currentUserId = session.data?.user.id;

  return useMutation({
    mutationFn: async ({
      commentId,
    }: {
      commentId: string;
      postId: string;
      parentCommentId?: string;
    }) => {
      const res = await axiosGateway.delete(
        `/api/real-time/comments/${commentId}/like`,
      );
      return res.data;
    },
    onMutate: async (variables) => {
      await queryClient.cancelQueries({
        queryKey: ["post-comments", variables.postId],
      });
      if (variables.parentCommentId) {
        await queryClient.cancelQueries({
          queryKey: ["comment-replies", variables.parentCommentId],
        });
      }

      const previousComments = queryClient.getQueryData([
        "post-comments",
        variables.postId,
      ]);
      const previousReplies = variables.parentCommentId
        ? queryClient.getQueryData([
            "comment-replies",
            variables.parentCommentId,
          ])
        : null;

      const updater = (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map((page: any) => ({
            ...page,
            data: page.data.map((c: CommentWithUser) => {
              if (c.id === variables.commentId) {
                return {
                  ...c,
                  likes: c.likes.filter((l: any) => l.userId !== currentUserId),
                  likesCount: Math.max(0, c.likesCount - 1),
                };
              }
              return c;
            }),
          })),
        };
      };

      queryClient.setQueryData(["post-comments", variables.postId], updater);
      if (variables.parentCommentId) {
        queryClient.setQueryData(
          ["comment-replies", variables.parentCommentId],
          updater,
        );
      }

      return { previousComments, previousReplies };
    },
    onError: (err, variables, context) => {
      if (context?.previousComments) {
        queryClient.setQueryData(
          ["post-comments", variables.postId],
          context.previousComments,
        );
      }
      if (context?.previousReplies) {
        queryClient.setQueryData(
          ["comment-replies", variables.parentCommentId],
          context.previousReplies,
        );
      }
    },
  });
}

export function useDeleteComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      commentId,
    }: {
      commentId: string;
      postId: string;
      parentCommentId?: string;
    }) => {
      const res = await axiosGateway.delete(
        `/api/real-time/comments/${commentId}`,
      );
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["post-comments", variables.postId],
      });
      if (variables.parentCommentId) {
        queryClient.invalidateQueries({
          queryKey: ["comment-replies", variables.parentCommentId],
        });
      }
      queryClient.invalidateQueries({ queryKey: ["post", variables.postId] });
    },
  });
}
