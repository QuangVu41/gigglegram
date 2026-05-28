"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function ReelSkeleton() {
  return (
    <div className="relative w-full h-full flex items-center justify-center bg-transparent">
      <div className="relative flex flex-col md:flex-row items-center justify-center h-full w-full max-w-5xl mx-auto px-4 md:gap-6">
        {/* Video Card Skeleton */}
        <div className="relative aspect-3/4 h-full md:max-h-[90vh] w-auto bg-zinc-900 rounded-lg md:rounded-xl overflow-hidden shadow-2xl border border-white/5">
          {/* Mobile Overlay Skeletons */}
          <div className="absolute inset-0 flex flex-col justify-end p-4 pb-6 z-20 md:hidden">
            <div className="flex flex-col space-y-3 w-[80%]">
              <div className="flex items-center space-x-2">
                <Skeleton className="h-8 w-8 rounded-full bg-white/10" />
                <Skeleton className="h-3 w-20 bg-white/10" />
              </div>
              <Skeleton className="h-3 w-full bg-white/10" />
              <Skeleton className="h-3 w-2/3 bg-white/10" />
            </div>
            {/* Mobile Actions */}
            <div className="absolute right-2 bottom-6 flex flex-col items-center space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton
                  key={i}
                  className="h-10 w-10 rounded-full bg-white/10"
                />
              ))}
            </div>
          </div>
        </div>

        {/* Desktop Sidebar Skeleton */}
        <div className="hidden md:flex flex-col justify-end items-center space-y-6 pb-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex flex-col items-center">
              <Skeleton className="h-12 w-12 rounded-full bg-zinc-800" />
              <Skeleton className="h-2 w-6 mt-1 bg-zinc-800" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
