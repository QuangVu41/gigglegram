"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Heart,
  MessageCircle,
  UserPlus,
  UserCheck,
  AtSign,
  Image as ImageIcon,
  Users,
  ShieldAlert,
  Bell,
  RefreshCw,
  Loader2,
} from "lucide-react";
import {
  useNotifications,
  NotificationWithRelations,
} from "@/hooks/use-notifications";
import { getUsernameFallback, formatInstagramDate, cn } from "@/lib/utils";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  useFollowRequests,
  FollowRequestWithActor,
} from "@/hooks/use-follow-requests";
import { authClient } from "@/lib/auth/auth-client";
import { useUserProfile } from "@/hooks/use-user-profile";

// ── Types ──────────────────────────────────────────────────────────────────

type NotificationType = NotificationWithRelations["type"];

interface NotificationSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function getNotificationIcon(type: NotificationType) {
  switch (type) {
    case "like":
    case "reel_like":
      return <Heart className="size-3 fill-destructive text-destructive" />;
    case "comment":
    case "comment_reply":
      return <MessageCircle className="size-3 fill-primary text-primary" />;
    case "comment_like":
      return <Heart className="size-3 fill-tertiary text-tertiary" />;
    case "follow":
    case "follow_request":
      return <UserPlus className="size-3 text-primary" />;
    case "follow_accept":
      return <UserCheck className="size-3 text-success" />;
    case "mention":
    case "tag":
      return <AtSign className="size-3 text-primary" />;
    case "post_share":
    case "save":
      return <ImageIcon className="size-3 text-muted-foreground" />;
    case "collab_invite":
    case "collab_accept":
      return <Users className="size-3 text-primary" />;
    case "assign_reviewer":
    case "report_update":
      return <ShieldAlert className="size-3 text-warning" />;
    case "media_violation":
      return <ShieldAlert className="size-3 text-destructive" />;
    default:
      return <Bell className="size-3 text-muted-foreground" />;
  }
}

function getNotificationHref(
  notification: NotificationWithRelations,
): string | null {
  const { type, postId, storyId, actor } = notification;

  switch (type) {
    case "like":
    case "reel_like":
    case "comment":
      return notification.comment?.postId
        ? `/p/${notification.comment.postId}`
        : null;
    case "comment_reply":
      return notification.comment?.postId
        ? `/p/${notification.comment.postId}`
        : null;
    case "comment_like":
    case "mention":
    case "post_share":
    case "save":
    case "tag":
      return postId ? `/p/${postId}` : null;
    case "report_update":
    case "media_violation":
      if (postId) return `/p/${postId}`;
      if (storyId) return `/stories/${actor.id}`;
      return null;
    case "collab_invite":
    case "collab_accept":
      return notification.postCollab?.post?.id
        ? `/p/${notification.postCollab.post.id}`
        : postId
          ? `/p/${postId}`
          : null;
    case "follow":
    case "follow_request":
    case "follow_accept":
      return actor?.username ? `/${actor.username}` : null;
    case "assign_reviewer":
      return notification.reportId || notification.report?.id
        ? `/dashboard/reports?reportId=${notification.reportId || notification.report?.id}`
        : "/dashboard/reports";
    default:
      return null;
  }
}

function groupNotificationsByTime(
  notifications: NotificationWithRelations[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tTime: (key: string, values?: any) => string,
): { label: string; items: NotificationWithRelations[] }[] {
  const now = new Date();
  const oneDay = 24 * 60 * 60 * 1000;
  const oneWeek = 7 * oneDay;

  const thisWeek: NotificationWithRelations[] = [];
  const earlier: NotificationWithRelations[] = [];

  for (const n of notifications) {
    const diff = now.getTime() - new Date(n.createdAt).getTime();
    if (diff <= oneWeek) {
      thisWeek.push(n);
    } else {
      earlier.push(n);
    }
  }

  const groups: { label: string; items: NotificationWithRelations[] }[] = [];
  if (thisWeek.length > 0)
    groups.push({ label: tTime("thisWeek"), items: thisWeek });
  if (earlier.length > 0)
    groups.push({ label: tTime("earlier"), items: earlier });
  return groups;
}

// ── Sub-components ─────────────────────────────────────────────────────────

function FollowRequestItem({
  request,
  onAction,
}: {
  request: FollowRequestWithActor;
  onAction: (status: "accepted" | "rejected") => Promise<void>;
}) {
  const t = useTranslations("Common.relativeTime");
  const nt = useTranslations("Notifications");
  const actor = request.follower;
  const [isLoading, setIsLoading] = React.useState(false);
  const [status, setStatus] = React.useState<"accepted" | "rejected" | null>(
    null,
  );

  const handleAction = async (newStatus: "accepted" | "rejected") => {
    setIsLoading(true);
    try {
      await onAction(newStatus);
      setStatus(newStatus);
    } catch (err) {
      console.error("Follow request action error:", err);
      toast.error(nt("errors.failedToUpdateFollowRequest"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/50 rounded-lg">
      <div className="relative shrink-0">
        <Avatar className="size-11 border-2 border-background">
          <AvatarImage
            src={`/${actor?.image}` || "/default-avatar.png"}
            alt={actor?.name ?? ""}
          />
          <AvatarFallback className="text-xs">
            {getUsernameFallback(actor?.name ?? "")}
          </AvatarFallback>
        </Avatar>
        <span className="absolute -bottom-1 -right-1 flex size-5 items-center justify-center rounded-full bg-background shadow-sm border border-border">
          <UserPlus className="size-3 text-primary" />
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="text-sm leading-snug">
          <span className="font-semibold">
            {actor?.username ?? actor?.name}
          </span>{" "}
          <span className="text-muted-foreground">
            {nt("follow_request_content", {
              defaultValue: "sent you a follow request",
            })}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          {formatInstagramDate(request.createdAt, t)}
        </p>
      </div>

      {!status ? (
        <div className="flex items-center gap-2 shrink-0 ml-2">
          <Button
            size="sm"
            className="h-8 px-4 font-semibold text-xs"
            disabled={isLoading}
            onClick={() => handleAction("accepted")}
          >
            {nt("accept")}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            className="h-8 px-4 font-semibold text-xs"
            disabled={isLoading}
            onClick={() => handleAction("rejected")}
          >
            {nt("reject")}
          </Button>
        </div>
      ) : (
        <span className="text-xs font-semibold text-muted-foreground shrink-0 ml-auto">
          {nt(status)}
        </span>
      )}
    </div>
  );
}

function NotificationItem({
  notification,
  onClick,
  updateFollowStatus,
  updateCollabStatus,
  updateTagStatus,
}: {
  notification: NotificationWithRelations;
  onClick: () => void;
  updateFollowStatus: (params: {
    followerId: string;
    status: "accepted" | "rejected";
  }) => Promise<void>;
  updateCollabStatus: (params: {
    postId: string;
    status: "accepted" | "rejected";
  }) => Promise<void>;
  updateTagStatus: (params: {
    postId: string;
    status: "accepted" | "rejected";
  }) => Promise<void>;
}) {
  const t = useTranslations("Common.relativeTime");
  const nt = useTranslations("Notifications");
  const actor = notification.actor;
  const [actionStatus, setActionStatus] = React.useState<
    "accepted" | "rejected" | null
  >(() => {
    if (notification.type === "follow_request" && notification.follow?.status) {
      if (notification.follow.status === "accepted") return "accepted";
      if (notification.follow.status === "rejected") return "rejected";
    }
    if (
      notification.type === "collab_invite" &&
      notification.postCollab?.status
    ) {
      if (notification.postCollab.status === "accepted") return "accepted";
      if (notification.postCollab.status === "rejected") return "rejected";
    }
    if (notification.type === "tag" && notification.postUserTag?.status) {
      if (notification.postUserTag.status === "accepted") return "accepted";
      if (notification.postUserTag.status === "rejected") return "rejected";
    }
    return null;
  });
  const [isLoading, setIsLoading] = React.useState(false);
  const [isExpanded, setIsExpanded] = React.useState(false);

  const handleFollowAction = async (
    status: "accepted" | "rejected",
    e: React.MouseEvent,
  ) => {
    e.stopPropagation();
    setIsLoading(true);
    try {
      await updateFollowStatus({ followerId: actor.id, status });
      setActionStatus(status);
    } catch (err) {
      console.error("Follow action error:", err);
      toast.error(nt("errors.failedToUpdateFollowStatus"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCollabAction = async (
    status: "accepted" | "rejected",
    e: React.MouseEvent,
  ) => {
    e.stopPropagation();
    setIsLoading(true);
    try {
      const postId = notification.postCollab?.post?.id || notification.postId;
      if (postId) {
        await updateCollabStatus({ postId, status });
        setActionStatus(status);
      } else {
        console.warn("No postId found for collab action", notification);
        toast.error(nt("errors.postNotFound"));
      }
    } catch (err) {
      console.error("Collab action error:", err);
      toast.error(nt("errors.failedToUpdateCollabStatus"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleTagAction = async (
    status: "accepted" | "rejected",
    e: React.MouseEvent,
  ) => {
    e.stopPropagation();
    setIsLoading(true);
    try {
      const postId = notification.postUserTag?.postId || notification.postId;
      if (postId) {
        await updateTagStatus({ postId, status });
        setActionStatus(status);
      } else {
        console.warn("No postId found for tag action", notification);
        toast.error(nt("errors.postNotFound"));
      }
    } catch (err) {
      console.error("Tag action error:", err);
      toast.error(nt("errors.failedToUpdateTagStatus"));
    } finally {
      setIsLoading(false);
    }
  };

  const showActions =
    (notification.type === "follow_request" ||
      notification.type === "collab_invite" ||
      notification.type === "tag") &&
    !actionStatus;

  return (
    <div
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/50 rounded-lg cursor-pointer",
        !notification.isRead && "bg-accent/30",
      )}
    >
      {/* Avatar stack */}
      <div className="relative shrink-0">
        <Avatar className="size-11 border-2 border-background">
          <AvatarImage
            src={`/${actor?.image}` || "/default-avatar.png"}
            alt={actor?.name ?? ""}
          />
          <AvatarFallback className="text-xs">
            {getUsernameFallback(actor?.name ?? "")}
          </AvatarFallback>
        </Avatar>
        {/* Notification type badge */}
        <span className="absolute -bottom-1 -right-1 flex size-5 items-center justify-center rounded-full bg-background shadow-sm border border-border">
          {getNotificationIcon(notification.type)}
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <div
          className={cn(
            "text-sm leading-snug transition-all",
            !isExpanded && "line-clamp-2",
          )}
        >
          <span className="font-semibold">
            {actor?.username ?? actor?.name}
          </span>{" "}
          <span className="text-muted-foreground">
            {notification.content} {notification.comment?.content}
          </span>
        </div>
        {(notification.content?.length || 0) +
          (notification.comment?.content?.length || 0) >
          80 && (
          <button
            className="text-xs text-primary mt-1 hover:underline cursor-pointer font-medium"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
          >
            {isExpanded ? nt("less") : nt("more")}
          </button>
        )}
        <p className="text-xs text-muted-foreground mt-0.5">
          {formatInstagramDate(notification.createdAt, t)}
        </p>
      </div>

      {/* Actions */}
      {showActions ? (
        <div className="flex items-center gap-2 shrink-0 ml-2">
          <Button
            size="sm"
            className="h-8 px-4 font-semibold text-xs"
            disabled={isLoading}
            onClick={(e) =>
              notification.type === "follow_request"
                ? handleFollowAction("accepted", e)
                : notification.type === "collab_invite"
                  ? handleCollabAction("accepted", e)
                  : handleTagAction("accepted", e)
            }
          >
            {nt("accept")}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            className="h-8 px-4 font-semibold text-xs"
            disabled={isLoading}
            onClick={(e) =>
              notification.type === "follow_request"
                ? handleFollowAction("rejected", e)
                : notification.type === "collab_invite"
                  ? handleCollabAction("rejected", e)
                  : handleTagAction("rejected", e)
            }
          >
            {nt("reject")}
          </Button>
        </div>
      ) : actionStatus ? (
        <span className="text-xs font-semibold text-muted-foreground shrink-0 ml-auto">
          {nt(actionStatus)}
        </span>
      ) : (
        /* Unread dot */
        !notification.isRead && (
          <span className="shrink-0 size-2 rounded-full bg-primary animate-pulse" />
        )
      )}
    </div>
  );
}

function NotificationSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 animate-pulse">
      <Skeleton className="size-11 rounded-full shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3 w-4/5" />
        <Skeleton className="h-3 w-2/5" />
      </div>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────

export function NotificationSheet({
  open,
  onOpenChange,
}: NotificationSheetProps) {
  const router = useRouter();
  const t = useTranslations("Notifications");
  const tTime = useTranslations("Notifications.time");
  const session = authClient.useSession();
  const { data: userProfile } = useUserProfile(
    session.data?.user.username || "",
  );

  const {
    data,
    isLoading: isNotifsLoading,
    isFetchingNextPage: isNotifsFetchingNext,
    hasNextPage: hasNotifsNext,
    fetchNextPage: fetchNotifsNext,
    isError: isNotifsError,
    refetch: refetchNotifs,
    markAsRead,
    updateFollowStatus,
    updateCollabStatus,
    updateTagStatus,
  } = useNotifications();

  const {
    data: frData,
    isLoading: isFrLoading,
    isFetchingNextPage: isFrFetchingNext,
    hasNextPage: hasFrNext,
    fetchNextPage: fetchFrNext,
    isError: isFrError,
    refetch: refetchFr,
    updateFollowStatus: updateFrStatus,
  } = useFollowRequests();

  const isPrivate = userProfile?.userPrivacySetting?.accountPrivate || false;

  const allNotifications =
    data?.pages.flatMap((page) => page?.data ?? []).filter(Boolean) ?? [];
  const commentNotifications = allNotifications.filter(
    (n) =>
      n?.type && ["comment", "comment_reply", "comment_like"].includes(n.type),
  );
  const followRequests =
    frData?.pages.flatMap((page) => page?.data ?? []).filter(Boolean) ?? [];

  const groups = groupNotificationsByTime(allNotifications, tTime);
  const commentGroups = groupNotificationsByTime(commentNotifications, tTime);

  const handleNotificationClick = (notification: NotificationWithRelations) => {
    if (!notification.isRead) {
      markAsRead(notification.id);
    }
    const href = getNotificationHref(notification);
    onOpenChange(false);
    if (href) {
      router.push(href);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        className="w-full max-w-sm p-0 flex flex-col border-r border-border"
      >
        {/* Header */}
        <SheetHeader className="px-4 pt-6 pb-3 border-b border-border shrink-0">
          <div className="flex flex-col gap-4">
            <SheetTitle className="text-xl font-bold">{t("title")}</SheetTitle>
          </div>
        </SheetHeader>

        <Tabs
          defaultValue="all"
          className="flex-1 flex flex-col overflow-auto no-scrollbar"
        >
          <div className="px-4 py-2">
            <TabsList className="w-full justify-start h-auto p-0 bg-transparent gap-4">
              <TabsTrigger
                value="all"
                className="bg-sidebar/50 data-[state=active]:bg-transparent px-0 py-2"
              >
                {t("tabs.all")}
              </TabsTrigger>
              <TabsTrigger
                value="comments"
                className="bg-sidebar/50 data-[state=active]:bg-transparent px-0 py-2"
              >
                {t("tabs.comments")}
              </TabsTrigger>
              {isPrivate && (
                <TabsTrigger
                  value="requests"
                  className="bg-sidebar/50 data-[state=active]:bg-transparent px-0 py-2"
                >
                  {t("tabs.requests")}
                </TabsTrigger>
              )}
            </TabsList>
          </div>

          <ScrollArea>
            <TabsContent value="all" className="m-0 focus-visible:ring-0">
              <NotificationList
                groups={groups}
                isLoading={isNotifsLoading}
                isError={isNotifsError}
                allNotifications={allNotifications}
                hasNextPage={hasNotifsNext}
                isFetchingNextPage={isNotifsFetchingNext}
                fetchNextPage={fetchNotifsNext}
                refetch={refetchNotifs}
                onNotificationClick={handleNotificationClick}
                updateFollowStatus={updateFollowStatus}
                updateCollabStatus={updateCollabStatus}
                updateTagStatus={updateTagStatus}
                t={t}
              />
            </TabsContent>

            <TabsContent value="comments" className="m-0 focus-visible:ring-0">
              <NotificationList
                groups={commentGroups}
                isLoading={isNotifsLoading}
                isError={isNotifsError}
                allNotifications={commentNotifications}
                hasNextPage={hasNotifsNext}
                isFetchingNextPage={isNotifsFetchingNext}
                fetchNextPage={fetchNotifsNext}
                refetch={refetchNotifs}
                onNotificationClick={handleNotificationClick}
                updateFollowStatus={updateFollowStatus}
                updateCollabStatus={updateCollabStatus}
                updateTagStatus={updateTagStatus}
                t={t}
              />
            </TabsContent>

            {isPrivate && (
              <TabsContent
                value="requests"
                className="m-0 focus-visible:ring-0"
              >
                <div className="py-2">
                  {isFrLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <NotificationSkeleton key={i} />
                    ))
                  ) : isFrError ? (
                    <div className="flex flex-col items-center gap-3 py-12 px-6 text-center">
                      <Bell className="size-10 text-muted-foreground/50" />
                      <p className="text-sm text-muted-foreground">
                        {t("error")}
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => refetchFr()}
                        className="gap-2"
                      >
                        <RefreshCw className="size-3.5" />
                        {t("retry")}
                      </Button>
                    </div>
                  ) : followRequests.length === 0 ? (
                    <div className="flex flex-col items-center gap-3 py-16 px-6 text-center">
                      <Users className="size-12 text-muted-foreground/30" />
                      <p className="font-semibold text-sm">
                        {t("followRequests.empty")}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {t("followRequests.emptyDescription")}
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-0.5 px-2">
                      {followRequests.map((request) => (
                        <FollowRequestItem
                          key={request.id}
                          request={request}
                          onAction={(status) =>
                            updateFrStatus({
                              followerId: request.followerId,
                              status,
                            })
                          }
                        />
                      ))}
                    </div>
                  )}
                  {hasFrNext && (
                    <div className="px-4 py-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-muted-foreground"
                        onClick={() => fetchFrNext()}
                        disabled={isFrFetchingNext}
                      >
                        {isFrFetchingNext ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          t("loadMore")
                        )}
                      </Button>
                    </div>
                  )}
                  <div className="pb-10" />
                </div>
              </TabsContent>
            )}
          </ScrollArea>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

function NotificationList({
  groups,
  isLoading,
  isError,
  allNotifications,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  refetch,
  onNotificationClick,
  updateFollowStatus,
  updateCollabStatus,
  updateTagStatus,
  t,
}: {
  groups: { label: string; items: NotificationWithRelations[] }[];
  isLoading: boolean;
  isError: boolean;
  allNotifications: NotificationWithRelations[];
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
  refetch: () => void;
  onNotificationClick: (n: NotificationWithRelations) => void;
  updateFollowStatus: (params: {
    followerId: string;
    status: "accepted" | "rejected";
  }) => Promise<void>;
  updateCollabStatus: (params: {
    postId: string;
    status: "accepted" | "rejected";
  }) => Promise<void>;
  updateTagStatus: (params: {
    postId: string;
    status: "accepted" | "rejected";
  }) => Promise<void>;
  t: any;
}) {
  return (
    <div className="py-2">
      {isLoading ? (
        Array.from({ length: 5 }).map((_, i) => (
          <NotificationSkeleton key={i} />
        ))
      ) : isError ? (
        <div className="flex flex-col items-center gap-3 py-12 px-6 text-center">
          <Bell className="size-10 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">{t("error")}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={refetch}
            className="gap-2"
          >
            <RefreshCw className="size-3.5" />
            {t("retry")}
          </Button>
        </div>
      ) : allNotifications.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 px-6 text-center">
          <Heart className="size-12 text-muted-foreground/30" />
          <p className="font-semibold text-sm">{t("empty")}</p>
          <p className="text-sm text-muted-foreground">
            {t("emptyDescription")}
          </p>
        </div>
      ) : (
        <>
          {groups.map((group) => (
            <div key={group.label}>
              <div className="px-4 py-2">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  {group.label}
                </h3>
              </div>
              <div className="flex flex-col gap-0.5 px-2">
                {group.items.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    updateFollowStatus={updateFollowStatus}
                    updateCollabStatus={updateCollabStatus}
                    updateTagStatus={updateTagStatus}
                    onClick={() => onNotificationClick(notification)}
                  />
                ))}
              </div>
            </div>
          ))}
          {hasNextPage && (
            <div className="px-4 py-3">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-muted-foreground"
                onClick={fetchNextPage}
                disabled={isFetchingNextPage}
              >
                {isFetchingNextPage ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  t("loadMore")
                )}
              </Button>
            </div>
          )}
          <div className="pb-10" />
        </>
      )}
    </div>
  );
}
