"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function ProfileSkeleton() {
  return (
    <div className="flex flex-col w-full max-w-4xl mx-auto">
      {/* Header Skeleton */}
      <div className="flex flex-col md:flex-row items-center md:items-start gap-8 md:gap-16 px-4 py-8">
        <Skeleton className="w-20 h-20 md:w-36 md:h-36 rounded-full" />

        <div className="flex-1 flex flex-col gap-4 md:gap-6 w-full">
          <div className="flex flex-col md:flex-row items-center gap-4">
            <Skeleton className="h-8 w-40" />
            <div className="flex gap-2 w-full md:w-auto">
              <Skeleton className="h-9 flex-1 md:w-24 rounded-md" />
              <Skeleton className="h-9 flex-1 md:w-24 rounded-md" />
            </div>
          </div>

          <div className="hidden md:flex gap-10">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-20" />
          </div>

          <div className="flex flex-col gap-2 items-center md:items-start">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-full max-w-[300px]" />
            <Skeleton className="h-3 w-full max-w-[250px]" />
          </div>
        </div>
      </div>

      {/* Grid Skeleton */}
      <PostGridSkeleton />
    </div>
  );
}

export function PostGridSkeleton() {
  return (
    <div className="border-t border-border/50">
      <div className="grid grid-cols-3 gap-0.5 md:gap-1">
        {[...Array(9)].map((_, i) => (
          <Skeleton key={i} className="aspect-3/4 w-full rounded-none" />
        ))}
      </div>
    </div>
  );
}
