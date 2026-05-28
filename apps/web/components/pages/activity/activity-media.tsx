"use client";

import { useUserPosts } from "@/hooks/use-user-posts";
import { useUserHighlights } from "@/hooks/use-user-highlights";
import { useTranslations } from "next-intl";
import { PostGridSkeleton } from "../profile/profile-skeleton";
import Link from "next/link";
import Image from "next/image";
import { getMediaUrl } from "@/lib/utils";
import { Clapperboard, Copy, History, Grid3X3, Film } from "lucide-react";
import { useInView } from "react-intersection-observer";
import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth/auth-client";
import { HighlightStoryViewer } from "../profile/highlight-story-viewer";

interface ActivityMediaProps {
  type: "post" | "reel" | "highlight";
}

export function ActivityMedia({ type }: ActivityMediaProps) {
  const t = useTranslations("ActivityPage");
  const session = authClient.useSession();
  const userId = session.data?.user?.id;

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useUserPosts(userId!, {
      enabled: !!userId && (type === "post" || type === "reel"),
    });

  const { data: highlights = [], isLoading: isLoadingHighlights } =
    useUserHighlights(userId!, {
      enabled: !!userId && type === "highlight",
    });

  const [viewingHighlightIndex, setViewingHighlightIndex] = useState<
    number | null
  >(null);

  const { ref, inView } = useInView();

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (
    (isLoading && (type === "post" || type === "reel")) ||
    (type === "highlight" && isLoadingHighlights)
  ) {
    return <PostGridSkeleton />;
  }

  const allPosts = data?.pages.flatMap((page) => page.data) || [];
  const posts = type === "reel" ? allPosts.filter((p) => p.isReel) : allPosts;

  if (type === "highlight") {
    if (highlights.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-center opacity-50">
          <History className="w-12 h-12 mb-4" />
          <p>{t("photosAndVideos.empty")}</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-3 gap-1">
        {highlights.map((highlight, index) => (
          <div
            key={highlight.id}
            className="relative aspect-3/4 group overflow-hidden bg-muted cursor-pointer"
            onClick={() => setViewingHighlightIndex(index)}
          >
            <Image
              src={getMediaUrl(
                highlight.story?.thumbnailUrl,
                "story",
                highlight.story?.mediaType,
              )}
              alt={highlight.title}
              fill
              className="object-cover transition-transform group-hover:scale-105"
              sizes="(max-width: 768px) 33vw, 33vw"
            />
            <div className="absolute inset-x-0 bottom-0 p-2 bg-linear-to-t from-black/60 to-transparent text-white">
              <p className="text-xs font-semibold truncate">
                {highlight.title}
              </p>
            </div>
          </div>
        ))}

        {viewingHighlightIndex !== null && (
          <HighlightStoryViewer
            highlights={highlights}
            initialHighlightIndex={viewingHighlightIndex}
            onClose={() => setViewingHighlightIndex(null)}
          />
        )}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center opacity-50">
        {type === "reel" ? (
          <Film className="w-12 h-12 mb-4" />
        ) : (
          <Grid3X3 className="w-12 h-12 mb-4" />
        )}
        <p>{t("photosAndVideos.empty")}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-1">
        {posts.map((post) => (
          <Link
            key={post.id}
            href={`/p/${post.id}`}
            scroll={false}
            className="relative aspect-3/4 group overflow-hidden bg-muted"
          >
            <Image
              src={getMediaUrl(
                post.postMedia[0]?.mediaType?.startsWith("video/")
                  ? post.postMedia[0]?.thumbnailUrl
                  : post.postMedia[0]?.mediaUrl,
                "post",
                post.postMedia[0]?.mediaType,
              )}
              alt={post.caption || ""}
              fill
              className="object-cover transition-transform group-hover:scale-105"
              sizes="(max-width: 768px) 33vw, 33vw"
            />
            <div className="absolute top-2 right-2 text-white drop-shadow-md z-10 pointer-events-none">
              {post.isReel ? (
                <Clapperboard className="w-5 h-5" />
              ) : post.postMedia.length > 1 ? (
                <Copy className="w-4 h-4 fill-white/20" />
              ) : null}
            </div>
          </Link>
        ))}
      </div>
      {hasNextPage && (
        <div ref={ref} className="h-10 flex items-center justify-center">
          {isFetchingNextPage && (
            <History className="w-6 h-6 animate-spin opacity-20" />
          )}
        </div>
      )}
    </div>
  );
}
