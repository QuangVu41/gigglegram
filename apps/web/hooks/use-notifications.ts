import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Bell } from "lucide-react";
import { axiosGateway, FindManyResponse } from "@/lib/axios-config";
import { useSocket } from "@/components/common/socket-provider";
import {
  notifications,
  users,
  posts,
  postCollaborators,
  postUserTags,
  contentReports,
  followers,
  comments,
  stories,
} from "@repo/database";

export type NotificationWithRelations = typeof notifications.$inferSelect & {
  actor: typeof users.$inferSelect;
  post?: typeof posts.$inferSelect | null;
  postCollab?:
    | (typeof postCollaborators.$inferSelect & {
        post?: typeof posts.$inferSelect | null;
      })
    | null;
  postUserTag?: typeof postUserTags.$inferSelect | null;
  report?: typeof contentReports.$inferSelect | null;
  follow?: typeof followers.$inferSelect | null;
  comment?: typeof comments.$inferSelect | null;
  story?: typeof stories.$inferSelect | null;
};

export const NOTIFICATIONS_QUERY_KEY = ["notifications"] as const;

export function useNotifications(limit: number = 20) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { socket } = useSocket();

  const query = useInfiniteQuery({
    queryKey: NOTIFICATIONS_QUERY_KEY,
    queryFn: async ({ pageParam = 1 }) => {
      const res = await axiosGateway.get<
        FindManyResponse<NotificationWithRelations>
      >("/api/real-time/notifications", {
        params: { page: pageParam, limit },
      });
      return res.data;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.metadata?.nextPage ?? undefined,
  });

  useEffect(() => {
    if (!socket) return;

    const handleNewNotification = (notification: NotificationWithRelations) => {
      // Show toast
      if (!notification.isRead) {
        toast(notification.actor?.username || "Gigglegram", {
          id: `notification-${notification.id}`,
          description:
            notification.content +
            (notification.comment?.content
              ? ": " + notification.comment.content
              : ""),
          icon: React.createElement(Bell, { className: "size-4" }),
          action: {
            label: "View",
            onClick: () => {
              let href = null;
              const { type, postId, storyId, actor, comment } = notification;
              if (
                ["like", "reel_like", "comment", "comment_reply"].includes(type)
              ) {
                href = comment?.postId
                  ? `/p/${comment.postId}`
                  : postId
                    ? `/p/${postId}`
                    : null;
              } else if (
                ["follow", "follow_request", "follow_accept"].includes(type)
              ) {
                href = actor?.username ? `/${actor.username}` : null;
              } else if (postId) {
                href = `/p/${postId}`;
              } else if (storyId) {
                href = `/stories/${actor.id}`; // Assuming stories are viewed by user id
              }

              if (href) {
                router.push(href);
              }
            },
          },
        });
      }

      queryClient.setQueryData<{
        pages: FindManyResponse<NotificationWithRelations>[];
        pageParams: number[];
      }>(NOTIFICATIONS_QUERY_KEY, (old) => {
        if (!old) return old;
        const firstPage = old.pages[0];
        if (!firstPage) return old;

        // Prevent adding duplicate notifications if they already exist in the cache
        const exists = old.pages.some((page) =>
          page.data.some((n) => n?.id === notification.id),
        );
        if (exists) return old;

        return {
          ...old,
          pages: [
            {
              ...firstPage,
              data: [notification, ...firstPage.data],
              metadata: firstPage.metadata
                ? {
                    ...firstPage.metadata,
                    total: (firstPage.metadata.total ?? 0) + 1,
                  }
                : firstPage.metadata,
            },
            ...old.pages.slice(1),
          ],
        };
      });
    };

    socket.on("new_notification", handleNewNotification);
    return () => {
      socket.off("new_notification", handleNewNotification);
    };
  }, [socket, queryClient]);

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      await axiosGateway.patch(
        `/api/real-time/notifications/${notificationId}/read`,
      );
    },
    onMutate: async (notificationId) => {
      await queryClient.cancelQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });

      const previousData = queryClient.getQueryData<{
        pages: FindManyResponse<NotificationWithRelations>[];
        pageParams: number[];
      }>(NOTIFICATIONS_QUERY_KEY);

      if (previousData) {
        queryClient.setQueryData(NOTIFICATIONS_QUERY_KEY, {
          ...previousData,
          pages: previousData.pages.map((page) => ({
            ...page,
            data: page.data.map((notification) =>
              notification?.id === notificationId
                ? { ...notification, isRead: true }
                : notification,
            ),
          })),
        });
      }

      return { previousData };
    },
    onError: (err, newTodo, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(NOTIFICATIONS_QUERY_KEY, context.previousData);
      }
    },
  });

  const unreadCount =
    query.data?.pages.flatMap((page) => page.data).filter((n) => n && !n.isRead)
      .length ?? 0;

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
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
    },
  });

  const updateCollabStatusMutation = useMutation({
    mutationFn: async ({
      postId,
      status,
    }: {
      postId: string;
      status: "accepted" | "rejected";
    }) => {
      await axiosGateway.patch("/api/posts/collab-invites", null, {
        params: { postId, status },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
    },
  });

  const updateTagStatusMutation = useMutation({
    mutationFn: async ({
      postId,
      status,
    }: {
      postId: string;
      status: "accepted" | "rejected";
    }) => {
      await axiosGateway.patch("/api/posts/tags", null, {
        params: { postId, status },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
    },
  });

  return {
    ...query,
    unreadCount,
    markAsRead: markAsReadMutation.mutate,
    updateFollowStatus: updateFollowStatusMutation.mutateAsync,
    updateCollabStatus: updateCollabStatusMutation.mutateAsync,
    updateTagStatus: updateTagStatusMutation.mutateAsync,
  };
}
