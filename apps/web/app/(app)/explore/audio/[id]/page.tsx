"use client";

import { useParams } from "next/navigation";
import { useAudioPosts } from "@/hooks/use-audio-posts";
import { useAudio } from "@/hooks/use-audio";
import { ExploreGrid } from "@/components/pages/explore/explore-grid";
import { AudioHeader } from "@/components/pages/explore/audio-header";
import { Skeleton } from "@/components/ui/skeleton";

export default function AudioExplorePage() {
  const params = useParams();
  const audioId = params.id as string;

  const {
    data: audio,
    isLoading: isLoadingAudio,
    error: audioError,
  } = useAudio(audioId);
  const {
    data: postsData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isLoadingPosts,
    error: postsError,
  } = useAudioPosts(audioId);

  if (audioError || postsError) {
    throw audioError || postsError;
  }

  if (isLoadingAudio) {
    return (
      <div className="flex flex-col w-full max-w-[935px] mx-auto pt-0 md:pt-8 pb-20 md:pb-0 px-4 md:px-0">
        <div className="flex flex-col md:flex-row gap-6 md:gap-10 items-center md:items-start py-8">
          <Skeleton className="w-32 h-32 md:w-44 md:h-44 rounded-lg" />
          <div className="flex flex-col flex-1 items-center md:items-start space-y-4">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-10 w-full md:w-40 mt-4" />
          </div>
        </div>
        <div className="mt-8 border-t border-border pt-8">
          <div className="grid grid-cols-3 gap-1 md:gap-4">
            {[...Array(9)].map((_, i) => (
              <Skeleton key={i} className="aspect-3/4 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!audio) return null;

  return (
    <div className="flex flex-col w-full max-w-[935px] mx-auto pt-0 md:pt-8 pb-20 md:pb-0 px-4 md:px-0">
      <AudioHeader audio={audio} />
      <div className="w-full">
        <ExploreGrid
          data={postsData}
          fetchNextPage={fetchNextPage}
          hasNextPage={hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          isLoading={isLoadingPosts}
        />
      </div>
    </div>
  );
}
