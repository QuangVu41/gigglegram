"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { axiosGateway, FindManyResponse } from "@/lib/axios-config";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { hashtags, users } from "@repo/database";
import { useTranslations } from "next-intl";
import { Hash, UserPlus } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

type Hashtag = typeof hashtags.$inferSelect;
type SuggestedUser = typeof users.$inferSelect;

export function FeedSidebar() {
  const t = useTranslations("HomePage.sidebar");

  return (
    <aside className="hidden lg:flex flex-col w-[320px] shrink-0 sticky top-4 self-start gap-6">
      <TopHashtags />
      <Separator />
      <SuggestedUsers />
    </aside>
  );
}

function TopHashtags() {
  const t = useTranslations("HomePage.sidebar");

  const { data: hashtagsList = [], isLoading } = useQuery({
    queryKey: ["top-hashtags"],
    queryFn: async () => {
      const res = await axiosGateway.get<FindManyResponse<Hashtag>>(
        "/api/posts/hashtags",
        {
          params: {
            page: 1,
            limit: 5,
            sort: "postsCount,desc",
          },
        },
      );
      return res.data?.data || [];
    },
    staleTime: 1000 * 60 * 5,
  });

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {t("topHashtags")}
      </h3>
      <div className="flex flex-col gap-1">
        {isLoading
          ? [...Array(5)].map((_, i) => <HashtagSkeleton key={i} />)
          : hashtagsList.map((hashtag) => (
              <Link
                key={hashtag.id}
                href={`/explore/tags/${hashtag.name}`}
                className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-accent group"
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                  <Hash className="size-4" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-medium truncate text-foreground">
                    #{hashtag.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {t("postsCount", { count: hashtag.postsCount })}
                  </span>
                </div>
              </Link>
            ))}
      </div>
    </div>
  );
}

function SuggestedUsers() {
  const t = useTranslations("HomePage.sidebar");
  const queryClient = useQueryClient();

  const { data: suggestedUsers = [], isLoading } = useQuery({
    queryKey: ["suggested-following"],
    queryFn: async () => {
      const res = await axiosGateway.get<FindManyResponse<SuggestedUser>>(
        "/api/users/suggested-following",
        {
          params: {
            page: 1,
            limit: 5,
          },
        },
      );
      return res.data?.data || [];
    },
    staleTime: 1000 * 60 * 5,
  });

  const followMutation = useMutation({
    mutationFn: async (userId: string) => {
      await axiosGateway.post("/api/users/follow", {
        followingUserId: userId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suggested-following"] });
      toast.success(t("followed"));
    },
    onError: () => {
      toast.error(t("followError"));
    },
  });

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {t("suggestions")}
      </h3>
      <div className="flex flex-col gap-1">
        {isLoading
          ? [...Array(3)].map((_, i) => <UserSkeleton key={i} />)
          : suggestedUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-accent"
              >
                <Link
                  href={`/${user.username}`}
                  className="flex items-center gap-3 min-w-0 flex-1"
                >
                  <Avatar className="size-10 shrink-0">
                    <AvatarImage
                      src={`/${user.image}` || "/default-avatar.png"}
                      alt={user.name}
                    />
                    <AvatarFallback>
                      {user.name?.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-medium truncate text-foreground">
                      {user.name}
                    </span>
                    <span className="text-xs text-muted-foreground truncate">
                      @{user.username}
                    </span>
                  </div>
                </Link>
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  onClick={() => followMutation.mutate(user.id)}
                  disabled={followMutation.isPending}
                >
                  <UserPlus className="size-3.5" />
                  {t("follow")}
                </Button>
              </div>
            ))}
      </div>
    </div>
  );
}

function HashtagSkeleton() {
  return (
    <div className="flex items-center gap-3 px-2 py-2">
      <Skeleton className="size-10 rounded-full" />
      <div className="flex flex-col gap-1.5 flex-1">
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  );
}

function UserSkeleton() {
  return (
    <div className="flex items-center gap-3 px-2 py-2">
      <Skeleton className="size-10 rounded-full" />
      <div className="flex flex-col gap-1.5 flex-1">
        <Skeleton className="h-3.5 w-28" />
        <Skeleton className="h-3 w-20" />
      </div>
      <Skeleton className="h-8 w-20 rounded-md" />
    </div>
  );
}
