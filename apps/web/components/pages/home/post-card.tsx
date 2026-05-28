"use client";

import {
  useState,
  useRef,
  useEffect,
  useOptimistic,
  startTransition,
  useCallback,
} from "react";
import { useInView } from "react-intersection-observer";
import Link from "next/link";
import Image from "next/image";
import { useTranslations, useLocale } from "next-intl";
import { axiosGateway } from "@/lib/axios-config";
import { authClient } from "@/lib/auth/auth-client";
import { UserPrivacySetting } from "@/hooks/use-update-privacy-settings";
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
  Archive,
  Music,
} from "lucide-react";
import { formatInstagramDate } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { PostWithRelations } from "@/hooks/use-feed";
import { CaptionRenderer } from "@/components/common/caption-renderer";
import { cn, getMediaUrl } from "@/lib/utils";
import { Video } from "@videojs/react/video";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { usePostActions } from "@/hooks/use-post-actions";
import { useSocket } from "@/components/common/socket-provider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ReportDialog } from "@/components/common/report-dialog";
import { SensitiveContentOverlay } from "@/components/common/sensitive-content-overlay";

interface PostCardProps {
  post: PostWithRelations;
}

export function PostCard({ post }: PostCardProps) {
  const t = useTranslations("HomePage.feed");
  const tTime = useTranslations("Common.relativeTime");
  const tReport = useTranslations("Report");
  const { likePost, savePost, sharePost, archivePost, currentUserId } =
    usePostActions();
  const { socket } = useSocket();

  const [showFullCaption, setShowFullCaption] = useState(false);
  const [isTagsDialogOpen, setIsTagsDialogOpen] = useState(false);
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const locale = useLocale();
  const [translatedCaption, setTranslatedCaption] = useState<string | null>(
    null,
  );
  const [isTranslating, setIsTranslating] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);

  const isLiked = post.likes.some((like) => like.userId === currentUserId);
  const isSaved =
    post.savedPosts?.some((saved) => saved.userId === currentUserId) ?? false;

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

  const cardRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [showAudio, setShowAudio] = useState(false);
  const hasEmittedView = useRef(false);

  useEffect(() => {
    if (isVisible && socket && !hasEmittedView.current) {
      socket.emit("post_view", { postId: post.id });
      hasEmittedView.current = true;
    }
  }, [isVisible, socket, post.id]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]) {
          setIsVisible(entries[0].isIntersecting);
        }
      },
      { threshold: 0.1 },
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => {
      if (cardRef.current) {
        observer.unobserve(cardRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (isVisible && post.location && post.audioTrack) {
      const interval = setInterval(() => {
        setShowAudio((prev) => !prev);
      }, 3000);
      return () => clearInterval(interval);
    } else {
      setShowAudio(false);
    }
  }, [isVisible, post.location, post.audioTrack]);

  const media = post.postMedia.sort((a, b) => a.displayOrder - b.displayOrder);
  const hasMultipleMedia = media.length > 1;
  const hasVideo = media.some((item) => item.mediaType?.includes("video"));

  // Filter accepted collaborators (excluding original author if they are already and primary)
  // Actually, the backend inserts the author as a collaborator too.
  const acceptedCollaborators = post.postCollaborators
    .filter((c) => c.status === "accepted")
    .sort((a, b) => (b.isOriginalAuthor ? 1 : -1));

  const displayCollaborators = acceptedCollaborators.slice(0, 2);
  const remainingCount =
    acceptedCollaborators.length - displayCollaborators.length;

  const firstCollab = acceptedCollaborators[0];
  const secondCollab = acceptedCollaborators[1];

  const collaboratorNamesText = () => {
    if (acceptedCollaborators.length === 0)
      return post.user.username || post.user.name || "";
    if (acceptedCollaborators.length === 1)
      return (
        acceptedCollaborators[0]?.user.username ||
        acceptedCollaborators[0]?.user.name ||
        ""
      );

    const names = acceptedCollaborators.map(
      (c) => c.user.username || c.user.name || "",
    );
    if (acceptedCollaborators.length === 2) {
      return `${names[0]} ${t("post.and")} ${names[1]}`;
    }
    return `${names[0]}, ${names[1]} ${t("post.andOthers", { count: remainingCount + (acceptedCollaborators.length - 2 > 0 ? acceptedCollaborators.length - 2 : 0) })}`;
  };

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

  const toggleTags = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsTagsDialogOpen(true);
  };

  const handleTranslate = async () => {
    if (translatedCaption && !showOriginal) {
      setShowOriginal(true);
      return;
    }

    if (translatedCaption && showOriginal) {
      setShowOriginal(false);
      return;
    }

    setIsTranslating(true);
    try {
      const response = await axiosGateway.post("/api/posts/translate-text", {
        text: post.caption,
        targetLang: post.language === "vi" ? "en" : "vi",
      });
      setTranslatedCaption(response.data.data);
      setShowOriginal(false);
    } catch (error) {
      console.error("Translation error:", error);
    } finally {
      setIsTranslating(false);
    }
  };

  const postOwnerPrivacySetting = (post.user as any)?.userPrivacySetting as
    | UserPrivacySetting
    | undefined;
  const shouldHideLikes =
    post.likesHidden || postOwnerPrivacySetting?.hideLikesCount;
  const canTranslate = post.caption && post.language !== locale;

  return (
    <Card
      ref={cardRef}
      className="w-full border-none shadow-none rounded-none sm:rounded-xl mb-4 bg-transparent py-2 gap-2"
    >
      {/* Header */}
      <CardHeader className="flex flex-row items-center justify-between p-3">
        <div className="flex items-center space-x-3">
          <div className="flex -space-x-3">
            {acceptedCollaborators.length > 1 ? (
              acceptedCollaborators.slice(0, 2).map((collab, idx) => (
                <Link key={collab.userId} href={`/${collab.user.username}`}>
                  <Avatar
                    className={cn(
                      "h-8 w-8 border-2 border-background",
                      idx === 0 ? "z-10" : "z-0",
                    )}
                  >
                    <AvatarImage
                      src={`/${collab.user.image}` || "/default-avatar.png"}
                      alt={collab.user.username || collab.user.name || ""}
                    />
                    <AvatarFallback>
                      {(collab.user.username || collab.user.name || "U")
                        .slice(0, 2)
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Link>
              ))
            ) : (
              <Link href={`/${post.user.username}`}>
                <Avatar className="h-8 w-8 border">
                  <AvatarImage
                    src={`/${post.user.image}` || "/default-avatar.png"}
                    alt={post.user.username || post.user.name || ""}
                  />
                  <AvatarFallback>
                    {(post.user.username || post.user.name || "U")
                      .slice(0, 2)
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Link>
            )}
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1 text-sm leading-tight">
              <span className="font-semibold hover:underline cursor-pointer">
                {acceptedCollaborators.length > 1 ? (
                  <>
                    <Link href={`/${firstCollab?.user?.username}`}>
                      {firstCollab?.user?.username || firstCollab?.user?.name}
                    </Link>
                    <span className="font-normal mx-1">{t("post.and")}</span>
                    {acceptedCollaborators.length === 2 ? (
                      <Link href={`/${secondCollab?.user?.username}`}>
                        {secondCollab?.user?.username ||
                          secondCollab?.user?.name}
                      </Link>
                    ) : (
                      <span onClick={() => setIsTagsDialogOpen(true)}>
                        {t("post.othersCount", {
                          count: acceptedCollaborators.length - 1,
                        })}
                      </span>
                    )}
                  </>
                ) : (
                  <Link href={`/${post.user.username}`}>
                    {post.user.username || post.user.name}
                  </Link>
                )}
              </span>
              <span className="text-muted-foreground flex items-center">
                <span className="mx-1 text-[10px]">•</span>
                {formatInstagramDate(post.createdAt, tTime)}
              </span>
            </div>
            {post.location && (!post.audioTrack || !showAudio) && (
              <Link href={`/explore/locations/${post.location.id}`}>
                <span className="text-xs text-foreground/80 flex items-center mt-0.5 leading-tight hover:underline cursor-pointer">
                  {post.location.name}
                </span>
              </Link>
            )}

            {post.audioTrack && (!post.location || showAudio) && (
              <Link href={`/explore/audio/${post.audioTrack.id}`}>
                <span className="text-xs text-foreground/80 flex items-center mt-0.5 leading-tight hover:underline cursor-pointer">
                  <Music className="w-2.5 h-2.5 mr-1" />
                  {post.audioTrack.title ||
                    `${t("originalSound")} - ${post.audioTrack.uploader?.name}`}
                </span>
              </Link>
            )}
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full"
            >
              <MoreHorizontal className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() => setIsReportDialogOpen(true)}
            >
              <Flag className="w-4 h-4 mr-2" />
              <span>{tReport("itemLabel")}</span>
            </DropdownMenuItem>
            {currentUserId === post.userId && (
              <DropdownMenuItem
                className="cursor-pointer text-foreground"
                onClick={() => archivePost(post.id, post.isArchived)}
              >
                <Archive className="w-4 h-4 mr-2" />
                <span>
                  {post.isArchived ? t("post.unarchive") : t("post.archive")}
                </span>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>

      <ReportDialog
        key={post.id}
        isOpen={isReportDialogOpen}
        onClose={() => setIsReportDialogOpen(false)}
        targetId={post.id}
        targetType="post"
      />

      <CardContent className="p-0 border-y sm:border-none">
        <div className="relative aspect-3/4 w-full bg-muted overflow-hidden sm:rounded-md cursor-pointer group">
          {hasMultipleMedia ? (
            <Carousel className="w-full h-full">
              <CarouselContent
                className="h-full ml-0"
                viewportClassName="h-full"
              >
                {media.map((item) => (
                  <CarouselItem key={item.id} className="pl-0 h-full relative">
                    <MediaRenderer
                      item={item}
                      status={item.status}
                      postId={post.id}
                    />
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="left-2 bg-background/50 border-none hover:bg-background/80" />
              <CarouselNext className="right-2 bg-background/50 border-none hover:bg-background/80" />
            </Carousel>
          ) : (
            media[0] && (
              <MediaRenderer
                item={media[0]}
                status={media[0].status}
                postId={post.id}
              />
            )
          )}

          {/* Audio Track Toggle Icon for Image Posts */}
          {post.audioTrack && !hasVideo && (
            <PostAudio track={post.audioTrack} />
          )}

          {/* User Tags Trigger Icon */}
          {post.postUserTags.some((tag) => tag.status === "accepted") && (
            <Button
              variant="secondary"
              size="icon"
              className="absolute bottom-3 left-3 h-8 w-8 rounded-full bg-black/60 hover:bg-black/80 text-white z-10"
              onClick={toggleTags}
            >
              <Users className="h-4 w-4" />
            </Button>
          )}

          <TaggedUsersDialog
            isOpen={isTagsDialogOpen}
            onOpenChange={setIsTagsDialogOpen}
            tags={post.postUserTags.filter((t) => t.status === "accepted")}
          />
        </div>
      </CardContent>

      {/* Actions */}
      <CardFooter className="flex flex-col items-start p-3 space-y-2">
        <div className="flex w-full justify-between items-center h-10">
          <div className="flex space-x-4">
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-8 w-8 p-0",
                optimisticPost.isLiked && "text-destructive mb-1",
              )}
              onClick={handleLike}
            >
              <Heart
                className={cn(
                  "h-6! w-6! transition-colors",
                  optimisticPost.isLiked
                    ? "fill-red-500 text-red-500"
                    : "text-foreground",
                )}
              />
            </Button>
            {!post.commentsDisabled && (
              <Link href={`/p/${post.id}`} scroll={false}>
                <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
                  <MessageCircle className="h-6! w-6!" />
                </Button>
              </Link>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 p-0"
              onClick={handleShare}
            >
              <Send className="h-6! w-6!" />
            </Button>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 p-0"
            onClick={handleSave}
          >
            <Bookmark
              className={cn(
                "h-6! w-6!",
                optimisticPost.isSaved && "fill-current",
              )}
            />
          </Button>
        </div>

        {/* Likes Count */}
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
          </div>
        </div>

        {/* Caption */}
        {post.caption && (
          <div className="text-sm w-full relative">
            <div
              className={cn(
                "transition-all leading-snug [&_div]:inline [&_p]:inline",
                !showFullCaption && "line-clamp-2",
              )}
            >
              <Link
                href={`/${post.user.username}`}
                className="font-semibold mr-2 hover:underline"
              >
                {post.user.username || post.user.name}
              </Link>
              <CaptionRenderer
                html={
                  showOriginal
                    ? post.caption
                    : translatedCaption || post.caption
                }
              />
            </div>

            <div className="flex items-center gap-3 mt-1">
              {post.caption.length > 80 && (
                <button
                  className="text-muted-foreground text-xs hover:underline cursor-pointer font-medium"
                  onClick={() => setShowFullCaption(!showFullCaption)}
                >
                  {showFullCaption ? t("post.less") : t("post.more")}
                </button>
              )}

              {canTranslate && (
                <button
                  className="text-foreground text-xs hover:underline cursor-pointer font-bold"
                  onClick={handleTranslate}
                  disabled={isTranslating}
                >
                  {isTranslating
                    ? "..."
                    : translatedCaption
                      ? showOriginal
                        ? t("post.seeTranslation")
                        : t("post.seeOriginal")
                      : t("post.seeTranslation")}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Comments Count */}
        {!post.commentsDisabled && (
          <Link href={`/p/${post.id}`} scroll={false}>
            <button className="text-sm text-muted-foreground hover:underline cursor-pointer">
              {post.commentsCount > 0
                ? t("post.viewComments", { count: post.commentsCount })
                : t("post.viewNoComments")}
            </button>
          </Link>
        )}
      </CardFooter>
    </Card>
  );
}

function MediaRenderer({
  item,
  status,
  postId,
}: {
  item: PostWithRelations["postMedia"][number];
  status: PostWithRelations["postMedia"][number]["status"];
  postId: string;
}) {
  const isVideo = item.mediaType?.includes("video");

  return (
    <>
      {isVideo ? (
        <PostVideo item={item} status={status} postId={postId} />
      ) : (
        <Image
          src={
            status === "failed"
              ? `/raw/${item.originalRawFileUrl}`
              : getMediaUrl(item.mediaUrl, "post", item.mediaType)
          }
          alt={item.altText || "Post media"}
          fill
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
      )}
      {item.moderationStatus === "flagged" && <SensitiveContentOverlay />}
    </>
  );
}

function PostVideo({
  item,
  status,
  postId,
}: {
  item: PostWithRelations["postMedia"][number];
  status: PostWithRelations["postMedia"][number]["status"];
  postId: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const { socket } = useSocket();
  const hasEmitted5s = useRef(false);
  const { ref: inViewRef, inView } = useInView({
    threshold: 0.1,
  });

  useEffect(() => {
    hasEmitted5s.current = false;
  }, [postId]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      if (video.currentTime >= 5.0 && !hasEmitted5s.current && socket) {
        hasEmitted5s.current = true;
        socket.emit("reel_watched_5s", { reelId: postId });
      }
    };

    video.addEventListener("timeupdate", handleTimeUpdate);
    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
    };
  }, [postId, socket]);

  useEffect(() => {
    if (inView) {
      videoRef.current?.play().catch(() => {});
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
  }, []);

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
    e.preventDefault();
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
    }
  };

  return (
    <div
      ref={inViewRef}
      className="w-full h-full relative group cursor-pointer"
      onClick={togglePlayPause}
    >
      <Video
        ref={videoRef}
        src={
          status === "failed" || !item.mediaUrl
            ? `/raw/${item.originalRawFileUrl}`
            : getMediaUrl(item.mediaUrl, "post", item.mediaType)
        }
        poster={
          item.thumbnailUrl
            ? getMediaUrl(item.thumbnailUrl, "post", item.mediaType)
            : ""
        }
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
        autoPlay={false}
        loop
        muted={isMuted}
      />

      <button
        onClick={toggleMute}
        className="absolute bottom-3 right-3 p-1.5 rounded-full bg-black/60 text-white z-10 transition-opacity opacity-0 group-hover:opacity-100 sm:opacity-100 flex items-center justify-center cursor-pointer hover:bg-black/80"
        aria-label={isMuted ? "Unmute" : "Mute"}
      >
        {isMuted ? (
          <VolumeX className="w-4 h-4" />
        ) : (
          <Volume2 className="w-4 h-4" />
        )}
      </button>
    </div>
  );
}

function TaggedUsersDialog({
  isOpen,
  onOpenChange,
  tags,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  tags: PostWithRelations["postUserTags"];
}) {
  const t = useTranslations("HomePage.feed.post");

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[400px] p-0 overflow-hiddenborder-[#333] text-forground">
        <DialogHeader className="p-4 border-b border-[#333] flex flex-row items-center justify-between">
          <DialogTitle className="text-base font-bold text-center flex-1">
            {t("taggedTitle")}
          </DialogTitle>
        </DialogHeader>

        <div className="max-h-[300px] overflow-y-auto p-2">
          {tags.length > 0 ? (
            tags.map((tag) => (
              <Link
                key={tag.id}
                href={`/${tag.user.username}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 rounded-md cursor-pointer transition-colors"
                onClick={() => onOpenChange(false)}
              >
                <Avatar className="h-11 w-11 border-none bg-muted">
                  <AvatarImage
                    src={`/${tag.user.image}` || "/default-avatar.png"}
                    alt={tag.user.username}
                  />
                  <AvatarFallback>
                    {(tag.user.username || tag.user.name || "U")
                      .slice(0, 2)
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-sm truncate">
                      {tag.user.username}
                    </span>
                  </div>
                  <span className="text-white/60 text-sm truncate">
                    {tag.user.name}
                  </span>
                </div>
              </Link>
            ))
          ) : (
            <div className="px-4 py-8 text-center text-white/50 text-sm italic">
              {t("noTags")}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PostAudio({
  track,
}: {
  track: PostWithRelations["audioTrack"];
}) {
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
      <audio
        ref={audioRef}
        src={getMediaUrl(track.audioUrl, "post", "video/mp4")}
        loop
        muted={isMuted}
      />
      <button
        onClick={toggleMute}
        className="absolute bottom-3 right-3 p-1.5 rounded-full bg-black/60 text-white pointer-events-auto transition-opacity opacity-0 group-hover:opacity-100 sm:opacity-100 flex items-center justify-center cursor-pointer hover:bg-black/80"
        aria-label={isMuted ? "Unmute" : "Mute"}
      >
        {isMuted ? (
          <VolumeX className="w-4 h-4" />
        ) : (
          <Volume2 className="w-4 h-4" />
        )}
      </button>
    </div>
  );
}

