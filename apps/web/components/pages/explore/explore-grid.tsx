"use client";

import { Loader2, Clapperboard, Copy, Grid3X3, Eye } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import { getMediaUrl } from "@/lib/utils";
import { useInView } from "react-intersection-observer";
import { useEffect } from "react";
import { PostGridSkeleton } from "../profile/profile-skeleton";
import { SensitiveContentOverlay } from "@/components/common/sensitive-content-overlay";

interface ExploreGridProps {
  data: any;
  fetchNextPage: () => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  isLoading: boolean;
}

export function ExploreGrid({
  data,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
  isLoading,
}: ExploreGridProps) {
  const t = useTranslations("ExplorePage");
  const format = useFormatter();
  const { ref, inView } = useInView();

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-0.5 md:gap-1">
        {[...Array(12)].map((_, i) => (
          <div key={i} className="aspect-3/4 w-full bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  const posts = data?.pages.flatMap((page: any) => page.data) || [];

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-20 gap-4 text-center relative overflow-hidden rounded-xl">
        <div className="absolute inset-0 bg-grid-fade dark:bg-grid-dark opacity-5" />
        <div className="relative z-10 flex flex-col items-center gap-4">
          <div className="p-4 border border-foreground/20 rounded-full">
            <Grid3X3 className="w-10 h-10" />
          </div>
          <h3 className="text-2xl font-bold">{t("noPosts")}</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="grid grid-cols-3 gap-0.5 md:gap-1">
        {posts.map((post: any) => (
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
            {post.postMedia.some(
              (m: any) => m.moderationStatus === "flagged",
            ) && <SensitiveContentOverlay size="sm" />}
            <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-6 text-white font-semibold">
              {/* Add likes/comments count here if available */}
            </div>
            <div className="absolute top-2 right-2 text-white drop-shadow-md z-10 pointer-events-none">
              {post.isReel ? (
                <Clapperboard className="w-5 h-5" />
              ) : post.postMedia.length > 1 ? (
                <Copy className="w-4 h-4 fill-white/20" />
              ) : null}
            </div>
            {post.isReel && (
              <div className="absolute bottom-2 left-2 flex items-center gap-1 text-white text-xs font-bold drop-shadow-md z-10 pointer-events-none">
                <Eye className="w-4 h-4" />
                <span>
                  {format.number(post.viewsCount || 0, { notation: "compact" })}
                </span>
              </div>
            )}
          </Link>
        ))}
      </div>

      {/* Infinite Scroll Trigger */}
      <div ref={ref} className="h-20 flex justify-center items-center">
        {isFetchingNextPage && (
          <Loader2 className="w-6! h-6! animate-spin text-muted-foreground" />
        )}
      </div>
    </div>
  );
}
