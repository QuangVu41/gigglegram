"use client";

import { useExploreFeed } from "@/hooks/use-explore-feed";
import { ExploreGrid } from "@/components/pages/explore/explore-grid";

export default function ExploreClientPage() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
  } = useExploreFeed();

  if (error) {
    throw error;
  }

  return (
    <div className="flex flex-col w-full max-w-[935px] mx-auto pt-0 md:pt-8 pb-20 md:pb-0">
      <div className="w-full">
        <ExploreGrid
          data={data}
          fetchNextPage={fetchNextPage}
          hasNextPage={hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
