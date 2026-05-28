"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { axiosGateway, FindManyResponse } from "@/lib/axios-config";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus } from "lucide-react";
import { users, stories } from "@repo/database";
import { authClient } from "@/lib/auth/auth-client";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import CreateStoryProvider from "@/components/pages/home/create-story-provider";
import { CreateStoryStepper } from "@/components/pages/home/create-story-stepper";
import { StoryViewer } from "@/components/pages/home/story-viewer";
import { useTranslations } from "next-intl";

export type UserWithStories = typeof users.$inferSelect & {
  stories: (typeof stories.$inferSelect)[];
};

export function StoriesHeader() {
  const t = useTranslations("NavMain");
  const [viewerOpen, setViewerOpen] = useState(false);
  const [initialViewerIndex, setInitialViewerIndex] = useState(0);
  const { data: session } = authClient.useSession();
  const currentUser = session?.user;

  const { data: activeStoryUsers = [], isLoading } = useQuery({
    queryKey: ["stories-feed"],
    queryFn: async () => {
      const res =
        await axiosGateway.get<FindManyResponse<UserWithStories>>(
          "/api/feed/stories",
        );
      return res.data?.data || [];
    },
  });

  const hasOwnStory = activeStoryUsers.some(
    (u) => u.id === currentUser?.id && u.stories?.length > 0,
  );

  return (
    <div className="w-full py-4">
      <div className="w-full overflow-x-auto no-scrollbar">
        {isLoading ? (
          <div className="flex w-max space-x-4 p-4">
            <div className="flex flex-col items-center space-y-1 shrink-0">
              <Skeleton className="w-16 h-16 rounded-full" />
            </div>
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="flex flex-col items-center space-y-1 shrink-0"
              >
                <Skeleton className="w-16 h-16 rounded-full" />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex w-max items-center space-x-4 p-4">
            {!hasOwnStory && currentUser && (
              <div className="flex flex-col items-center space-y-1 cursor-pointer shrink-0">
                <Dialog>
                  <DialogTrigger asChild>
                    <div className="relative">
                      <Avatar className="w-16 h-16 border bg-background flex items-center justify-center">
                        <AvatarImage
                          src={currentUser.image || "/default-avatar.png"}
                        />
                        <AvatarFallback>
                          {currentUser.name?.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-1 border-2 border-background">
                        <Plus className="w-3 h-3" />
                      </div>
                    </div>
                  </DialogTrigger>
                  <DialogContent className="w-full max-w-none h-dvh max-h-dvh sm:w-[calc(100vw-2rem)] sm:max-w-3xl md:max-w-4xl lg:max-w-5xl sm:h-auto sm:max-h-[85dvh] overflow-y-auto no-scrollbar scroll-smooth flex flex-col border-0 sm:border rounded-none! sm:rounded-xl! p-4 sm:p-6">
                    <DialogHeader>
                      <DialogTitle>{t("createStory")}</DialogTitle>
                    </DialogHeader>
                    <CreateStoryProvider>
                      <CreateStoryStepper />
                    </CreateStoryProvider>
                  </DialogContent>
                </Dialog>
                <span className="text-xs text-muted-foreground w-16 truncate text-center">
                  Your story
                </span>
              </div>
            )}

            {activeStoryUsers
              .filter((u) => hasOwnStory || u.id !== currentUser?.id)
              .map((user, index) => (
                <div
                  key={user.id}
                  className="flex flex-col items-center space-y-1 cursor-pointer shrink-0"
                  onClick={() => {
                    if (user.stories && user.stories.length > 0) {
                      setInitialViewerIndex(index);
                      setViewerOpen(true);
                    }
                  }}
                >
                  <div className="rounded-full p-[3px] bg-tertiary">
                    <Avatar className="w-16 h-16 border-2 border-background">
                      <AvatarImage
                        src={
                          (user.image && `/${user.image}`) ||
                          "/default-avatar.png"
                        }
                      />
                      <AvatarFallback>
                        {user.name?.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <span className="text-xs w-16 truncate text-center">
                    {user.username || user.name}
                  </span>
                </div>
              ))}
          </div>
        )}
      </div>

      {viewerOpen && activeStoryUsers.length > 0 && (
        <StoryViewer
          users={activeStoryUsers.filter(
            (u) => u.stories && u.stories.length > 0,
          )}
          initialUserIndex={
            activeStoryUsers
              .filter((u) => u.stories && u.stories.length > 0)
              .findIndex(
                (u) => u.id === activeStoryUsers[initialViewerIndex]?.id,
              ) > -1
              ? activeStoryUsers
                  .filter((u) => u.stories && u.stories.length > 0)
                  .findIndex(
                    (u) => u.id === activeStoryUsers[initialViewerIndex]?.id,
                  )
              : 0
          }
          onClose={() => setViewerOpen(false)}
        />
      )}
    </div>
  );
}
