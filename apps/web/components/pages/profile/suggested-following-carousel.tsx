"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { axiosGateway, FindManyResponse } from "@/lib/axios-config";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { users } from "@repo/database";
import { useTranslations } from "next-intl";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import Link from "next/link";
import { toast } from "sonner";
import { cn, getMediaUrl } from "@/lib/utils";
import { X } from "lucide-react";

type SuggestedUser = typeof users.$inferSelect;

interface SuggestedFollowingCarouselProps {
  onClose: () => void;
}

export function SuggestedFollowingCarousel({
  onClose,
}: SuggestedFollowingCarouselProps) {
  const t = useTranslations("ProfilePage.suggestedFollowing");
  const queryClient = useQueryClient();

  const { data: suggestedUsers = [], isLoading } = useQuery({
    queryKey: ["suggested-following"],
    queryFn: async () => {
      const res = await axiosGateway.get<FindManyResponse<SuggestedUser>>(
        "/api/users/suggested-following",
        {
          params: { page: 1, limit: 10 },
        },
      );
      return res.data?.data || [];
    },
    staleTime: 1000 * 60 * 5,
  });

  const followMutation = useMutation({
    mutationFn: async (userId: string) => {
      await axiosGateway.post("/api/users/follow", { followingUserId: userId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suggested-following"] });
      toast.success(t("followed"));
    },
    onError: () => {
      toast.error(t("followError"));
    },
  });

  const skeletonCards = [...Array(4)].map((_, i) => (
    <CarouselItem key={i} className="basis-[160px] pl-3">
      <SuggestedUserCardSkeleton />
    </CarouselItem>
  ));

  return (
    <div className="w-full rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <span className="text-sm font-semibold text-foreground">
          {t("title")}
        </span>
        <div className="flex items-center gap-3">
          {/* "See all" — opens the full list dialog */}
          <SuggestedUsersDialog
            users={suggestedUsers}
            isLoading={isLoading}
            followMutation={followMutation}
            t={t}
          />
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Close suggestions"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>

      {/* Carousel */}
      <div className="px-4 pb-4">
        <Carousel opts={{ align: "start", dragFree: true }} className="w-full">
          <CarouselContent className="-ml-3">
            {isLoading
              ? skeletonCards
              : suggestedUsers.map((user) => (
                  <CarouselItem key={user.id} className="basis-[160px] pl-3">
                    <SuggestedUserCard
                      user={user}
                      onFollow={() => followMutation.mutate(user.id)}
                      isFollowPending={followMutation.isPending}
                      t={t}
                    />
                  </CarouselItem>
                ))}
          </CarouselContent>
          <CarouselNext className="-right-3 size-7 bg-card border-border shadow-sm" />
          <CarouselPrevious className="-left-3 size-7 bg-card border-border shadow-sm" />
        </Carousel>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// "See all" Dialog
// ---------------------------------------------------------------------------

type FollowMutation = ReturnType<
  typeof useMutation<void, Error, string, unknown>
>;
type TFunction = ReturnType<
  typeof useTranslations<"ProfilePage.suggestedFollowing">
>;

interface SuggestedUsersDialogProps {
  users: SuggestedUser[];
  isLoading: boolean;
  followMutation: FollowMutation;
  t: TFunction;
}

function SuggestedUsersDialog({
  users,
  isLoading,
  followMutation,
  t,
}: SuggestedUsersDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors">
          {t("seeAll")}
        </button>
      </DialogTrigger>

      <DialogContent
        className="p-0 gap-0 max-w-sm w-full rounded-2xl overflow-hidden"
        showCloseButton={false}
      >
        {/* Dialog header — × left, title centered */}
        <DialogHeader className="relative flex flex-row items-center justify-center border-b border-border px-4 py-3">
          <DialogClose className="absolute left-4 text-foreground hover:text-foreground/70 transition-colors">
            <X className="size-5" />
            <span className="sr-only">Close</span>
          </DialogClose>
          <DialogTitle className="text-sm font-semibold text-center">
            {t("title")}
          </DialogTitle>
        </DialogHeader>

        {/* Scrollable user list */}
        <div className="overflow-y-auto max-h-[60dvh]">
          {isLoading ? (
            <div className="flex flex-col divide-y divide-border">
              {[...Array(6)].map((_, i) => (
                <SuggestedUserRowSkeleton key={i} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-border">
              {users.map((user) => (
                <SuggestedUserRow
                  key={user.id}
                  user={user}
                  onFollow={() => followMutation.mutate(user.id)}
                  isFollowPending={followMutation.isPending}
                  t={t}
                />
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Dialog row — horizontal layout matching the screenshot
// ---------------------------------------------------------------------------

interface SuggestedUserRowProps {
  user: SuggestedUser;
  onFollow: () => void;
  isFollowPending: boolean;
  t: TFunction;
}

function SuggestedUserRow({
  user,
  onFollow,
  isFollowPending,
  t,
}: SuggestedUserRowProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-accent/40 transition-colors">
      <Link href={`/${user.username}`} className="shrink-0">
        <Avatar className="size-11">
          <AvatarImage
            src={`/${user.image}` || "/default-avatar.png"}
            alt={user.name ?? user.username}
          />
          <AvatarFallback className="bg-muted text-sm font-semibold">
            {(user.name ?? user.username)?.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </Link>

      <div className="flex flex-col min-w-0 flex-1">
        <Link
          href={`/${user.username}`}
          className="text-sm font-semibold text-foreground truncate hover:underline"
        >
          {user.username}
        </Link>
        {user.name && (
          <span className="text-xs text-muted-foreground truncate">
            {user.name}
          </span>
        )}
      </div>

      <Button
        size="sm"
        className="shrink-0 h-8 px-4 text-xs font-bold bg-[#0095F6] hover:bg-[#1877F2] text-white border-none"
        onClick={onFollow}
        disabled={isFollowPending}
      >
        {t("follow")}
      </Button>
    </div>
  );
}

function SuggestedUserRowSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Skeleton className="size-11 rounded-full shrink-0" />
      <div className="flex flex-col gap-1.5 flex-1 min-w-0">
        <Skeleton className="h-3.5 w-28" />
        <Skeleton className="h-3 w-20" />
      </div>
      <Skeleton className="h-8 w-20 rounded-md shrink-0" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Carousel card (unchanged)
// ---------------------------------------------------------------------------

interface SuggestedUserCardProps {
  user: SuggestedUser;
  onFollow: () => void;
  isFollowPending: boolean;
  t: TFunction;
}

function SuggestedUserCard({
  user,
  onFollow,
  isFollowPending,
  t,
}: SuggestedUserCardProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-background p-4 h-full">
      <Link href={`/${user.username}`} className="shrink-0">
        <Avatar className="size-16 ring-2 ring-primary/20 ring-offset-2 ring-offset-background">
          <AvatarImage
            src={`/${user.image}` || "/default-avatar.png"}
            alt={user.name ?? user.username}
          />
          <AvatarFallback className="text-lg bg-muted font-semibold">
            {(user.name ?? user.username)?.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </Link>

      <div className="flex flex-col items-center gap-0.5 min-w-0 w-full text-center">
        <Link
          href={`/${user.username}`}
          className="text-sm font-semibold text-foreground truncate max-w-full hover:underline"
        >
          {user.username}
        </Link>
        {user.name && (
          <span className="text-xs text-muted-foreground truncate max-w-full">
            {user.name}
          </span>
        )}
      </div>

      <Button
        size="sm"
        className="w-full h-8 text-xs font-bold bg-[#0095F6] hover:bg-[#1877F2] text-white border-none"
        onClick={onFollow}
        disabled={isFollowPending}
      >
        {t("follow")}
      </Button>
    </div>
  );
}

function SuggestedUserCardSkeleton() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-background p-4">
      <Skeleton className="size-16 rounded-full" />
      <div className="flex flex-col items-center gap-1.5 w-full">
        <Skeleton className="h-3.5 w-20" />
        <Skeleton className="h-3 w-14" />
      </div>
      <Skeleton className="h-8 w-full rounded-md" />
    </div>
  );
}
