"use client";

import { useEffect } from "react";
import { useInView } from "react-intersection-observer";
import { useInfiniteFeed } from "@/hooks/use-feed";
import { PostCard } from "./post-card";
import { PostSkeleton } from "./post-skeleton";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";

export function Feed() {
  const t = useTranslations("HomePage.feed");
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status,
    error,
  } = useInfiniteFeed();
  const { ref, inView } = useInView({
    threshold: 0.1,
  });

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (status === "pending") {
    return (
      <div className="flex flex-col w-full max-w-lg mx-auto pb-20">
        {[...Array(3)].map((_, i) => (
          <PostSkeleton key={i} />
        ))}
      </div>
    );
  }

  const posts = data?.pages.flatMap((page) => page.data) || [];

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center bg-background animate-in fade-in duration-500">
        <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mb-4">
          <Loader2 className="h-8 w-8 text-muted-foreground/50" />
        </div>
        <p className="text-muted-foreground font-medium">{t("noPosts")}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full max-w-lg mx-auto pb-20">
      <div className="flex flex-col">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>

      {/* Intersection Observer Target */}
      <div
        ref={ref}
        className="h-10 flex items-center justify-center w-full mt-4"
      >
        {isFetchingNextPage ? (
          <div className="flex items-center justify-center w-full">
            <Loader2 className="h-6! w-6! animate-spin text-muted-foreground" />
          </div>
        ) : hasNextPage ? (
          <div className="h-1" /> // Invisible trigger
        ) : (
          <p className="text-muted-foreground text-sm py-4">
            {t("noMorePosts")}
          </p>
        )}
      </div>
    </div>
  );
}
