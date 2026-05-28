"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { CreateHighlightDialog } from "@/components/pages/profile/create-highlight-dialog";
import { HighlightStoryViewer } from "@/components/pages/profile/highlight-story-viewer";
import { SuggestedFollowingCarousel } from "@/components/pages/profile/suggested-following-carousel";
import { UserWithStories } from "@/components/pages/home/stories-header";
import { StoryViewer } from "@/components/pages/home/story-viewer";
import { useHandleBAAction } from "@/hooks/use-handle-ba-action";
import { useUserHighlights } from "@/hooks/use-user-highlights";
import { UserProfile } from "@/hooks/use-user-profile";
import { authClient } from "@/lib/auth/auth-client";
import { axiosGateway, FindManyResponse } from "@/lib/axios-config";
import { cn, getMediaUrl } from "@/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  ChevronDown,
  Link as LinkIcon,
  LogOut,
  MessageCircle,
  MoreHorizontal,
  Plus,
  Settings,
  UserPlus,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

interface ProfileHeaderProps {
  user: UserProfile;
}

export function ProfileHeader({ user }: ProfileHeaderProps) {
  const t = useTranslations("ProfilePage");
  const session = authClient.useSession();
  const queryClient = useQueryClient();
  const isOwnProfile = session.data?.user.id === user.id;
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showCreateHighlight, setShowCreateHighlight] = useState(false);
  const [viewingHighlightIndex, setViewingHighlightIndex] = useState<
    number | null
  >(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const { data: highlights = [], isLoading: isLoadingHighlights } =
    useUserHighlights(user.id);
  const { handleBAAction } = useHandleBAAction();
  const router = useRouter();

  const handleLogout = async () => {
    await handleBAAction(() => authClient.signOut());
    router.push("/accounts/login");
  };

  const { data: activeStoryUsers = [] } = useQuery({
    queryKey: ["stories-feed"],
    queryFn: async () => {
      const res =
        await axiosGateway.get<FindManyResponse<UserWithStories>>(
          "/api/feed/stories",
        );
      return res.data?.data || [];
    },
    enabled: !!session.data?.user,
  });

  const profileUserWithStories = activeStoryUsers.find((u) => u.id === user.id);
  const hasStories =
    !!profileUserWithStories && profileUserWithStories.stories.length > 0;

  const isFollowing =
    user?.followers?.some(
      (f) => f.followerId === session.data?.user?.id && f.status === "accepted",
    ) || false;

  const isRequested =
    user?.followers?.some(
      (f) => f.followerId === session.data?.user?.id && f.status === "pending",
    ) || false;

  const hasRequestedToFollowMe =
    user?.following?.some(
      (f) => f.followingId === session.data?.user?.id && f.status === "pending",
    ) || false;

  const isPrivate = user.userPrivacySetting?.accountPrivate ?? false;
  const showHighlights = isOwnProfile || !isPrivate || isFollowing;

  const followMutation = useMutation({
    mutationFn: async () => {
      if (isFollowing || isRequested) {
        return axiosGateway.post("/api/users/unfollow", {
          followingUserId: user.id,
        });
      } else {
        return axiosGateway.post("/api/users/follow", {
          followingUserId: user.id,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["user-profile", user.username],
      });
      toast.success(isFollowing ? t("unfollow") : t("follow"));
    },
  });

  const acceptFollowMutation = useMutation({
    mutationFn: async () => {
      return axiosGateway.patch("/api/users/follow-requests", null, {
        params: {
          followerId: user.id,
          status: "accepted",
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["user-profile", user.username],
      });
      toast.success(t("requestAccepted"));
    },
  });

  return (
    <div className="flex flex-col gap-6 px-4 py-8 md:px-0">
      {/* Top Section: Avatar + Primary Info */}
      <div className="flex gap-4 md:gap-10 items-start">
        {/* Avatar Container */}
        <div className="relative shrink-0">
          <div
            className={cn(
              "rounded-full p-[3px]",
              hasStories ? "bg-tertiary cursor-pointer" : "bg-transparent",
            )}
            onClick={() => hasStories && setViewerOpen(true)}
          >
            <Avatar
              className={cn(
                "w-20 h-20 md:w-36 md:h-36 border border-border",
                hasStories ? "border-2 border-background p-0" : "p-1",
              )}
            >
              <AvatarImage
                src={`/${user.image}` || "/default-avatar.png"}
                alt={user.username}
                className="rounded-full object-cover"
              />
              <AvatarFallback className="text-2xl md:text-4xl bg-muted">
                {user?.username?.slice(0, 2).toUpperCase() || "??"}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>

        {/* Info Block */}
        <div className="flex-1 flex flex-col gap-3 min-w-0">
          {/* Username and Options */}
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold truncate">
              {user?.username || "..."}
            </h1>
            <div className="flex items-center gap-1">
              {isOwnProfile ? (
                <DropdownMenu modal={false}>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Settings className="w-5 h-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56">
                    <DropdownMenuItem asChild>
                      <Link
                        href="/accounts/notifications"
                        className="flex items-center gap-2 cursor-pointer w-full"
                      >
                        <Bell className="w-4 h-4" />
                        <span>{t("settingsDropdown.notifications")}</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link
                        href="/accounts/edit"
                        className="flex items-center gap-2 cursor-pointer w-full"
                      >
                        <Settings className="w-4 h-4" />
                        <span>{t("settingsDropdown.settingsAndPrivacy")}</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive gap-2 cursor-pointer"
                      onClick={handleLogout}
                    >
                      <LogOut className="w-4 h-4" />
                      <span>{t("settingsDropdown.logout")}</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="w-5 h-5" />
                </Button>
              )}
            </div>
          </div>

          {/* Real Name */}
          <div className="text-sm font-semibold truncate px-0.5">
            {user?.name || user?.username}
          </div>

          {/* Stats - Desktop & Mobile merged for this layout */}
          <div className="flex items-center gap-4 text-sm md:gap-8">
            <div className="flex items-center gap-1">
              <span className="font-bold">{user.postsCount}</span>
              <span className="text-muted-foreground">
                {t("posts", { count: user.postsCount })
                  .replace(/\d+/, "")
                  .trim()}
              </span>
            </div>
            <div className="flex items-center gap-1 cursor-pointer">
              <span className="font-bold">{user.followersCount}</span>
              <span className="text-muted-foreground">
                {t("followers", { count: user.followersCount })
                  .replace(/\d+/, "")
                  .trim()}
              </span>
            </div>
            <div className="flex items-center gap-1 cursor-pointer">
              <span className="font-bold">{user.followingCount}</span>
              <span className="text-muted-foreground">
                {t("following", { count: user.followingCount })
                  .replace(/\d+/, "")
                  .trim()}
              </span>
            </div>
          </div>

          {/* Bio & Link Container */}
          <div className="flex flex-col gap-1 text-sm">
            {/* Bio category if available - using placeholder for now */}
            {/* <span className="text-muted-foreground">Personal blog</span> */}
            <p className="whitespace-pre-wrap">{user?.bio}</p>

            {/* Placeholder Link */}
            {/* <div className="flex items-center gap-1 text-sky-600 dark:text-sky-400 font-semibold cursor-pointer hover:underline mt-1">
              <LinkIcon className="w-3 h-3" />
              <span className="truncate">linkedin.com/in/{user.username}</span>
            </div> */}
          </div>
        </div>
      </div>

      {/* Action Buttons Row */}
      <div className="flex gap-2 w-full mt-2">
        {isOwnProfile ? (
          <>
            <Link href="/accounts/edit" className="flex-1">
              <Button variant="secondary" className="w-full font-bold h-9">
                {t("editProfile")}
              </Button>
            </Link>
            <Link href="/archive" className="flex-1">
              <Button variant="secondary" className="w-full font-bold h-9">
                {t("viewArchive")}
              </Button>
            </Link>
          </>
        ) : (
          <>
            {hasRequestedToFollowMe && (
              <Button
                variant="default"
                className="flex-1 font-bold h-9 bg-success hover:bg-success/90 text-white border-none"
                onClick={() => acceptFollowMutation.mutate()}
                disabled={acceptFollowMutation.isPending}
              >
                {t("acceptRequest")}
              </Button>
            )}
            <Button
              variant={isFollowing || isRequested ? "secondary" : "default"}
              className={`flex-1 font-bold h-9 ${
                !isFollowing && !isRequested && !hasRequestedToFollowMe
                  ? "bg-[#0095F6] hover:bg-[#1877F2] text-white border-none"
                  : ""
              }`}
              onClick={() => followMutation.mutate()}
              disabled={followMutation.isPending}
            >
              {isFollowing
                ? t("unfollowing")
                : isRequested
                  ? t("requested")
                  : t("follow")}
            </Button>
            <Button variant="secondary" className="flex-1 font-bold h-9">
              {t("message")}
            </Button>
            <Button
              variant={showSuggestions ? "default" : "secondary"}
              size="icon"
              className="h-9 w-9 shrink-0"
              onClick={() => setShowSuggestions((prev) => !prev)}
              aria-label={t("suggestedFollowing.toggleLabel")}
            >
              <UserPlus className="w-4 h-4" />
            </Button>
          </>
        )}
      </div>

      {/* Suggested Following Carousel */}
      {!isOwnProfile && showSuggestions && (
        <SuggestedFollowingCarousel onClose={() => setShowSuggestions(false)} />
      )}

      {/* Highlights Section */}
      {showHighlights && (
        <div className="flex gap-6 overflow-x-auto no-scrollbar">
          {isOwnProfile && (
            <div className="flex flex-col items-center gap-2 shrink-0">
              <div
                className="w-16 h-16 md:w-20 md:h-20 rounded-full border-3 border-border flex items-center justify-center p-1.5 cursor-pointer"
                onClick={() => setShowCreateHighlight(true)}
              >
                <div className="w-full h-full rounded-full bg-muted flex items-center justify-center">
                  <Plus className="w-8 h-8 text-muted-foreground" />
                </div>
              </div>
              <span className="text-[11px] font-semibold">
                {t("newHighlight")}
              </span>
            </div>
          )}

          {isLoadingHighlights && (
            <div className="flex gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="flex flex-col items-center gap-2 shrink-0"
                >
                  <Skeleton className="w-16 h-16 md:w-20 md:h-20 rounded-full" />
                  <Skeleton className="h-3 w-12 md:w-16" />
                </div>
              ))}
            </div>
          )}

          {highlights.map((highlight, index) => (
            <div
              key={highlight.id}
              className="flex flex-col items-center gap-2 shrink-0 group cursor-pointer"
              onClick={() => setViewingHighlightIndex(index)}
            >
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-full border-3 border-border p-1">
                <div className="relative w-full h-full rounded-full overflow-hidden">
                  <Avatar className="w-full h-full">
                    <AvatarImage
                      src={getMediaUrl(
                        highlight.story?.thumbnailUrl,
                        "story",
                        highlight.story?.mediaType,
                      )}
                      className="object-cover"
                    />
                    <AvatarFallback className="bg-muted text-[10px]">
                      {highlight.title.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>
              </div>
              <span className="text-[11px] font-semibold truncate w-16 md:w-20 text-center">
                {highlight.title}
              </span>
            </div>
          ))}
        </div>
      )}

      <CreateHighlightDialog
        open={showCreateHighlight}
        onOpenChange={setShowCreateHighlight}
      />

      {viewingHighlightIndex !== null && (
        <HighlightStoryViewer
          highlights={highlights}
          initialHighlightIndex={viewingHighlightIndex}
          onClose={() => setViewingHighlightIndex(null)}
        />
      )}

      {viewerOpen && (
        <StoryViewer
          users={activeStoryUsers}
          initialUserIndex={activeStoryUsers.findIndex((u) => u.id === user.id)}
          onClose={() => setViewerOpen(false)}
        />
      )}
    </div>
  );
}
