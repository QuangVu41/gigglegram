"use client";

import { useUserComments } from "@/hooks/use-user-comments";
import { getMediaUrl } from "@/lib/utils";
import NextImage from "next/image";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslations, useLocale } from "next-intl";
import { MessageSquare } from "lucide-react";
import { useInView } from "react-intersection-observer";
import { useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import { vi, enUS } from "date-fns/locale";

export function ActivityComments() {
  const t = useTranslations("ActivityPage.comments");
  const locale = useLocale();
  const dateLocale = locale === "vi" ? vi : enUS;
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useUserComments();
  const { ref, inView } = useInView();

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const allComments = data?.pages.flatMap((page) => page.data) || [];

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="flex gap-4 p-4 rounded-lg border border-border"
          >
            <Skeleton className="w-12 h-12 rounded-md shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (allComments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <div className="w-16 h-16 rounded-full border-2 border-muted-foreground/20 flex items-center justify-center mb-4">
          <MessageSquare className="w-8 h-8 opacity-20" />
        </div>
        <p className="text-sm font-medium">{t("empty")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {allComments.map((comment) => (
        <Link
          key={comment.id}
          href={`/p/${comment.postId}`}
          scroll={false}
          className="flex gap-4 p-4 rounded-xl border border-border hover:bg-muted/50 transition-colors group"
        >
          <div className="relative w-16 h-16 rounded-lg overflow-hidden shrink-0 bg-muted">
            {comment.post.postMedia?.[0] && (
              <NextImage
                src={getMediaUrl(
                  comment.post.postMedia[0].thumbnailUrl ||
                    comment.post.postMedia[0].mediaUrl,
                  "post",
                  comment.post.postMedia[0].mediaType,
                )}
                alt="Post thumbnail"
                fill
                className="object-cover"
                sizes="64px"
              />
            )}
          </div>

          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-semibold truncate">
                {comment.post.user.username}
              </span>
              <span className="text-[11px] text-muted-foreground shrink-0">
                •{" "}
                {formatDistanceToNow(new Date(comment.createdAt), {
                  addSuffix: true,
                  locale: dateLocale,
                })}
              </span>
            </div>
            <p className="text-sm text-foreground line-clamp-2 break-all">
              {comment.content}
            </p>
          </div>
        </Link>
      ))}

      {hasNextPage && (
        <div ref={ref} className="py-4 flex justify-center">
          {isFetchingNextPage && <Skeleton className="w-8 h-8 rounded-full" />}
        </div>
      )}
    </div>
  );
}
