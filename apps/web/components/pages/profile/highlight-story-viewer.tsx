"use client";

import {
  HighlightItem,
  HighlightWithStories,
} from "@/hooks/use-user-highlights";
import { StoryViewer } from "@/components/pages/home/story-viewer";
import { UserWithStories } from "@/components/pages/home/stories-header";
import { useMemo, useState } from "react";
import { useQueries, useQueryClient } from "@tanstack/react-query";
import { axiosGateway, OkResponse } from "@/lib/axios-config";
import { toast } from "sonner";
import { authClient } from "@/lib/auth/auth-client";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslations } from "next-intl";

interface HighlightStoryViewerProps {
  highlights: HighlightItem[];
  initialHighlightIndex: number;
  onClose: () => void;
}

export function HighlightStoryViewer({
  highlights,
  initialHighlightIndex,
  onClose,
}: HighlightStoryViewerProps) {
  const t = useTranslations("CreateHighlight");
  const queryClient = useQueryClient();
  const { data: session } = authClient.useSession();
  const [currentUserIndex, setCurrentUserIndex] = useState(
    initialHighlightIndex,
  );

  // Fetch details for all highlights so we can navigate between them
  const results = useQueries({
    queries: highlights.map((highlight) => ({
      queryKey: ["highlight", highlight.id],
      queryFn: async () => {
        const response = await axiosGateway.get<
          OkResponse<HighlightWithStories>
        >(`/api/posts/highlights/${highlight.id}`);
        return response.data.data;
      },
      staleTime: 1000 * 60 * 5, // 5 minutes
    })),
  });

  const isLoading = results.some((result) => result.isLoading);

  const mappedUsers: UserWithStories[] = useMemo(() => {
    return results
      .map((result) => result.data)
      .filter(
        (highlightDetail): highlightDetail is HighlightWithStories =>
          !!highlightDetail,
      )
      .map((highlightDetail) => ({
        id: highlightDetail.userId,
        name: highlightDetail.user.name || highlightDetail.user.username,
        username: highlightDetail.user.username,
        image: `/${highlightDetail.user.image}`,
        email: "",
        emailVerified: false,
        phoneNumber: null,
        password: null,
        bio: null,
        gender: null,
        isPrivate: false,
        isVerified: false,
        isBusiness: false,
        businessCategory: null,
        website: null,
        role: "user",
        banReason: null,
        banned: false,
        banExpires: null,
        followersCount: 0,
        followingCount: 0,
        postsCount: 0,
        createdAt: new Date(highlightDetail.createdAt),
        updatedAt: new Date(highlightDetail.createdAt),
        deactivatedAt: null,
        lastActiveAt: null,
        stories: highlightDetail.storyHighlightItems.map((item) => ({
          id: item.story.id,
          userId: highlightDetail.userId,
          mediaUrl: item.story.mediaUrl,
          mediaType: item.story.mediaType,
          thumbnailUrl: item.story.thumbnailUrl,
          moderationStatus: item.story.moderationStatus as any,
          moderationReason: null,
          altText: null,
          createdAt: new Date(item.story.createdAt),
          expiresAt: null,
          duration: 0,
          width: 0,
          height: 0,
          status: "published",
          transcoderJobName: null,
          viewsCount: 0,
          originalRawFileUrl: null,
        })),
      }));
  }, [results]);

  const handleDeleteStory = async (highlightId: string, storyId: string) => {
    try {
      const highlight = results.find((r) => r.data?.id === highlightId)?.data;
      if (!highlight) return;

      const remainingStories = highlight.storyHighlightItems
        .map((item) => item.story.id)
        .filter((id) => id !== storyId);

      if (remainingStories.length === 0) {
        // Delete highlight if no stories left
        await axiosGateway.delete(`/api/posts/highlights/${highlightId}`);
        toast.success(t("highlightDeleted"));
        onClose();
      } else {
        let coverStoryId = highlight.coverStoryId;
        // If the deleted story was the cover, pick a new one
        if (coverStoryId === storyId) {
          coverStoryId = remainingStories[0]!;
        }

        await axiosGateway.patch(`/api/posts/highlights/${highlightId}`, {
          storyIds: remainingStories,
          coverStoryId,
        });
        toast.success(t("removeStorySuccess"));
      }

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["highlight", highlightId] });
      queryClient.invalidateQueries({ queryKey: ["user-highlights"] });
    } catch (error) {
      console.error("Error deleting story from highlight:", error);
      toast.error(t("removeStoryError"));
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
        <div className="relative w-full max-w-[480px] h-full md:h-[90vh] md:max-h-[850px] aspect-9/16 bg-neutral-900 md:rounded-lg overflow-hidden">
          {/* Header Skeleton */}
          <div className="absolute top-8 left-4 right-4 flex items-center justify-between z-10">
            <div className="flex items-center gap-2">
              <Skeleton className="w-8 h-8 rounded-full bg-white/20" />
              <Skeleton className="h-4 w-24 bg-white/20" />
              <Skeleton className="h-3 w-12 bg-white/20" />
            </div>
          </div>

          {/* Main Content Area Skeleton */}
          <div className="w-full h-full flex items-center justify-center">
            <Skeleton className="w-full h-full opacity-50" />
          </div>
        </div>
      </div>
    );
  }

  if (mappedUsers.length === 0) return null;

  const currentHighlight = mappedUsers[currentUserIndex];
  const isOwner = session?.user?.id === currentHighlight?.id;

  return (
    <StoryViewer
      users={mappedUsers}
      initialUserIndex={initialHighlightIndex}
      onClose={onClose}
      onDeleteStory={isOwner ? handleDeleteStory : undefined}
      onUserIndexChange={setCurrentUserIndex}
    />
  );
}
