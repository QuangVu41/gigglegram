"use client";

import { useInfiniteReels } from "@/hooks/use-reels";
import { ReelsContainer } from "@/components/pages/reels/reels-container";
import { ReelSkeleton } from "@/components/pages/reels/reel-skeleton";

export default function ReelsClientPage() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
  } = useInfiniteReels();

  if (error) {
    throw error;
  }

  if (isLoading) {
    return <ReelSkeleton />;
  }

  return (
    <div className="flex flex-col w-full h-[calc(100dvh-8rem)] md:h-dvh overflow-hidden">
      <ReelsContainer
        data={data}
        fetchNextPage={fetchNextPage}
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
      />
    </div>
  );
}
