"use client";

import { useParams } from "next/navigation";
import { useHashtagPosts } from "@/hooks/use-hashtag-posts";
import { ExploreGrid } from "@/components/pages/explore/explore-grid";
import { HashtagHeader } from "@/components/pages/explore/hashtag-header";

export default function HashtagExplorePage() {
  const params = useParams();
  const tagname = params.tagname as string;
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
  } = useHashtagPosts(tagname);

  if (error) {
    throw error;
  }

  return (
    <div className="flex flex-col w-full max-w-[935px] mx-auto pt-0 md:pt-8 pb-20 md:pb-0">
      <HashtagHeader hashtag={tagname} />
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
