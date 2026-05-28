import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";

export function PostSkeleton() {
  return (
    <Card className="w-full border-none shadow-none rounded-none sm:rounded-xl mb-4 py-2 bg-transparent gap-2">
      <CardHeader className="flex flex-row items-center space-x-3 p-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Skeleton className="aspect-3/4 w-full rounded-none sm:rounded-xl" />
      </CardContent>
      <CardFooter className="flex flex-col items-start p-3 space-y-2">
        <div className="flex w-full justify-between items-center h-10">
          <div className="flex space-x-4">
            <Skeleton className="h-6 w-6 rounded-full" />
            <Skeleton className="h-6 w-6 rounded-full" />
            <Skeleton className="h-6 w-6 rounded-full" />
          </div>
          <Skeleton className="h-6 w-6 rounded-full" />
        </div>
        <Skeleton className="h-4 w-24" />
        <div className="space-y-1 w-full">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
        <Skeleton className="h-3 w-32" />
      </CardFooter>
    </Card>
  );
}
