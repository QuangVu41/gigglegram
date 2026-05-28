"use client";

import { useParams } from "next/navigation";
import { useLocationPosts } from "@/hooks/use-location-posts";
import { useLocation } from "@/hooks/use-location";
import { ExploreGrid } from "@/components/pages/explore/explore-grid";
import { LocationHeader } from "@/components/pages/explore/location-header";
import { Skeleton } from "@/components/ui/skeleton";

export default function LocationExplorePage() {
  const params = useParams();
  const locationId = params.id as string;

  const {
    data: location,
    isLoading: isLoadingLocation,
    error: locationError,
  } = useLocation(locationId);
  const {
    data: postsData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isLoadingPosts,
    error: postsError,
  } = useLocationPosts(locationId);

  if (locationError || postsError) {
    throw locationError || postsError;
  }

  if (isLoadingLocation) {
    return (
      <div className="flex flex-col w-full max-w-[935px] mx-auto pt-0 md:pt-8 pb-20 md:pb-0 px-4 md:px-0">
        <div className="w-full h-[250px] md:h-[350px]">
          <Skeleton className="w-full h-full" />
        </div>
        <div className="flex items-center gap-4 py-6">
          <Skeleton className="h-20 w-20 md:h-24 md:w-24 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
      </div>
    );
  }

  if (!location) return null;

  return (
    <div className="flex flex-col w-full max-w-[935px] mx-auto pt-0 md:pt-8 pb-20 md:pb-0 px-4 md:px-0">
      <LocationHeader location={location} />
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
