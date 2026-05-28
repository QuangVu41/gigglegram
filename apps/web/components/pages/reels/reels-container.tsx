"use client";

import { useEffect, useCallback, useState } from "react";
import { InfiniteData } from "@tanstack/react-query";
import { FindManyResponse } from "@/lib/axios-config";
import { PostWithRelations } from "@/hooks/use-feed";
import { ReelPlayer } from "@/components/pages/reels/reel-player";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
  type CarouselApi,
} from "@/components/ui/carousel";
import { ReelSkeleton } from "@/components/pages/reels/reel-skeleton";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";

interface ReelsContainerProps {
  data: InfiniteData<FindManyResponse<PostWithRelations>> | undefined;
  fetchNextPage: () => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
}

export function ReelsContainer({
  data,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
}: ReelsContainerProps) {
  const t = useTranslations("ReelsPage");
  const [api, setApi] = useState<CarouselApi>();
  const [activeIndex, setActiveIndex] = useState(0);

  const posts = data?.pages.flatMap((page) => page.data) || [];

  const onSelect = useCallback(() => {
    if (!api) return;
    const selected = api.selectedScrollSnap();
    setActiveIndex(selected);

    // Fetch next page when nearing the end
    if (selected >= posts.length - 2 && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [api, posts.length, hasNextPage, isFetchingNextPage, fetchNextPage]);

  useEffect(() => {
    if (!api) return;
    api.on("select", onSelect);
    return () => {
      api.off("select", onSelect);
    };
  }, [api, onSelect]);

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full text-muted-foreground bg-black">
        <p>{t("noReels")}</p>
      </div>
    );
  }

  return (
    <Carousel
      orientation="vertical"
      opts={{
        align: "start",
        loop: false,
        dragFree: false,
      }}
      setApi={setApi}
      className="w-full h-full"
    >
      <CarouselContent
        className="mt-0 h-full md:gap-0"
        viewportClassName="h-full"
      >
        {posts.map((post, index) => (
          <CarouselItem key={post.id} className="pt-0 h-full">
            <ReelPlayer post={post} isActive={index === activeIndex} />
          </CarouselItem>
        ))}
        {isFetchingNextPage && (
          <CarouselItem className="pt-0 h-full flex items-center justify-center bg-black">
            <Loader2 className="w-8! h-8! animate-spin text-foreground" />
          </CarouselItem>
        )}
      </CarouselContent>
      <div className="hidden md:flex flex-col gap-2 absolute right-4 lg:right-8 top-1/2 -translate-y-1/2 z-50">
        <CarouselPrevious className="static translate-y-0 translate-x-0 rotate-90 bg-zinc-800/40 hover:bg-zinc-800/60 border-none text-white size-10" />
        <CarouselNext className="static translate-y-0 translate-x-0 rotate-90 bg-zinc-800/40 hover:bg-zinc-800/60 border-none text-white size-10" />
      </div>
    </Carousel>
  );
}
