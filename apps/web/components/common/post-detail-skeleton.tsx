import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function PostDetailSkeleton({ isModal = false }: { isModal?: boolean }) {
  return (
    <div
      className={cn(
        "flex flex-col md:flex-row w-full bg-background overflow-hidden",
        isModal
          ? "h-full md:h-[90vh] max-h-[900px]"
          : "min-h-[600px] border rounded-xl",
      )}
    >
      {/* Left Side: Media */}
      <div
        className={cn(
          "relative bg-muted flex items-center justify-center overflow-hidden",
          isModal
            ? "w-full md:w-[60%] h-auto aspect-3/4 md:h-full"
            : "w-full md:w-[60%] aspect-3/4",
        )}
      >
        <Skeleton className="w-full h-full rounded-none" />
      </div>

      {/* Right Side: Info & Comments */}
      <div className="flex flex-col w-full md:w-[40%] border-l border-border">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center space-x-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="space-y-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>

        {/* Comments Area */}
        <div className="flex-1 p-4 space-y-6">
          {/* Caption */}
          <div className="flex gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="flex flex-col gap-2 flex-1">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>

          {/* Dummy Comments */}
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex flex-col gap-2 flex-1">
                <Skeleton className="h-4 w-full" />
                <div className="flex gap-3">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-3 w-12" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-border space-y-3">
          <div className="flex justify-between items-center h-8">
            <div className="flex space-x-4">
              <Skeleton className="h-6 w-6 rounded-full" />
              <Skeleton className="h-6 w-6 rounded-full" />
              <Skeleton className="h-6 w-6 rounded-full" />
            </div>
            <Skeleton className="h-6 w-6 rounded-full" />
          </div>
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>

        {/* Add Comment */}
        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3">
            <Skeleton className="h-6 w-6 rounded-full" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-8" />
          </div>
        </div>
      </div>
    </div>
  );
}
