"use client";

import { useUserLikes } from "@/hooks/use-user-likes";
import { getMediaUrl } from "@/lib/utils";
import NextImage from "next/image";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslations } from "next-intl";
import { Heart } from "lucide-react";
import { useInView } from "react-intersection-observer";
import { useEffect } from "react";

export function ActivityLikes() {
  const t = useTranslations("ActivityPage.likes");
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useUserLikes();
  const { ref, inView } = useInView();

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const allPosts = data?.pages.flatMap((page) => page.data) || [];

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-1">
        {[...Array(12)].map((_, i) => (
          <Skeleton key={i} className="aspect-3/4 rounded-none" />
        ))}
      </div>
    );
  }

  if (allPosts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <div className="w-16 h-16 rounded-full border-2 border-muted-foreground/20 flex items-center justify-center mb-4">
          <Heart className="w-8 h-8 opacity-20" />
        </div>
        <p className="text-sm font-medium">{t("empty")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-1">
        {allPosts.map((post) => (
          <Link
            key={post.id}
            href={`/p/${post.id}`}
            scroll={false}
            className="relative aspect-3/4 bg-muted group cursor-pointer overflow-hidden"
          >
            <NextImage
              src={getMediaUrl(
                post.postMedia[0]?.thumbnailUrl || post.postMedia[0]?.mediaUrl,
                "post",
                post.postMedia[0]?.mediaType,
              )}
              alt="Liked post"
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 768px) 33vw, 300px"
            />
          </Link>
        ))}
      </div>

      {hasNextPage && (
        <div ref={ref} className="py-4 flex justify-center">
          {isFetchingNextPage && <Skeleton className="w-8 h-8 rounded-full" />}
        </div>
      )}
    </div>
  );
}
