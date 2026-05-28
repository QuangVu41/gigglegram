"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Heart,
  MessageCircle,
  Send,
  MoreHorizontal,
  Volume2,
  VolumeX,
  Bookmark,
  Flag,
  Music2,
} from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useInView } from "react-intersection-observer";
import { PostWithRelations } from "@/hooks/use-feed";
import { usePostActions } from "@/hooks/use-post-actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, getMediaUrl } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { CaptionRenderer } from "@/components/common/caption-renderer";
import { Video } from "@videojs/react/video";
import { useSocket } from "@/components/common/socket-provider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ReportDialog } from "@/components/common/report-dialog";
import { SensitiveContentOverlay } from "@/components/common/sensitive-content-overlay";

interface ReelPlayerProps {
  post: PostWithRelations;
  isActive: boolean;
}

export function ReelPlayer({ post, isActive }: ReelPlayerProps) {
  const { likePost, savePost, sharePost, currentUserId } = usePostActions([
    "suggested-reels",
  ]);
  const tReport = useTranslations("Report");
  const { socket } = useSocket();
  const [isMuted, setIsMuted] = useState(true);
  const [showFullCaption, setShowFullCaption] = useState(false);
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hasEmittedView = useRef(false);
  const hasEmitted5s = useRef(false);
  const { ref: inViewRef, inView } = useInView({
    threshold: 0.1,
  });

  useEffect(() => {
    if (isActive && socket && !hasEmittedView.current) {
      socket.emit("post_view", { postId: post.id });
      hasEmittedView.current = true;
    }
  }, [isActive, socket, post.id]);

  useEffect(() => {
    hasEmitted5s.current = false;
  }, [post.id]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      if (video.currentTime >= 5.0 && !hasEmitted5s.current && socket) {
        hasEmitted5s.current = true;
        socket.emit("reel_watched_5s", { reelId: post.id });
      }
    };

    video.addEventListener("timeupdate", handleTimeUpdate);
    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
    };
  }, [post.id, socket]);

  const isLiked = post.likes.some((like) => like.userId === currentUserId);
  const isSaved =
    post.savedPosts?.some((saved) => saved.userId === currentUserId) ?? false;
  const firstVideo =
    post.postMedia.find((m) => m.mediaType?.includes("video")) ||
    post.postMedia[0];

  useEffect(() => {
    if (inView && isActive) {
      videoRef.current?.play().catch(() => {
        if (videoRef.current) {
          setIsMuted(true);
          videoRef.current.play().catch(() => {});
        }
      });
    } else {
      videoRef.current?.pause();
    }
  }, [inView, isActive]);

  useEffect(() => {
    const video = videoRef.current;
    return () => {
      if (video) {
        video.pause();
        video.muted = true;
      }
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
    setIsMuted((prev) => !prev);
  };

  const ActionButtons = ({
    className,
    iconClassName,
  }: {
    className?: string;
    iconClassName?: string;
  }) => (
    <div
      className={cn(
        "flex flex-col items-center space-y-4 md:space-y-6",
        className,
      )}
    >
      <span className="flex flex-col gap-1 items-center">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => likePost(post.id, isLiked)}
        >
          <div className="p-2.5">
            <Heart
              className={cn(
                "w-6! h-6! md:w-7! md:h-7! text-foreground transition-transform active:scale-90",
                isLiked && "fill-destructive text-destructive",
                iconClassName,
              )}
            />
          </div>
        </Button>
        {!post.likesHidden && (
          <span className="text-foreground font-semibold text-[10px] md:text-xs mt-1 drop-shadow-md">
            {post.likesCount}
          </span>
        )}
      </span>

      {!post.commentsDisabled && (
        <Link href={`/p/${post.id}`} scroll={false}>
          <Button variant="ghost" size="icon">
            <div className="p-2.5">
              <MessageCircle
                className={cn(
                  "w-6! h-6! md:w-7! md:h-7! text-foreground transition-transform active:scale-90",
                  iconClassName,
                )}
              />
            </div>
            {post.commentsCount > 0 && (
              <span className="text-foreground font-semibold text-[10px] md:text-xs mt-1 drop-shadow-md">
                {post.commentsCount}
              </span>
            )}
          </Button>
        </Link>
      )}

      <Button variant="ghost" size="icon" onClick={() => sharePost(post)}>
        <div className="p-2.5">
          <Send
            className={cn(
              "w-6! h-6! md:w-7! md:h-7! text-foreground transition-transform active:scale-90",
              iconClassName,
            )}
          />
        </div>
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={() => savePost(post.id, isSaved)}
      >
        <div className="p-2.5">
          <Bookmark
            className={cn(
              "w-6! h-6! md:w-7! md:h-7! text-foreground transition-transform active:scale-90",
              isSaved && "fill-white",
              iconClassName,
            )}
          />
        </div>
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <div className="p-2.5">
              <MoreHorizontal
                className={cn(
                  "w-6! h-6! md:w-7! md:h-7! text-foreground transition-transform active:scale-90",
                  iconClassName,
                )}
              />
            </div>
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
        </DropdownMenuContent>
      </DropdownMenu>

      {post.audioTrack && (
        <Link href={`/explore/audio/${post.audioTrack.id}`} className="mt-4">
          <div className="h-8 w-8 md:h-10 md:w-10 rounded-lg overflow-hidden border border-white/20 shadow-lg relative group active:scale-95 transition-transform">
            <Image
              src={
                post.audioTrack.thumbnailUrl || post.audioTrack.uploader?.image
                  ? `/${post.audioTrack.uploader.image}`
                  : "/default-avatar.png"
              }
              alt="audio"
              fill
              className="object-cover group-hover:scale-110 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
              <Music2 className="w-4 h-4 text-white fill-white animate-pulse" />
            </div>
          </div>
        </Link>
      )}
    </div>
  );

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <div className="relative flex flex-col md:flex-row items-center justify-center h-full w-full max-w-5xl mx-auto px-4 md:gap-6">
        {/* Video Card Container */}
        <div
          ref={inViewRef}
          className="relative aspect-3/4 h-full md:max-h-[90vh] w-auto bg-black rounded-md overflow-hidden cursor-pointer shadow-2xl border border-white/5"
          onClick={togglePlayPause}
        >
          {firstVideo && (
            <Video
              ref={videoRef}
              src={
                firstVideo.status === "failed" || !firstVideo.mediaUrl
                  ? `/raw/${firstVideo.originalRawFileUrl}`
                  : getMediaUrl(
                      firstVideo.mediaUrl,
                      "post",
                      firstVideo.mediaType,
                    )
              }
              poster={
                firstVideo.thumbnailUrl
                  ? getMediaUrl(
                      firstVideo.thumbnailUrl,
                      "post",
                      firstVideo.mediaType,
                    )
                  : undefined
              }
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
              autoPlay={false}
              loop
              muted={isMuted}
            />
          )}

          {firstVideo?.moderationStatus === "flagged" && (
            <SensitiveContentOverlay />
          )}

          {/* Mobile-only Action Sidebar (Overlay) */}
          <div className="absolute right-2 bottom-6 flex flex-col items-center z-20 md:hidden pointer-events-none">
            <ActionButtons className="pointer-events-auto" />
          </div>

          {/* User Info Overlay (Bottom Left) - Adjusted for Nav on mobile */}
          <div className="absolute inset-0 pointer-events-none flex flex-col justify-end p-4 pb-6 z-20">
            <div className="pointer-events-auto flex flex-col space-y-3 max-w-[80%]">
              <div className="flex items-center space-x-2">
                <Link href={`/${post.user.username}`}>
                  <Avatar className="h-8 w-8 md:h-10 md:w-10 border border-white/20 shadow-lg">
                    <AvatarImage
                      src={`/${post.user.image}` || "/default-avatar.png"}
                      alt={post.user.username || ""}
                    />
                    <AvatarFallback className="bg-zinc-800">
                      {(post.user.username || "U").slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Link>
                <Link
                  href={`/${post.user.username}`}
                  className="font-semibold text-foreground text-xs md:text-sm hover:underline drop-shadow-lg"
                >
                  {post.user.username}
                </Link>
              </div>

              {post.caption && (
                <div className="text-foreground text-xs md:text-sm drop-shadow-lg relative w-full">
                  <div
                    className={cn(
                      "transition-all",
                      !showFullCaption && "line-clamp-2",
                    )}
                  >
                    <CaptionRenderer html={post.caption} />
                  </div>
                  {post.caption.length > 80 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowFullCaption(!showFullCaption);
                      }}
                      className="text-foreground/70 text-[10px] md:text-xs font-semibold mt-1 hover:underline h-auto p-0 hover:bg-transparent"
                    >
                      {showFullCaption ? "less" : "more"}
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Mute button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleMute}
            className="absolute top-4 right-4 p-2 rounded-full bg-black/40 backdrop-blur-md text-foreground z-30 pointer-events-auto hover:bg-black/60 transition shadow-lg h-auto w-auto"
          >
            {isMuted ? (
              <VolumeX className="w-4 h-4 md:w-5 md:h-5" />
            ) : (
              <Volume2 className="w-4 h-4 md:w-5 md:h-5" />
            )}
          </Button>
        </div>

        {/* Desktop-only Action Sidebar (Outside) */}
        <div className="hidden md:flex flex-col justify-end items-center pointer-events-auto pb-2">
          <ActionButtons />
        </div>
      </div>

      <ReportDialog
        key={post.id}
        isOpen={isReportDialogOpen}
        onClose={() => setIsReportDialogOpen(false)}
        targetId={post.id}
        targetType="post"
      />
    </div>
  );
}
