"use client";

import {
  useState,
  useRef,
  useEffect,
  useOptimistic,
  useTransition,
  useMemo,
  startTransition,
  useCallback,
} from "react";
import { useInView } from "react-intersection-observer";
import Link from "next/link";
import Image from "next/image";
import { useFormatter, useTranslations } from "next-intl";
import {
  Heart,
  MessageCircle,
  Send,
  Bookmark,
  MoreHorizontal,
  Volume2,
  VolumeX,
  Users,
  Flag,
  Edit,
  Trash2,
  Archive,
} from "lucide-react";
import { formatInstagramDate } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { PostWithRelations } from "@/hooks/use-feed";
import { CaptionRenderer } from "@/components/common/caption-renderer";
import { cn, getMediaUrl } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Video } from "@videojs/react/video";
import CreatePostProvider from "@/components/pages/home/create-post-provider";
import EditPostForm from "@/components/pages/home/edit-post-form";
import { usePostActions } from "@/hooks/use-post-actions";
import {
  usePostComments,
  useCreateComment,
  CommentWithUser,
  useLikeComment,
  useUnlikeComment,
  useCommentReplies,
  useDeleteComment,
} from "@/hooks/use-comments";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ReportDialog } from "@/components/common/report-dialog";
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SensitiveContentOverlay } from "@/components/common/sensitive-content-overlay";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useFollow } from "@/hooks/use-follow";
import { authClient } from "@/lib/auth/auth-client";
import { UserPrivacySetting } from "@/hooks/use-update-privacy-settings";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSocket } from "@/components/common/socket-provider";
import { InfiniteData, useQueryClient } from "@tanstack/react-query";
import { FindManyResponse } from "@/lib/axios-config";

interface PostDetailProps {
  post: PostWithRelations;
  isModal?: boolean;
  queryKeyToUpdate?: string[];
}

function CommentItem({
  comment: c,
  postId,
  currentUserId,
  onReply,
  onLike,
  isReply = false,
  postOwnerId,
}: {
  comment: CommentWithUser;
  postId: string;
  currentUserId?: string;
  onReply: (c: CommentWithUser) => void;
  onLike: (id: string, isLiked: boolean, parentCommentId?: string) => void;
  isReply?: boolean;
  postOwnerId: string;
}) {
  const tTime = useTranslations("Common.relativeTime");
  const t = useTranslations("HomePage.feed");
  const [showReplies, setShowReplies] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const { mutate: deleteComment } = useDeleteComment();

  const canDelete = currentUserId === c.userId || currentUserId === postOwnerId;

  const {
    data: repliesData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isLoadingReplies,
  } = useCommentReplies(c.id, 3, showReplies);

  const replies = repliesData?.pages.flatMap((page) => page.data) || [];
  const isLiked = c.likes.some((l: any) => l.userId === currentUserId);

  return (
    <div className={cn("flex flex-col mb-4 group", isReply && "mb-3")}>
      <div className="flex space-x-3">
        <Avatar className={cn("mt-1 border", isReply ? "h-6 w-6" : "h-8 w-8")}>
          <AvatarImage src={`/${c.user.image}` || "/default-avatar.png"} />
          <AvatarFallback>{(c.user.username || "U").slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="text-sm">
            <span className="font-semibold mr-2">{c.user.username}</span>
            <span className="wrap-break-word">{c.content}</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
            <span>{formatInstagramDate(c.createdAt, tTime)}</span>
            {c.likes.length > 0 && (
              <span className="font-semibold">
                {c.likes.length} {c.likes.length === 1 ? "like" : "likes"}
              </span>
            )}
            <button className="font-semibold hover:text-foreground" onClick={() => onReply(c)}>
              {t("post.reply")}
            </button>
            {canDelete && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="hover:text-foreground">
                    <MoreHorizontal className="size-3" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive cursor-pointer"
                    onSelect={() => setIsDeleteDialogOpen(true)}
                  >
                    {t("post.delete")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("post.deleteConfirmTitle")}</AlertDialogTitle>
                  <AlertDialogDescription>{t("post.deleteConfirmDescription")}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t("post.cancel")}</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={() =>
                      deleteComment({
                        commentId: c.id,
                        postId,
                        parentCommentId: c.parentCommentId,
                      })
                    }
                  >
                    {t("post.delete")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
        <button
          className={cn(
            "transition-opacity h-fit mt-2",
            isLiked ? "text-destructive" : "opacity-0 group-hover:opacity-100 text-muted-foreground",
          )}
          onClick={() => onLike(c.id, isLiked, c.parentCommentId)}
        >
          <Heart className={cn("h-3! w-3!", isLiked && "fill-current")} />
        </button>
      </div>

      {c.repliesCount > 0 && !isReply && (
        <div className="ml-11 mt-2">
          <button
            className="flex items-center gap-3 text-xs text-muted-foreground hover:text-foreground font-semibold"
            onClick={() => setShowReplies(!showReplies)}
          >
            <div className="w-6 h-px bg-muted-foreground/30" />
            {showReplies ? "Hide replies" : `View replies (${c.repliesCount})`}
          </button>
          {showReplies && (
            <div className="mt-3">
              {isLoadingReplies ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <Skeleton className="h-6 w-6 rounded-full" />
                      <div className="flex flex-col gap-2 flex-1">
                        <div className="flex items-center gap-2">
                          <Skeleton className="h-2 w-16" />
                          <Skeleton className="h-2 w-8" />
                        </div>
                        <Skeleton className="h-2 w-full" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  {replies.map((reply: any) => (
                    <CommentItem
                      key={reply.id}
                      comment={reply}
                      postId={postId}
                      currentUserId={currentUserId}
                      onReply={onReply}
                      onLike={onLike}
                      isReply={true}
                      postOwnerId={postOwnerId}
                    />
                  ))}
                  {isFetchingNextPage && (
                    <div className="space-y-3 mt-3">
                      {[...Array(2)].map((_, i) => (
                        <div key={i} className="flex items-start gap-3">
                          <Skeleton className="h-6 w-6 rounded-full" />
                          <div className="flex flex-col gap-2 flex-1">
                            <div className="flex items-center gap-2">
                              <Skeleton className="h-2 w-16" />
                              <Skeleton className="h-2 w-8" />
                            </div>
                            <Skeleton className="h-2 w-full" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {hasNextPage && !isFetchingNextPage && (
                    <button
                      className="text-xs font-semibold text-muted-foreground hover:text-foreground mt-2 ml-9"
                      onClick={() => fetchNextPage()}
                    >
                      View more replies
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function PostDetail({ post, isModal = false, queryKeyToUpdate }: PostDetailProps) {
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  const t = useTranslations("HomePage.feed");
  const tTime = useTranslations("Common.relativeTime");
  const tReport = useTranslations("Report");
  const format = useFormatter();
  const { likePost, savePost, sharePost, deletePost, archivePost, currentUserId } = usePostActions(queryKeyToUpdate);
  const {
    data: commentsData,
    isLoading: isLoadingComments,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = usePostComments(post.id);
  const { mutate: createComment, isPending: isCreatingComment } = useCreateComment();

  const [comment, setComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<CommentWithUser | null>(null);
  const [showTags, setShowTags] = useState(false);
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [isPostDeleteDialogOpen, setIsPostDeleteDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const isOwnPost = currentUserId === post.userId;

  const { isFollowing, toggleFollow, isFollowingPending } = useFollow(post.userId);

  const isLiked = post.likes?.some((like) => like.userId === currentUserId) ?? false;
  const isSaved = post.savedPosts?.some((saved) => saved.userId === currentUserId) ?? false;

  const [optimisticPost, addOptimisticAction] = useOptimistic(
    {
      isLiked,
      likesCount: post.likesCount,
      isSaved,
      likes: post.likes,
      user: post.user,
    },
    (state, action: { type: "like" | "save" }) => {
      if (action.type === "like") {
        const newIsLiked = !state.isLiked;
        return {
          ...state,
          isLiked: newIsLiked,
          likesCount: newIsLiked ? state.likesCount + 1 : state.likesCount - 1,
        };
      }
      if (action.type === "save") {
        return {
          ...state,
          isSaved: !state.isSaved,
        };
      }
      return state;
    },
  );

  const queryClient = useQueryClient();
  const { socket } = useSocket();
  const hasEmittedView = useRef(false);

  useEffect(() => {
    if (socket && post.id && !hasEmittedView.current) {
      socket.emit("post_view", { postId: post.id });
      hasEmittedView.current = true;
    }
  }, [socket, post.id]);

  useEffect(() => {
    if (!socket || !post.id) return;

    const roomId = `post-${post.id}`;
    socket.emit("join_room", roomId);

    const handleNewComment = (newComment: CommentWithUser) => {
      const transformedComment: CommentWithUser = {
        ...newComment,
        likes: newComment.likes ?? [],
        replies: newComment.replies ?? [],
      };

      queryClient.setQueryData<InfiniteData<FindManyResponse<CommentWithUser>>>(
        ["post-comments", post.id],
        (oldData) => {
          if (!oldData) return oldData;

          const allComments = oldData.pages.flatMap((page) => page.data);
          if (allComments.some((c) => c.id === transformedComment.id)) return oldData;

          const newPages = oldData.pages;

          if (transformedComment.parentCommentId) {
            // It's a reply, update repliesCount on the parent and invalidate replies query
            let found = false;
            for (const page of newPages) {
              const parent = page.data.find((c: CommentWithUser) => c.id === transformedComment.parentCommentId);
              if (parent) {
                parent.repliesCount = (parent.repliesCount || 0) + 1;
                found = true;
                break;
              }
            }
            queryClient.invalidateQueries({
              queryKey: ["comment-replies", transformedComment.parentCommentId],
            });
            if (found) return { ...oldData, pages: newPages };
            return oldData;
          }

          // It's a new top-level comment, push to the end of the current page list
          if (newPages.length > 0) {
            const lastPageIndex = newPages.length - 1;
            if (newPages?.[lastPageIndex])
              newPages[lastPageIndex].data = [...newPages[lastPageIndex].data, transformedComment];
          }

          return { ...oldData, pages: newPages };
        },
      );
      queryClient.invalidateQueries({ queryKey: ["post", post.id] });
    };

    socket.on("new_comment", handleNewComment);
    return () => {
      socket.off("new_comment", handleNewComment);
    };
  }, [socket, post.id, queryClient]);

  const media = [...(post.postMedia ?? [])].sort((a, b) => a.displayOrder - b.displayOrder);
  const hasMultipleMedia = media.length > 1;
  const hasVideo = media.some((item) => item.mediaType?.includes("video"));

  const { mutate: likeCommentMutation } = useLikeComment();
  const { mutate: unlikeCommentMutation } = useUnlikeComment();

  const handleLike = () => {
    startTransition(() => {
      addOptimisticAction({ type: "like" });
      likePost(post.id, isLiked);
    });
  };
  const handleSave = () => {
    startTransition(() => {
      addOptimisticAction({ type: "save" });
      savePost(post.id, isSaved);
    });
  };
  const handleShare = () => {
    sharePost(post);
  };

  const handleDeletePost = () => {
    deletePost(post.id);
    setIsPostDeleteDialogOpen(false);
    setIsEditDialogOpen(false);
    try {
      closeBtnRef.current?.click();
    } catch {}
  };

  const handleLikeComment = (commentId: string, isLiked: boolean, parentCommentId?: string) => {
    if (isLiked) {
      unlikeCommentMutation({ commentId, postId: post.id, parentCommentId });
    } else {
      likeCommentMutation({ commentId, postId: post.id, parentCommentId });
    }
  };

  const handleReply = (c: CommentWithUser) => {
    setReplyingTo(c);
    setComment(`@${c.user.username} `);
  };

  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim() || isCreatingComment) return;
    createComment(
      { postId: post.id, content: comment, parentCommentId: replyingTo?.id },
      {
        onSuccess: () => {
          setComment("");
          setReplyingTo(null);
        },
      },
    );
  };

  const allComments = commentsData?.pages.flatMap((page) => page.data) || [];

  const postOwnerPrivacySetting = (post.user as any)?.userPrivacySetting as UserPrivacySetting | undefined;
  const shouldHideLikes = post.likesHidden || postOwnerPrivacySetting?.hideLikesCount;

  return (
    <div
      className={cn(
        "flex flex-col md:flex-row w-full bg-background overflow-hidden",
        isModal ? "h-full md:h-[90vh] max-h-[900px]" : "min-h-[600px] border rounded-xl",
      )}
    >
      {isModal && <DialogClose className="hidden" ref={closeBtnRef}></DialogClose>}
      <div
        className={cn(
          "relative bg-black flex items-center justify-center overflow-hidden group",
          isModal ? "w-full md:w-[60%] md:h-full" : "w-full md:w-[60%] aspect-3/4",
        )}
      >
        {hasMultipleMedia ? (
          <Carousel className="w-full h-full">
            <CarouselContent className="h-full ml-0" viewportClassName="h-full">
              {media.map((item) => (
                <CarouselItem key={item.id} className="pl-0 h-full relative">
                  <MediaRenderer item={item} status={item.status} />
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="left-2 bg-background/50 border-none hover:bg-background/80" />
            <CarouselNext className="right-2 bg-background/50 border-none hover:bg-background/80" />
          </Carousel>
        ) : (
          media[0] && <MediaRenderer item={media[0]} status={media[0].status} />
        )}

        {/* Audio Track Toggle Icon for Image Posts */}
        {post.audioTrack && !hasVideo && <PostAudio track={post.audioTrack} />}

        {/* Tag Button */}
        {post.postUserTags && post.postUserTags.some((t) => t.status === "accepted") && (
          <div className="absolute bottom-4 left-4 z-10">
            <Button
              variant="secondary"
              size="icon"
              className="size-8 rounded-full bg-black/60 text-foreground hover:bg-black/80 border-none backdrop-blur-sm transition-transform active:scale-95"
              onClick={() => setShowTags(!showTags)}
            >
              <Users className="size-4" />
            </Button>
          </div>
        )}

        {/* Tagged Users Dialog */}
        <Dialog open={showTags} onOpenChange={setShowTags}>
          <DialogContent className="max-w-[320px] p-0 border-none bg-background/95 backdrop-blur-md overflow-hidden shadow-2xl">
            <DialogHeader className="p-4 border-b border-border/50">
              <DialogTitle className="text-center text-base font-bold tracking-tight">Tagged</DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[300px]">
              <div className="p-2 space-y-1">
                {post.postUserTags
                  .filter((tag) => tag.status === "accepted")
                  .map((tag) => (
                    <Link
                      key={tag.id}
                      href={`/${tag.user.username}`}
                      className="flex items-center gap-3 p-2 hover:bg-foreground/5 rounded-md transition-all active:scale-[0.98]"
                      onClick={() => setShowTags(false)}
                    >
                      <Avatar className="h-10 w-10 border border-border/50">
                        <AvatarImage src={`/${tag.user.image}` || "/default-avatar.png"} />
                        <AvatarFallback className="bg-muted text-[10px]">
                          {(tag.user.username || "U").slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-bold truncate leading-tight">{tag.user.username}</span>
                        <span className="text-[11px] text-muted-foreground truncate">{tag.user.name}</span>
                      </div>
                    </Link>
                  ))}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col w-full md:w-[40%] border-l border-border">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center space-x-3">
            <Link href={`/${post.user?.username}`}>
              <Avatar className="h-8 w-8 border">
                <AvatarImage src={`/${post.user?.image}` || "/default-avatar.png"} alt={post.user?.username || ""} />
                <AvatarFallback>{(post.user?.username || "U").slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
            </Link>
            <div className="flex flex-col">
              <div className="flex items-center gap-1">
                <Link
                  href={`/${post.user?.username || post.user?.id}`}
                  className="text-sm font-semibold hover:underline"
                >
                  {post.user?.username || post.user?.name || "User"}
                </Link>
                {!isOwnPost && (
                  <>
                    <span className="text-muted-foreground text-[10px]">•</span>
                    <button
                      className={cn(
                        "text-xs font-semibold transition-colors",
                        isFollowing ? "text-foreground" : "text-primary hover:text-primary/80",
                      )}
                      onClick={() => toggleFollow()}
                      disabled={isFollowingPending}
                    >
                      {isFollowing ? t("post.unfollow") : t("post.follow")}
                    </button>
                  </>
                )}
              </div>
              {post.location && <span className="text-xs text-muted-foreground">{post.location?.name}</span>}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {isOwnPost && (
                <>
                  <DropdownMenuItem className="cursor-pointer" onClick={() => setIsEditDialogOpen(true)}>
                    <Edit className="w-4 h-4 mr-2" />
                    <span>{t("post.editPost")}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="cursor-pointer text-foreground"
                    onClick={() => archivePost(post.id, post.isArchived)}
                  >
                    <Archive className="w-4 h-4 mr-2" />
                    <span>{post.isArchived ? t("post.unarchive") : t("post.archive")}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="cursor-pointer text-destructive focus:text-destructive"
                    onClick={() => setIsPostDeleteDialogOpen(true)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    <span>{t("post.deletePost")}</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem className="cursor-pointer" onClick={() => setIsReportDialogOpen(true)}>
                <Flag className="w-4 h-4 mr-2" />
                <span>{tReport("itemLabel")}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <ReportDialog
          key={post.id}
          isOpen={isReportDialogOpen}
          onClose={() => setIsReportDialogOpen(false)}
          targetId={post.id}
          targetType="post"
        />

        <AlertDialog open={isPostDeleteDialogOpen} onOpenChange={setIsPostDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {t("post.deletePostConfirmTitle", {
                  defaultValue: "Delete Post?",
                })}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {t("post.deletePostConfirmDescription", {
                  defaultValue: "Are you sure you want to delete this post? This action cannot be undone.",
                })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("post.cancel", { defaultValue: "Cancel" })}</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={handleDeletePost}
              >
                {t("post.delete", { defaultValue: "Delete" })}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent
            showCloseButton={false}
            className={cn(
              "w-full max-w-none h-dvh max-h-dvh sm:w-[calc(100vw-2rem)] sm:max-w-3xl md:max-w-4xl lg:max-w-5xl sm:h-auto sm:max-h-[85dvh] overflow-y-auto no-scrollbar scroll-smooth flex flex-col border-0 sm:border rounded-none! sm:rounded-xl! p-4 sm:p-6",
            )}
          >
            <div className="flex items-center justify-between shrink-0 mb-4">
              <DialogTitle>{t("post.editPost")}</DialogTitle>
              <div id="edit-post-share-btn"></div>
            </div>
            <div
              className={`relative flex flex-col lg:flex-row items-center lg:items-start lg:justify-center gap-6 lg:gap-8 w-full h-full min-h-0`}
            >
              <div className="w-full lg:w-1/2 shrink-0 flex items-center justify-center relative aspect-3/4 bg-black overflow-hidden">
                {hasMultipleMedia ? (
                  <Carousel className="w-full h-full">
                    <CarouselContent className="h-full ml-0" viewportClassName="h-full">
                      {media.map((item) => (
                        <CarouselItem key={item.id} className="pl-0 h-full relative">
                          <MediaRenderer item={item} status={item.status} />
                        </CarouselItem>
                      ))}
                    </CarouselContent>
                    <CarouselPrevious className="left-2 bg-background/50 border-none hover:bg-background/80" />
                    <CarouselNext className="right-2 bg-background/50 border-none hover:bg-background/80" />
                  </Carousel>
                ) : (
                  media[0] && <MediaRenderer item={media[0]} status={media[0].status} />
                )}
                <div id="edit-post-tag-people" className="absolute bottom-4 left-4 z-15"></div>
              </div>
              <div className="w-full lg:w-1/2 flex flex-col max-w-xl mx-auto lg:mx-0 no-scrollbar h-full">
                <CreatePostProvider>
                  <EditPostForm
                    post={post}
                    onSuccess={() => setIsEditDialogOpen(false)}
                    queryKeyToUpdate={queryKeyToUpdate}
                  />
                </CreatePostProvider>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <ScrollArea className="flex-1 p-4 overflow-auto md:max-h-[calc(100vh-330px)]">
          <div className="space-y-6">
            {post.caption && (
              <div className="flex gap-3">
                <Link href={`/${post.user?.username}`}>
                  <Avatar className="h-8 w-8 border">
                    <AvatarImage
                      src={`/${post.user?.image}` || "/default-avatar.png"}
                      alt={post.user?.username || ""}
                    />
                    <AvatarFallback>{(post.user?.username || "U").slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                </Link>
                <div className="flex flex-col gap-1">
                  <div className="text-sm leading-snug [&_div]:inline [&_p]:inline">
                    <Link href={`/${post.user?.username}`} className="font-semibold mr-2 hover:underline">
                      {post.user?.username}
                    </Link>
                    <CaptionRenderer html={post.caption} />
                  </div>
                  <span className="text-xs text-muted-foreground">{formatInstagramDate(post.createdAt, tTime)}</span>
                </div>
              </div>
            )}

            {isLoadingComments ? (
              <div className="flex-1 p-4 space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="flex flex-col gap-2 flex-1">
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-3 w-20" />
                        <Skeleton className="h-3 w-10" />
                      </div>
                      <Skeleton className="h-3 w-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : allComments.length > 0 ? (
              <div className="flex-1 p-4">
                {allComments.map((c) => (
                  <CommentItem
                    key={c.id}
                    comment={c}
                    postId={post.id}
                    currentUserId={currentUserId}
                    onReply={handleReply}
                    onLike={handleLikeComment}
                    postOwnerId={post.userId}
                  />
                ))}
                {hasNextPage && (
                  <button
                    className="w-full text-center text-xs font-semibold text-muted-foreground hover:text-foreground py-2"
                    onClick={() => fetchNextPage()}
                    disabled={isFetchingNextPage}
                  >
                    {isFetchingNextPage ? "Loading..." : "Load more comments"}
                  </button>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 gap-4 text-center relative overflow-hidden">
                <div className="absolute inset-0 bg-grid-fade dark:bg-grid-dark opacity-5" />
                <div className="relative z-10 flex flex-col items-center gap-4">
                  <div className="p-4 border border-foreground/20 rounded-full">
                    <MessageCircle className="w-10 h-10" />
                  </div>
                  <h3 className="text-2xl font-bold">{t("post.viewNoComments")}</h3>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer Actions */}
        <div className="mt-auto border-t border-border bg-background">
          <div className="p-4 space-y-3">
            <div className="flex justify-between items-center h-8">
              <div className="flex space-x-4">
                <Button variant="ghost" size="icon" onClick={handleLike} className="h-8 w-8 p-0 hover:bg-transparent">
                  <Heart
                    className={cn(
                      "h-6! w-6! transition-colors",
                      optimisticPost.isLiked ? "fill-red-500 text-red-500" : "text-foreground",
                    )}
                  />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
                  <MessageCircle className="h-6! w-6!" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 p-0" onClick={handleShare}>
                  <Send className="h-6! w-6!" />
                </Button>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 p-0" onClick={handleSave}>
                <Bookmark className={cn("h-6! w-6!", optimisticPost.isSaved && "fill-current")} />
              </Button>
            </div>

            <div className="space-y-1">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-semibold">
                  {shouldHideLikes
                    ? optimisticPost.likesCount > 0
                      ? t("post.likedByAndOthers", {
                          username:
                            (optimisticPost.likes?.[0] as any)?.user?.username ||
                            (optimisticPost.user as any)?.username,
                        })
                      : null
                    : optimisticPost.likesCount > 0
                      ? optimisticPost.likesCount === 1
                        ? t("post.oneLike")
                        : t("post.likes", { count: optimisticPost.likesCount })
                      : t("post.noLikes")}
                </span>
                {post.isReel && (
                  <span className="text-sm font-semibold">
                    {post.viewsCount === 1
                      ? t("post.oneView")
                      : t("post.views", {
                          count: format.number(post.viewsCount || 0, {
                            notation: "compact",
                          }),
                        })}
                  </span>
                )}
              </div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-tight">
                {formatInstagramDate(post.createdAt, tTime)}
              </div>
            </div>
          </div>

          {/* Add Comment */}
          <div className="p-4 border-t border-border relative">
            {replyingTo && (
              <div className="absolute bottom-full left-0 right-0 bg-background/95 backdrop-blur-sm border-t px-4 py-2 flex items-center justify-between text-[11px] animate-in slide-in-from-bottom-1 duration-200 z-10">
                <span className="text-muted-foreground">
                  Replying to <span className="font-semibold text-foreground">@{replyingTo.user.username}</span>
                </span>
                <button className="text-primary hover:text-primary/80 font-medium" onClick={() => setReplyingTo(null)}>
                  Cancel
                </button>
              </div>
            )}
            <form onSubmit={handleSubmitComment} className="flex items-center gap-3">
              <input
                type="text"
                placeholder={t("post.addComment")}
                className="flex-1 bg-transparent border-none text-sm focus:outline-none placeholder:text-muted-foreground"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
              <Button
                type="submit"
                variant="ghost"
                className="h-auto p-0 text-primary font-semibold text-sm hover:bg-transparent disabled:opacity-50"
                disabled={!comment.trim() || isCreatingComment}
              >
                {t("post.postAction")}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

function MediaRenderer({ item, status }: { item: any; status: string }) {
  const isVideo = item.mediaType?.includes("video");
  return (
    <div className="relative w-full h-full">
      {isVideo ? (
        <PostVideo item={item} status={status} />
      ) : (
        <Image
          src={
            status !== "published" || !item.mediaUrl
              ? `/raw/${item.originalRawFileUrl}`
              : getMediaUrl(item.mediaUrl, "post", item.mediaType)
          }
          alt={item.altText || "Post media"}
          fill
          className="object-cover"
          priority
          sizes="(max-width: 768px) 100vw, 60vw"
        />
      )}
      {item.moderationStatus === "flagged" && <SensitiveContentOverlay />}
    </div>
  );
}

function PostVideo({ item, status }: { item: any; status: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const { ref: inViewRef, inView } = useInView({
    threshold: 0.1,
  });

  const videoSrc =
    status !== "published" || !item.mediaUrl
      ? `/raw/${item.originalRawFileUrl}`
      : getMediaUrl(item.mediaUrl, "post", item.mediaType);

  useEffect(() => {
    if (inView) {
      videoRef.current?.play().catch(() => {
        if (videoRef.current) {
          setIsMuted(true);
          videoRef.current.play().catch(() => {});
        }
      });
    } else {
      videoRef.current?.pause();
    }
  }, [inView]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);

    return () => {
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.pause();
      video.muted = true;
    };
  }, [videoSrc]);

  const togglePlayPause = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().catch(() => {});
    } else {
      videoRef.current.pause();
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMuted((prev) => !prev);
  };

  return (
    <div
      ref={inViewRef}
      className="w-full h-full relative flex items-center justify-center bg-black cursor-pointer group"
      onClick={togglePlayPause}
    >
      <Video
        ref={videoRef}
        src={videoSrc}
        poster={item.thumbnailUrl ? getMediaUrl(item.thumbnailUrl, "post", item.mediaType) : ""}
        className="w-full h-full object-cover"
        autoPlay
        loop
        muted={isMuted}
        playsInline
      />

      <button
        onClick={toggleMute}
        className="absolute bottom-4 right-4 p-2 rounded-full bg-black/60 text-white z-10 hover:bg-black/80 transition-opacity opacity-0 group-hover:opacity-100 sm:opacity-100"
      >
        {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
      </button>
    </div>
  );
}

function PostAudio({ track }: { track: PostWithRelations["audioTrack"] }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isMuted, setIsMuted] = useState(true);
  const { ref: inViewRef, inView } = useInView({
    threshold: 0.1,
  });

  useEffect(() => {
    if (inView) {
      audioRef.current?.play().catch(() => {});
    } else {
      audioRef.current?.pause();
    }
  }, [inView]);

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (audioRef.current) {
      audioRef.current.muted = !audioRef.current.muted;
      setIsMuted(audioRef.current.muted);
    }
  };

  if (!track) return null;

  return (
    <div ref={inViewRef} className="absolute inset-0 pointer-events-none z-10">
      <audio ref={audioRef} src={getMediaUrl(track.audioUrl, "post", "video/mp4")} loop muted={isMuted} />
      <button
        onClick={toggleMute}
        className="absolute bottom-4 right-4 p-2 rounded-full bg-black/60 text-white pointer-events-auto transition-opacity opacity-0 group-hover:opacity-100 sm:opacity-100 flex items-center justify-center cursor-pointer hover:bg-black/80"
        aria-label={isMuted ? "Unmute" : "Mute"}
      >
        {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
      </button>
    </div>
  );
}
