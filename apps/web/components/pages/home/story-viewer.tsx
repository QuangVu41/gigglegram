"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { UserWithStories } from "./stories-header";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  Trash2,
  MoreHorizontal,
  Flag,
} from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, formatInstagramDate, getMediaUrl } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { useTranslations } from "next-intl";
import { Player } from "@/components/common/video-preview";
import { Video } from "@videojs/react/video";
import { useSocket } from "@/components/common/socket-provider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ReportDialog } from "@/components/common/report-dialog";
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
import { useIsMobile } from "@/hooks/use-mobile";
import { SensitiveContentOverlay } from "@/components/common/sensitive-content-overlay";

interface StoryViewerProps {
  users: UserWithStories[];
  initialUserIndex: number;
  initialStoryIndex?: number;
  onClose: () => void;
  onDeleteStory?: (userId: string, storyId: string) => void;
  onUserIndexChange?: (index: number) => void;
  deleteLabel?: string;
  deleteDescription?: string;
}

const DEFAULT_IMAGE_DURATION = 7000;

export function StoryViewer({
  users,
  initialUserIndex,
  initialStoryIndex = 0,
  onClose,
  onDeleteStory,
  onUserIndexChange,
  deleteLabel,
  deleteDescription,
}: StoryViewerProps) {
  const t = useTranslations("Common.relativeTime");
  const tReport = useTranslations("Report");
  const tPost = useTranslations("HomePage.feed.post");
  const tViewer = useTranslations("StoryViewer");
  const [userIndex, setUserIndex] = useState(initialUserIndex);
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const isMobile = useIsMobile();
  const { socket } = useSocket();
  const emittedStoriesRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    onUserIndexChange?.(userIndex);
  }, [userIndex, onUserIndexChange]);
  const [storyIndex, setStoryIndex] = useState(initialStoryIndex);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  const currentUser = users[userIndex];
  const currentStory = currentUser?.stories?.[storyIndex];

  useEffect(() => {
    if (
      currentStory &&
      socket &&
      !emittedStoriesRef.current.has(currentStory.id)
    ) {
      socket.emit("story_view", { storyId: currentStory.id });
      emittedStoriesRef.current.add(currentStory.id);
    }
  }, [currentStory, socket]);

  const advanceStory = useCallback(() => {
    setProgress(0);
    if (!currentUser) return;
    const storiesLength = currentUser.stories?.length || 0;
    if (storyIndex < storiesLength - 1) {
      setStoryIndex((prev) => prev + 1);
    } else {
      if (userIndex < users.length - 1) {
        setUserIndex((prev) => prev + 1);
        setStoryIndex(0);
      } else {
        onClose();
      }
    }
  }, [
    storyIndex,
    currentUser?.stories?.length,
    userIndex,
    users.length,
    onClose,
  ]);

  const previousStory = useCallback(() => {
    setProgress(0);
    if (storyIndex > 0) {
      setStoryIndex((prev) => prev - 1);
    } else {
      if (userIndex > 0) {
        const prevUser = users[userIndex - 1];
        if (prevUser && prevUser.stories) {
          setUserIndex((prevUserIndex) => prevUserIndex - 1);
          setStoryIndex(prevUser.stories.length - 1);
        }
      }
    }
  }, [storyIndex, userIndex, users]);

  useEffect(() => {
    if (!currentStory) return;

    // Auto-advance for image
    if (currentStory.mediaType?.includes("image")) {
      const intervalDelay = 100;
      let start = Date.now() - (progress / 100) * DEFAULT_IMAGE_DURATION;

      const interval = setInterval(() => {
        if (!isPaused) {
          const now = Date.now();
          const elapsed = now - start;
          const newProgress = (elapsed / DEFAULT_IMAGE_DURATION) * 100;

          if (elapsed >= DEFAULT_IMAGE_DURATION) {
            advanceStory();
          } else {
            setProgress(newProgress);
          }
        } else {
          // Push start time forward while paused
          start += intervalDelay;
        }
      }, intervalDelay);

      return () => clearInterval(interval);
    }
  }, [currentStory, isPaused, advanceStory, progress]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") advanceStory();
      if (e.key === "ArrowLeft") previousStory();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [advanceStory, previousStory, onClose]);

  const router = useRouter();

  const togglePause = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsPaused((prev) => {
      const next = !prev;
      if (videoRef.current) {
        if (next) videoRef.current.pause();
        else videoRef.current.play();
      }
      return next;
    });
  };

  const navigateToUser = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClose();
    if (currentUser?.username) {
      router.push(`/${currentUser.username}`);
    }
  };

  const isVideo = currentStory?.mediaType?.includes("video");

  const handleContainerClick = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;

    if (x < width * 0.3) {
      previousStory();
    } else if (x > width * 0.7) {
      advanceStory();
    } else {
      setIsPaused((prev) => {
        const next = !prev;
        if (videoRef.current) {
          if (next) videoRef.current.pause();
          else videoRef.current.play();
        }
        return next;
      });
    }
  };

  if (!currentUser) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#1a1a1a] dark flex items-center justify-center overflow-hidden">
      {/* Dynamic Blurred Background using current cover/story */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat blur-2xl opacity-20 scale-110"
        style={{
          backgroundImage: `url(${getMediaUrl(
            isVideo ? currentStory?.thumbnailUrl : currentStory?.mediaUrl,
            "story",
            currentStory?.mediaType,
          )})`,
        }}
      />

      {/* Top right close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-60 p-2 text-foreground hover:bg-accent rounded-full transition-colors"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Main Layout containing side views and active view */}
      <div className="relative w-full h-dvh md:h-[90dvh] flex items-center justify-center space-x-0 md:space-x-8">
        {/* Previous User Preview */}
        <div className="hidden md:flex w-[20vw] h-full items-center justify-center opacity-40 hover:opacity-100 transition-opacity">
          {userIndex > 0 && users[userIndex - 1] && (
            <motion.div
              layoutId={`user-story-${users[userIndex - 1]?.id}`}
              className="relative w-full h-[60%] lg:h-[70%] max-w-[280px] rounded-xl overflow-hidden cursor-pointer"
              onClick={() => {
                setUserIndex(userIndex - 1);
                setStoryIndex(0);
                setProgress(0);
                setIsPaused(false);
              }}
            >
              <div
                className="absolute inset-0 bg-cover bg-center rounded-xl"
                style={{
                  backgroundImage: `url(${getMediaUrl(
                    users[userIndex - 1]?.stories?.[0]?.thumbnailUrl,
                    "story",
                    users[userIndex - 1]?.stories?.[0]?.mediaType,
                  )})`,
                }}
              />
              <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                <Avatar className="w-16 h-16 border-2 border-primary">
                  <AvatarImage
                    src={users[userIndex - 1]?.image || "/default-avatar.png"}
                  />
                  <AvatarFallback>
                    {users[userIndex - 1]?.name?.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-foreground font-semibold text-lg drop-shadow-md">
                  {users[userIndex - 1]?.name}
                </span>
              </div>
            </motion.div>
          )}
        </div>

        {/* Active Frame */}
        <div
          className="relative w-full md:w-auto md:max-w-md lg:max-w-lg h-dvh md:h-full aspect-9/16 bg-black md:rounded-lg overflow-hidden shrink-0 shadow-2xl flex items-center justify-center z-10 cursor-pointer"
          onClick={isMobile ? handleContainerClick : undefined}
        >
          {/* Progress Bars Overlay */}
          <div className="absolute top-0 left-0 right-0 z-20 flex gap-1 p-2 pt-4 bg-linear-to-b from-black/60 to-transparent">
            {currentUser?.stories?.map((s, idx) => (
              <div
                key={s.id}
                className="h-1 flex-1 bg-muted rounded-full overflow-hidden"
              >
                <div
                  className={cn(
                    "h-full bg-foreground transition-all duration-100 ease-linear",
                  )}
                  style={{
                    width:
                      idx < storyIndex
                        ? "100%"
                        : idx === storyIndex
                          ? `${progress}%`
                          : "0%",
                  }}
                />
              </div>
            ))}
          </div>

          {/* User Header Overlay */}
          <div className="absolute top-6 left-0 right-0 z-50 p-4 flex items-center justify-between pointer-events-none">
            <div
              className="flex items-center gap-3 cursor-pointer pointer-events-auto"
              onClick={navigateToUser}
            >
              <Avatar className="w-8 h-8 border border-foreground">
                <AvatarImage
                  src={currentUser?.image || "/default-avatar.png"}
                />
                <AvatarFallback>
                  {currentUser?.name?.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex items-center gap-2 text-foreground drop-shadow-md hover:underline">
                <span className="font-semibold text-sm">
                  {currentUser?.name}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatInstagramDate(
                    currentStory?.createdAt || Date.now(),
                    t,
                  )}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 pointer-events-auto">
              <button
                onClick={togglePause}
                className="text-foreground hover:text-foreground/80 transition p-2"
              >
                {isPaused ? (
                  <Play className="w-5 h-5 fill-current" />
                ) : (
                  <Pause className="w-5 h-5 fill-current" />
                )}
              </button>
              <DropdownMenu
                onOpenChange={(open) => {
                  if (open) {
                    setIsPaused(true);
                    if (videoRef.current) videoRef.current.pause();
                  } else if (!isReportDialogOpen && !isDeleteDialogOpen) {
                    setIsPaused(false);
                    if (videoRef.current) videoRef.current.play();
                  }
                }}
              >
                <DropdownMenuTrigger asChild>
                  <button
                    onClick={(e) => e.stopPropagation()}
                    className="text-foreground hover:text-foreground/80 transition p-2"
                  >
                    <MoreHorizontal className="w-5 h-5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {onDeleteStory && (
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive cursor-pointer"
                      onClick={() => setIsDeleteDialogOpen(true)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      <span>{tPost("delete")}</span>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onClick={() => setIsReportDialogOpen(true)}
                  >
                    <Flag className="w-4 h-4 mr-2" />
                    <span>{tReport("itemLabel")}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {onDeleteStory && (
                <AlertDialog
                  open={isDeleteDialogOpen}
                  onOpenChange={(open) => {
                    setIsDeleteDialogOpen(open);
                    if (open) {
                      setIsPaused(true);
                      if (videoRef.current) videoRef.current.pause();
                    } else if (!isReportDialogOpen) {
                      setIsPaused(false);
                      if (videoRef.current) videoRef.current.play();
                    }
                  }}
                >
                  <AlertDialogContent className="bg-background border-border">
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        {deleteLabel || tViewer("removeHighlightTitle")}
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        {deleteDescription ||
                          tViewer("removeHighlightDescription")}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="bg-accent text-accent-foreground hover:bg-accent/80 border-none">
                        Cancel
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => {
                          onDeleteStory(currentUser.id, currentStory!.id);
                          setIsDeleteDialogOpen(false);
                        }}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90 border-none"
                      >
                        {deleteLabel ? "Delete" : "Remove"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>

          {currentStory && (
            <ReportDialog
              key={currentStory.id}
              isOpen={isReportDialogOpen}
              onClose={() => {
                setIsReportDialogOpen(false);
                if (!isDeleteDialogOpen) {
                  setIsPaused(false);
                  if (videoRef.current) videoRef.current.play();
                }
              }}
              targetId={currentStory.id}
              targetType="story"
            />
          )}

          {/* Media Content with AnimatePresence for story switching */}
          <AnimatePresence initial={false}>
            <motion.div
              key={currentStory?.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0 w-full h-full bg-black"
            >
              {currentStory &&
                (isVideo ? (
                  <Player.Provider>
                    <Player.Container className="w-full h-full relative cursor-pointer">
                      <Video
                        ref={videoRef}
                        src={
                          currentStory.mediaUrl
                            ? getMediaUrl(
                                currentStory.mediaUrl,
                                "story",
                                currentStory.mediaType,
                              )
                            : `/raw/${currentStory.originalRawFileUrl}`
                        }
                        poster={
                          currentStory.thumbnailUrl
                            ? getMediaUrl(
                                currentStory.thumbnailUrl,
                                "story",
                                currentStory.mediaType,
                              )
                            : `${currentUser?.image || "/default-avatar.png"}`
                        }
                        autoPlay
                        playsInline
                        className="absolute inset-0 w-full h-full object-cover"
                        onCanPlay={(e) => {
                          const target = e.target as HTMLVideoElement;
                          if (!isPaused) {
                            target.play().catch(console.error);
                          }
                        }}
                        onTimeUpdate={(e) => {
                          const target = e.target as HTMLVideoElement;
                          if (target.duration) {
                            setProgress(
                              (target.currentTime / target.duration) * 100,
                            );
                          }
                        }}
                        onEnded={advanceStory}
                      />
                    </Player.Container>
                  </Player.Provider>
                ) : (
                  <Image
                    src={getMediaUrl(
                      currentStory.mediaUrl,
                      "story",
                      currentStory.mediaType,
                    )}
                    alt="Story"
                    fill
                    className="object-contain bg-black"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                ))}
              {currentStory?.moderationStatus === "flagged" && (
                <SensitiveContentOverlay />
              )}
            </motion.div>
          </AnimatePresence>

          {/* Tap Zones for Mobile Navigation */}
          {!isPaused && (
            <>
              <div
                className="absolute top-20 bottom-0 left-0 w-1/3 z-30"
                onClick={(e) => {
                  e.stopPropagation();
                  previousStory();
                }}
              />
              <div
                className="absolute top-20 bottom-0 right-0 w-2/3 z-30"
                onClick={(e) => {
                  e.stopPropagation();
                  advanceStory();
                }}
              />
            </>
          )}

          {/* Chevron Navigators inside desktop */}
          <button
            className="hidden md:flex absolute top-1/2 left-2 -translate-y-1/2 z-40 p-1 rounded-full bg-background/20 text-foreground hover:bg-accent transition"
            onClick={(e) => {
              e.stopPropagation();
              previousStory();
            }}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <button
            className="hidden md:flex absolute top-1/2 right-2 -translate-y-1/2 z-40 p-1 rounded-full bg-background/20 text-foreground hover:bg-accent transition"
            onClick={(e) => {
              e.stopPropagation();
              advanceStory();
            }}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Next User Preview */}
        <div className="hidden md:flex w-[20vw] h-full items-center justify-center opacity-40 hover:opacity-100 transition-opacity">
          {userIndex < users.length - 1 && users[userIndex + 1] && (
            <motion.div
              layoutId={`user-story-${users[userIndex + 1]?.id}`}
              className="relative w-full h-[60%] lg:h-[70%] max-w-[280px] rounded-xl overflow-hidden cursor-pointer"
              onClick={() => {
                setUserIndex(userIndex + 1);
                setStoryIndex(0);
                setProgress(0);
                setIsPaused(false);
              }}
            >
              <div
                className="absolute inset-0 bg-cover bg-center rounded-xl"
                style={{
                  backgroundImage: `url(${getMediaUrl(
                    users[userIndex + 1]?.stories?.[0]?.thumbnailUrl,
                    "story",
                    users[userIndex + 1]?.stories?.[0]?.mediaType,
                  )})`,
                }}
              />
              <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                <Avatar className="w-16 h-16 border-2 border-primary">
                  <AvatarImage
                    src={users[userIndex + 1]?.image || "/default-avatar.png"}
                  />
                  <AvatarFallback>
                    {users[userIndex + 1]?.name?.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-foreground font-semibold text-lg drop-shadow-md">
                  {users[userIndex + 1]?.name}
                </span>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
